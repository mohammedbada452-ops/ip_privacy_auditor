import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { adminAuthService, adminAuthMiddleware } from '../services/adminAuthService';
import { dbRepository } from '../db/repository';
import { extractClientIp } from '../utils/ipExtractor';
import crypto from 'crypto';
import { hasPermission, type AdminPermission } from '../auth/rbac';
import { getRequestEnv } from '../config/requestEnv';

export const adminRouter = Router();

const MAX_ADMIN_PAGE = 100_000;
const MAX_ADMIN_LIMIT = 100;
const MAX_ADMIN_SEARCH_LENGTH = 200;

function boundedPositiveInt(value: string | string[] | undefined, fallback: number, max: number): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw || '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(1, parsed));
}

function boundedSearch(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const normalized = raw?.trim();
  if (!normalized) return undefined;
  return normalized.slice(0, MAX_ADMIN_SEARCH_LENGTH);
}

// Administrative responses contain sensitive operational data and must never be cached.
adminRouter.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  next();
});

const asyncHandler = (handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => { void handler(req, res, next).catch(next); };

/** Issue a non-HttpOnly CSRF token for double-submit protection. */
adminRouter.get('/admin/csrf', (_req: Request, res: Response) => {
  const token = crypto.randomBytes(32).toString('hex');
  const isProduction = getRequestEnv('NODE_ENV') === 'production';
  res.cookie('privasec_admin_csrf', token, { httpOnly: false, secure: isProduction, sameSite: 'strict', path: '/api/admin', maxAge: 2 * 60 * 60 * 1000 });
  res.json({ success: true, data: { csrfToken: token }, meta: { timestamp: new Date().toISOString() } });
});

/**
 * CSRF Guard for state-changing administrative routes
 */
export function adminCsrfGuard(req: Request, res: Response, next: NextFunction) {
  const method = req.method.toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return next();
  }

  // Login is credential bootstrap and does not rely on an existing session.
  if (req.path.endsWith('/login')) return next();

  const cookies = adminAuthService.parseCookies(req);
  const cookieToken = cookies['privasec_admin_csrf'] || '';
  const headerToken = typeof req.headers['x-csrf-token'] === 'string' ? req.headers['x-csrf-token'] : '';
  const sameLength = cookieToken.length > 0 && cookieToken.length === headerToken.length;
  const validToken = sameLength && crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken));
  if (!validToken) {
    const clientIp = extractClientIp(req).ip;
    void dbRepository.recordSecurityLogAsync({ eventType: 'SUSPICIOUS_PROBE', ipAddress: clientIp, details: 'Blocked administrative state-changing request without a valid CSRF token.' });
    res.status(403).json({ success: false, error: { code: 'CSRF_TOKEN_REQUIRED', message: 'A valid CSRF token is required for this administrative action.' } });
    return;
  }

  // 1. Check Fetch Metadata: Sec-Fetch-Site (modern browsers)
  const secFetchSite = req.headers['sec-fetch-site'];
  if (secFetchSite === 'cross-site') {
    const clientIp = extractClientIp(req).ip;
    void dbRepository.recordSecurityLogAsync({
      eventType: 'SUSPICIOUS_PROBE',
      ipAddress: clientIp,
      details: `Blocked cross-site CSRF attempt on ${req.method} ${req.path} (Sec-Fetch-Site: cross-site).`,
    });
    res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_BLOCKED',
        message: 'Cross-site requests to administrative endpoints are forbidden.',
      },
    });
    return;
  }

  // 2. Validate Origin / Referer if present
  const origin = req.headers['origin'];
  const host = req.headers['host'];
  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      const isDevelopment = getRequestEnv('NODE_ENV') !== 'production';
      const allowedDevelopmentOrigin = isDevelopment && (originHost === 'localhost:3000' || originHost === '127.0.0.1:3000');
      if (originHost !== host && !allowedDevelopmentOrigin) {
        const clientIp = extractClientIp(req).ip;
        void dbRepository.recordSecurityLogAsync({
          eventType: 'SUSPICIOUS_PROBE',
          ipAddress: clientIp,
          details: `Blocked untrusted origin CSRF attempt on ${req.method} ${req.path}.`,
        });
        res.status(403).json({
          success: false,
          error: {
            code: 'CSRF_BLOCKED',
            message: 'Cross-origin administrative request blocked.',
          },
        });
        return;
      }
    } catch {
      const clientIp = extractClientIp(req).ip;
      void dbRepository.recordSecurityLogAsync({
        eventType: 'SUSPICIOUS_PROBE',
        ipAddress: clientIp,
        details: `Blocked malformed Origin CSRF attempt on ${req.method} ${req.path}.`,
      });
      res.status(403).json({ success: false, error: { code: 'CSRF_BLOCKED', message: 'Malformed request origin blocked.' } });
      return;
    }
  }

  next();
}

