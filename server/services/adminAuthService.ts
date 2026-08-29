import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { dbRepository } from '../db/repository';
import { getAdminAuthConfig } from '../config';
import { extractClientIp } from '../utils/ipExtractor';

export interface AdminAuthResult {
  success: boolean;
  token?: string;
  username?: string;
  expiresAt?: number;
  error?: string;
  code?: string;
  retryAfterSeconds?: number;
}

export class AdminAuthService {
  /**
   * Lazily ensure environment-configured credentials are initialized in repository.
   */
  public async ensureEnvironmentBootstrap(): Promise<void> {
    if (dbRepository.isPostgresActive()) return;
    try {
      const config = getAdminAuthConfig();
      if (config.adminUsername && config.adminPassword) {
        await dbRepository.bootstrapAdminCredentialsAsync(config.adminUsername, config.adminPassword);
      }
    } catch {
      // Handled gracefully during lazy evaluation
    }
  }

  /**
   * Authenticate admin using username & password OR valid ADMIN_SECRET_KEY
   */
  public async login(
    credentials: { username?: string; password?: string; secretKey?: string },
    req: Request
  ): Promise<AdminAuthResult> {
    await this.ensureEnvironmentBootstrap();
    const clientIp = extractClientIp(req).ip;
    const username = (credentials.username || '').trim();

    // 1. Check both IP and account buckets to resist distributed credential stuffing.
    const rateLimit = await dbRepository.checkLoginRateLimitAsync(clientIp, username || undefined);
    if (rateLimit.isBlocked) {
      void dbRepository.recordSecurityLogAsync({
        eventType: 'RATE_LIMIT_EXCEEDED',
        ipAddress: clientIp,
        details: `Brute-force protection blocked a login attempt; client reference=${dbRepository.anonymizeIp(clientIp)}.`,
      });
      return {
        success: false,
        error: `Too many failed login attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.`,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      };
    }

    // 2. Optional direct ADMIN_SECRET_KEY validation with timing-safe comparison
    let validSecretKey = false;
    try {
      const { adminSecretKey } = getAdminAuthConfig();
      if (adminSecretKey && credentials.secretKey) {
        const submittedKey = credentials.secretKey.trim();
        const configuredKey = adminSecretKey.trim();
        if (submittedKey.length === configuredKey.length && configuredKey.length > 0) {
          const buf1 = Buffer.from(submittedKey, 'utf8');
          const buf2 = Buffer.from(configuredKey, 'utf8');
          if (crypto.timingSafeEqual(buf1, buf2)) {
            validSecretKey = true;
          }
        }
      }
    } catch {
      // ADMIN_SECRET_KEY not set in environment; proceed with DB user authentication
    }

    if (validSecretKey) {
      const { adminUsername } = getAdminAuthConfig();
      const boundUser = adminUsername ? await dbRepository.getAdminUserAsync(adminUsername) : undefined;

      if (!boundUser) {
        return {
          success: false,
          error: 'Master secret authentication is unavailable until an administrator account is configured.',
          code: 'SECRET_KEY_IDENTITY_UNAVAILABLE',
        };
      }

      await dbRepository.resetFailedLoginsAsync(clientIp, username || undefined);
      const session = await dbRepository.createSessionAsync(boundUser.username, boundUser.id, clientIp);

      void dbRepository.recordSecurityLogAsync({
        eventType: 'ADMIN_LOGIN_SUCCESS',
        ipAddress: clientIp,
        details: 'Admin authenticated successfully via Admin Secret Key.',
      });

      void dbRepository.recordAdminAuditAsync({
        adminUsername: boundUser.username,
        action: 'LOGIN',
        ipAddress: clientIp,
        details: 'Session started via Master Secret Key.',
      });

      return {
        success: true,
        token: session.token,
        username: session.username,
        expiresAt: session.expiresAt,
      };
    }

    // 3. Username + Password validation
    const password = credentials.password || '';

    if (!username || !password) {
      return {
        success: false,
        error: 'Username and password are required.',
        code: 'MISSING_CREDENTIALS',
      };
    }

    const user = await dbRepository.getAdminUserAsync(username);
    if (!user) {
      await dbRepository.recordFailedLoginAsync(clientIp, username || undefined);
      void dbRepository.recordSecurityLogAsync({
        eventType: 'ADMIN_LOGIN_FAILED',
        ipAddress: clientIp,
        details: `Failed login attempt for unknown user '${username}'.`,
      });
      void dbRepository.recordAdminAuditAsync({
        adminUsername: username,
        action: 'FAILED_LOGIN',
        ipAddress: clientIp,
        details: `Failed authentication attempt; client reference=${dbRepository.anonymizeIp(clientIp)}.`,
      });
      return {
        success: false,
        error: 'Invalid username or password.',
        code: 'INVALID_CREDENTIALS',
      };
    }

    const isMatch = await dbRepository.verifyPasswordAsync(password, user.passwordHash, user.salt);
    if (!isMatch) {
      await dbRepository.recordFailedLoginAsync(clientIp, username || undefined);
      void dbRepository.recordSecurityLogAsync({
        eventType: 'ADMIN_LOGIN_FAILED',
        ipAddress: clientIp,
        details: `Failed login attempt for user '${username}' (invalid password).`,
      });
      void dbRepository.recordAdminAuditAsync({
        adminUsername: username,
        action: 'FAILED_LOGIN',
        ipAddress: clientIp,
        details: 'Incorrect password submitted.',
      });
      return {
        success: false,
        error: 'Invalid username or password.',
        code: 'INVALID_CREDENTIALS',
      };
    }

    // Reset rate limit on success
    await dbRepository.resetFailedLoginsAsync(clientIp, username || undefined);
    await dbRepository.updateAdminLastLoginAsync(username);

    const session = await dbRepository.createSessionAsync(user.username, user.id, clientIp);

    void dbRepository.recordSecurityLogAsync({
      eventType: 'ADMIN_LOGIN_SUCCESS',
      ipAddress: clientIp,
      details: `Admin user '${username}' authenticated successfully.`,
    });

    void dbRepository.recordAdminAuditAsync({
      adminUsername: username,
      action: 'LOGIN',
      ipAddress: clientIp,
      details: `Session initialized for user '${username}'.`,
    });

    return {
      success: true,
      token: session.token,
      username: session.username,
      expiresAt: session.expiresAt,
    };
  }

