import type { Request, Response, NextFunction } from 'express';
import { extractClientIp } from '../utils/ipExtractor';
import { dbRepository } from '../db/repository';
import { getRequestEnv } from '../config/requestEnv';

export interface SecurityConfig {
  allowedOrigins?: string[];
  enableHsts?: boolean;
}

/**
 * Production HTTP Security Headers Middleware
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Control referrer information sent on outgoing navigation/subresources
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Never allow intermediary caches to store authenticated admin API responses.
  if (req.path.startsWith('/api/admin')) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
  }

  // Restrict legacy IE download execution
  res.setHeader('X-Download-Options', 'noopen');

  // Disable DNS prefetching for privacy
  res.setHeader('X-DNS-Prefetch-Control', 'off');

  // Restrict sensitive browser hardware APIs not used by the app
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');

  // Content-Security-Policy designed for modern Vite SPA + Preview iframe compatibility
  const isProduction = getRequestEnv('NODE_ENV') === 'production';
  const cspDirectives = isProduction
    ? [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' data: https://fonts.gstatic.com",
        "img-src 'self' data: blob: https:",
        "connect-src 'self' https: wss:",
        "frame-ancestors 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ]
    : [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
        "style-src 'self' 'unsafe-inline' https: https://fonts.googleapis.com",
        "font-src 'self' data: https: https://fonts.gstatic.com",
        "img-src 'self' data: blob: https:",
        "connect-src 'self' https: http: wss: ws:",
        "frame-ancestors 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ];
  res.setHeader('Content-Security-Policy', cspDirectives.join('; '));

  // HTTP Strict Transport Security (HSTS) in production
  if (getRequestEnv('NODE_ENV') === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
}

/**
 * CORS Middleware with strict isolation for admin and authenticated routes
 */
export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const originHeader = req.headers.origin;
  const origin = typeof originHeader === 'string' ? originHeader.trim() : undefined;
  const isDevelopment = getRequestEnv('NODE_ENV') !== 'production';
  const configuredOrigins = getRequestEnv('CORS_ALLOWED_ORIGINS')
    ? getRequestEnv('CORS_ALLOWED_ORIGINS').split(',').map((o: string) => o.trim()).filter(Boolean)
    : [];

  if (origin) {
    let isAllowed = false;

    if (isDevelopment) {
      // Local/preview development remains permissive; production is allow-list based.
      isAllowed = true;
    } else if (configuredOrigins.length > 0) {
      isAllowed = configuredOrigins.includes(origin);
    } else {
      // Production fallback: permit only an exact same-origin match.
      try {
        const requestHost = req.get('host');
        const requestProto = req.get('x-forwarded-proto')?.split(',')[0]?.trim() || req.protocol;
        isAllowed = Boolean(requestHost && new URL(origin).origin === `${requestProto}://${requestHost}`);
      } catch {
        isAllowed = false;
      }
    }

    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Vary', 'Origin');
    }
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token, x-csrf-token, Accept, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
}

/**
 * In-Memory Sliding Window Rate Limiter
 */
interface RateLimitEntry {
  timestamps: number[];
}

export class RateLimiter {
  private windowMs: number;
  private maxRequests: number;

  public get windowMsValue(): number { return this.windowMs; }
  public get maxRequestsValue(): number { return this.maxRequests; }
  private storage = new Map<string, RateLimitEntry>();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Periodic cleanup of stale IP records every 60s
    this.cleanupTimer = setInterval(() => this.cleanup(), 60000);
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  public check(ip: string): { isLimited: boolean; remaining: number; retryAfterSeconds: number } {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let entry = this.storage.get(ip);
    if (!entry) {
      entry = { timestamps: [] };
    } else {
      // Refresh insertion order so cap eviction behaves like an LRU policy.
      this.storage.delete(ip);
    }
    this.storage.set(ip, entry);

    // Filter out timestamps outside window
    entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

    if (entry.timestamps.length >= this.maxRequests) {
      const oldestInWindow = entry.timestamps[0] || now;
      const retryAfterSeconds = Math.max(1, Math.ceil((oldestInWindow + this.windowMs - now) / 1000));
      return { isLimited: true, remaining: 0, retryAfterSeconds };
    }

    entry.timestamps.push(now);
    const remaining = this.maxRequests - entry.timestamps.length;
    return { isLimited: false, remaining, retryAfterSeconds: 0 };
  }

  public reset(ip?: string): void {
    if (ip) {
      this.storage.delete(ip);
    } else {
      this.storage.clear();
    }
  }

  public destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [ip, entry] of this.storage.entries()) {
      entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);
      if (entry.timestamps.length === 0) {
        this.storage.delete(ip);
      }
    }

    // Cap total storage size without wiping all clients' protection. Cleanup above has already
    // removed stale entries, so evict the least-recently-touched active bucket only as a final
    // memory guard. Existing clients keep their rate-limit history.
    if (this.storage.size > 10_000) {
      const oldestKey = this.storage.keys().next().value as string | undefined;
      if (oldestKey) this.storage.delete(oldestKey);
    }
  }
}

// Pre-configured rate limiters for different endpoint sensitivities
export const publicApiRateLimiter = new RateLimiter(60000, 120); // 120 req / min
export const analyzeBrowserRateLimiter = new RateLimiter(60000, 30); // 30 req / min for heavy fingerprint analysis
export const adminApiRateLimiter = new RateLimiter(60000, 60); // 60 req / min for admin portal

/**
 * Creates express middleware for a specific rate limiter
 */
export function createRateLimitMiddleware(
  limiter: RateLimiter,
  tierName: string
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const nodeEnv = String(getRequestEnv('NODE_ENV') || '');
    if (nodeEnv === 'test' && (req.headers['x-bypass-ratelimit'] === '1' || getRequestEnv('DISABLE_RATE_LIMIT') === 'true')) {
      next();
      return;
    }
    try {
      const clientIp = extractClientIp(req).ip;
      const limiterMax = limiter.maxRequestsValue;
      const result = dbRepository.isPostgresActive()
        ? await dbRepository.consumeApiRateLimitAsync(`api:${tierName}:${clientIp}`, limiter.windowMsValue, limiterMax)
        : limiter.check(clientIp);
      res.setHeader('X-RateLimit-Limit', String(limiterMax));
      res.setHeader('X-RateLimit-Remaining', String(result.remaining));
      if (result.isLimited) {
        res.setHeader('Retry-After', String(result.retryAfterSeconds));
        res.status(429).json({ success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: `Too many requests to ${tierName}. Please retry after ${result.retryAfterSeconds} seconds.`, retryAfterSeconds: result.retryAfterSeconds }, meta: { timestamp: new Date().toISOString(), requestId: req.requestId || 'req_rate_limit', tier: tierName } });
        return;
      }
      next();
    } catch (err) {
      // Never fail-open in production. A limiter outage is treated as service unavailable.
      if (getRequestEnv('NODE_ENV') === 'production') {
        res.status(503).json({ success: false, error: { code: 'RATE_LIMITER_UNAVAILABLE', message: 'Traffic protection is temporarily unavailable. Please retry shortly.' } });
        return;
      }
      const result = limiter.check(extractClientIp(req).ip);
      res.setHeader('X-RateLimit-Limit', String(limiter.maxRequestsValue));
      res.setHeader('X-RateLimit-Remaining', String(result.remaining));
      next();
    }
  };
}