/**
 * Apply CSRF Guard to all admin routes
 */
adminRouter.use(adminCsrfGuard);


function requirePermission(permission: AdminPermission) {
  return (req: Request, res: Response, next: NextFunction) => {
    const session = (req as any).adminSession;
    if (!session || !hasPermission(session.role, permission)) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Your administrator role is not permitted to access this resource.' } });
      return;
    }
    next();
  };
}

/**
 * POST /api/admin/login & /api/admin/auth/login
 * Authenticates admin credentials and establishes an HttpOnly session cookie
 */
const handleLogin = async (req: Request, res: Response) => {
  const { username, password, secretKey } = req.body || {};
  const result = await adminAuthService.login({ username, password, secretKey }, req);

  if (!result.success) {
    const statusCode = result.code === 'RATE_LIMIT_EXCEEDED' ? 429 : 401;
    res.status(statusCode).json({
      success: false,
      error: {
        code: result.code || 'AUTHENTICATION_FAILED',
        message: result.error || 'Authentication failed',
        retryAfterSeconds: result.retryAfterSeconds,
      },
    });
    return;
  }

  const isProduction = getRequestEnv('NODE_ENV') === 'production';
  if (result.token) {
    res.cookie('privasec_admin_session', result.token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000,
    });
  }

  res.status(200).json({
    success: true,
    data: {
      username: result.username,
      expiresAt: result.expiresAt,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
};

adminRouter.post('/admin/login', asyncHandler(handleLogin));
adminRouter.post('/admin/auth/login', asyncHandler(handleLogin));

/**
 * POST /api/admin/logout & /api/admin/auth/logout
 * Invalidate admin session and clear HttpOnly cookie
 */
const handleLogout = async (req: Request, res: Response) => {
  let token: string | undefined;

  // 1. Check cookie
  const cookies = adminAuthService.parseCookies(req);
  if (cookies['privasec_admin_session']) {
    token = cookies['privasec_admin_session'].trim();
  }

  // 2. Check header
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.headers['x-admin-token']) {
    token = (req.headers['x-admin-token'] as string).trim();
  }

  if (token) {
    await adminAuthService.logoutAsync(token, req);
  }

  const isProduction = getRequestEnv('NODE_ENV') === 'production';
  res.clearCookie('privasec_admin_session', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
  });

  res.status(200).json({
    success: true,
    data: {
      message: 'Logged out successfully',
    },
  });
};

adminRouter.post('/admin/logout', asyncHandler(handleLogout));
adminRouter.post('/admin/auth/logout', asyncHandler(handleLogout));

/**
 * GET /api/admin/session & /api/admin/auth/session
 * Check current admin session
 */
const handleSession = (req: Request, res: Response) => {
  const session = (req as any).adminSession;
  res.status(200).json({
    success: true,
    data: {
      authenticated: true,
      username: session.username,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      role: session.role,
    },
  });
};

adminRouter.get('/admin/session', adminAuthMiddleware, handleSession);
adminRouter.get('/admin/auth/session', adminAuthMiddleware, handleSession);

/**
 * GET /api/admin/stats & /api/admin/metrics/overview
 * Fetch aggregate KPI metrics
 */