  /**
   * Rotate admin user credentials and invalidate all existing active sessions
   */
  public async rotateCredentials(username: string, newPasswordPlain: string): Promise<boolean> {
    return dbRepository.rotateAdminCredentialsAsync(username, newPasswordPlain);
  }

  /**
   * Terminate admin session
   */
  public logout(token: string, req: Request): boolean {
    const clientIp = extractClientIp(req).ip;
    const session = dbRepository.getSession(token);
    if (session) {
      dbRepository.recordAdminAudit({
        adminUsername: session.username,
        action: 'LOGOUT',
        ipAddress: clientIp,
        details: 'Admin session terminated cleanly.',
      });
    }
    return dbRepository.invalidateSession(token);
  }

  public async logoutAsync(token: string, req: Request): Promise<boolean> {
    const clientIp = extractClientIp(req).ip;
    const session = await dbRepository.getSessionAsync(token);
    if (session) {
      await dbRepository.recordAdminAuditAsync({
        adminUsername: session.username,
        action: 'LOGOUT',
        ipAddress: clientIp,
        details: 'Admin session terminated cleanly.',
      });
    }
    return dbRepository.invalidateSessionAsync(token);
  }

  /**
   * Helper to parse cookie header into key-value map
   */
  public parseCookies(req: Request): Record<string, string> {
    const list: Record<string, string> = {};
    const cookieHeader = req.headers?.cookie;
    if (!cookieHeader) return list;

    cookieHeader.split(';').forEach((cookie) => {
      const parts = cookie.split('=');
      const name = parts.shift()?.trim();
      if (name) {
        const val = parts.join('=').trim();
        try {
          list[name] = decodeURIComponent(val);
        } catch {
          list[name] = val;
        }
      }
    });

    return list;
  }

  /**
   * Validate token from HttpOnly Cookie, Authorization header, or x-admin-token
   */
  public validateToken(req: Request) {
    let token: string | undefined;

    // 1. Check HttpOnly Cookie first (Preferred secure browser transport)
    const cookies = this.parseCookies(req);
    if (cookies['privasec_admin_session']) {
      token = cookies['privasec_admin_session'].trim();
    }

    // 2. Check Authorization Bearer header (for API / CLI / programmatic tests)
    if (!token) {
      const authHeader = req.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      }
    }

    // 3. Check x-admin-token header
    if (!token && req.headers['x-admin-token']) {
      token = (req.headers['x-admin-token'] as string).trim();
    }

    if (!token) return null;
    return dbRepository.getSession(token);
  }

  public async validateTokenAsync(req: Request) {
    let token: string | undefined;
    const cookies = this.parseCookies(req);
    if (cookies['privasec_admin_session']) token = cookies['privasec_admin_session'].trim();
    if (!token) {
      const authHeader = req.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) token = authHeader.substring(7).trim();
    }
    if (!token && req.headers['x-admin-token']) token = (req.headers['x-admin-token'] as string).trim();
    if (!token) return null;
    return dbRepository.getSessionAsync(token);
  }
}

export const adminAuthService = new AdminAuthService();

/**
 * Server-side authorization middleware
 */
export async function adminAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
  const session = await adminAuthService.validateTokenAsync(req);

  if (!session) {
    const clientIp = extractClientIp(req).ip;
    void dbRepository.recordSecurityLogAsync({
      eventType: 'UNAUTHORIZED_ACCESS',
      ipAddress: clientIp,
      details: `Rejected unauthenticated request to protected endpoint: ${req.method} ${req.path}`,
    });

    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Administrator authentication required. Please log in to access this resource.',
      },
    });
    return;
  }

  (req as any).adminSession = session;
  next();
  } catch (err) {
    next(err);
  }
}