const handleStats = async (req: Request, res: Response) => {
  const clientIp = extractClientIp(req).ip;
  const session = (req as any).adminSession;

  void dbRepository.recordAdminAuditAsync({
    adminUsername: session.username,
    action: 'VIEW_STATS',
    ipAddress: clientIp,
    details: 'Fetched aggregate KPI overview.',
  });

  const stats = await dbRepository.getSystemAnalyticsSummaryAsync();
  res.status(200).json({
    success: true,
    data: stats,
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
};

adminRouter.get('/admin/stats', adminAuthMiddleware, requirePermission('stats:read'), asyncHandler(handleStats));
adminRouter.get('/admin/metrics/overview', adminAuthMiddleware, requirePermission('stats:read'), asyncHandler(handleStats));

/**
 * GET /api/admin/scans
 * List paginated scan sessions (strictly privacy-safe and anonymized)
 */
adminRouter.get('/admin/scans', adminAuthMiddleware, requirePermission('scans:read'), asyncHandler(async (req: Request, res: Response) => {
  const page = boundedPositiveInt(req.query.page as string | string[] | undefined, 1, MAX_ADMIN_PAGE);
  const requestedLimit = parseInt(req.query.limit as string, 10);
  const limit = Number.isFinite(requestedLimit) ? Math.min(MAX_ADMIN_LIMIT, Math.max(1, requestedLimit)) : 10;
  const country = (req.query.country as string) || undefined;
  const tier = (req.query.tier as string) || undefined;
  const search = boundedSearch(req.query.search as string | string[] | undefined);
  const isVpn = req.query.isVpn !== undefined ? req.query.isVpn === 'true' : undefined;
  const sortBy = (req.query.sortBy as any) || 'createdAt';
  const sortOrder = (req.query.sortOrder as any) || 'desc';

  const result = await dbRepository.getScanSessionsPaginatedAsync({
    page,
    limit,
    country,
    tier,
    search,
    isVpn,
    sortBy,
    sortOrder,
  });

  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
}));

/**
 * GET /api/admin/logs
 * Fetch security & audit event logs
 */
adminRouter.get('/admin/logs', adminAuthMiddleware, requirePermission('logs:read'), asyncHandler(async (req: Request, res: Response) => {
  const page = boundedPositiveInt(req.query.page as string | string[] | undefined, 1, MAX_ADMIN_PAGE);
  const requestedLimit = parseInt(req.query.limit as string, 10);
  const limit = Number.isFinite(requestedLimit) ? Math.min(MAX_ADMIN_LIMIT, Math.max(1, requestedLimit)) : 10;
  const eventType = (req.query.eventType as string) || undefined;
  const search = boundedSearch(req.query.search as string | string[] | undefined);

  const result = await dbRepository.getSecurityLogsPaginatedAsync({
    page,
    limit,
    eventType,
    search,
  });

  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
}));

/**
 * GET /api/admin/metrics/pageviews & /api/admin/traffic
 * Page view statistics and route breakdown
 */
const handlePageviews = async (_req: Request, res: Response) => {
  const metrics = await dbRepository.getPageViewMetricsAsync();
  res.status(200).json({
    success: true,
    data: metrics,
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
};
adminRouter.get('/admin/metrics/pageviews', adminAuthMiddleware, requirePermission('metrics:read'), asyncHandler(handlePageviews));
adminRouter.get('/admin/traffic', adminAuthMiddleware, requirePermission('metrics:read'), asyncHandler(handlePageviews));

/**
 * GET /api/admin/metrics/events & /api/admin/events
 * Product event distributions
 */
const handleEvents = async (_req: Request, res: Response) => {
  const stats = await dbRepository.getSystemAnalyticsSummaryAsync();
  res.status(200).json({
    success: true,
    data: {
      totalAudits: stats.totalScans,
      vpnDetections: stats.vpnDetections ?? 0,
      webRtcLeaks: stats.webRtcConfirmedLeaks ?? 0,
      scoreTiers: (stats as any).tierCounts || {},
      topCountries: stats.topCountries,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
};
adminRouter.get('/admin/metrics/events', adminAuthMiddleware, requirePermission('stats:read'), asyncHandler(handleEvents));
adminRouter.get('/admin/events', adminAuthMiddleware, requirePermission('stats:read'), asyncHandler(handleEvents));

/**
 * GET /api/admin/metrics/performance & /api/admin/performance
 * Server performance and API response metrics
 */
const handlePerformance = async (_req: Request, res: Response) => {
  const perf = await dbRepository.getPerformanceMetricsSummaryAsync();
  res.status(200).json({
    success: true,
    data: perf,
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
};
adminRouter.get('/admin/metrics/performance', adminAuthMiddleware, requirePermission('metrics:read'), asyncHandler(handlePerformance));
adminRouter.get('/admin/performance', adminAuthMiddleware, requirePermission('metrics:read'), asyncHandler(handlePerformance));

/**
 * GET /api/admin/audit
 * Admin console operational audit trail
 */
adminRouter.get('/admin/audit', adminAuthMiddleware, requirePermission('audit:read'), asyncHandler(async (req: Request, res: Response) => {
  const page = boundedPositiveInt(req.query.page as string | string[] | undefined, 1, MAX_ADMIN_PAGE);
  const requestedLimit = parseInt(req.query.limit as string, 10);
  const limit = Number.isFinite(requestedLimit) ? Math.min(MAX_ADMIN_LIMIT, Math.max(1, requestedLimit)) : 10;
  const search = boundedSearch(req.query.search as string | string[] | undefined);

  const result = await dbRepository.getAdminAuditLogsPaginatedAsync({
    page,
    limit,
    search,
  });

  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
}));
