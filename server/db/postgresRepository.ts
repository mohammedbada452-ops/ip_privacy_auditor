import crypto from 'crypto';
import type pg from 'pg';
import pgRuntime from 'pg';
import { getPool, withTransaction, withClientTransaction, hashSessionToken } from './postgres';
import type {
  AdminUser,
  ScanSessionRecord,
  SecurityLogRecord,
  SystemAnalyticsSummary,
} from './types';
import type {
  PageViewRecord,
  AdminAuditRecord,
  PerformanceMetricRecord,
  AdminSession,
} from './repository';
import { validateAdminUsername, validateAdminPassword } from '../config';
import { getRequestEnv } from '../config/requestEnv';

// Runtime (non-type-only) binding used solely for `instanceof` checks below, since the
// `pg` import above is type-only and cannot be used as a value.
const { Pool: PgPool } = pgRuntime;

/**
 * This repository is constructed with either:
 *  - a `pg.Pool` (the long-running Node/Express dev server in server.ts, where a persistent
 *    pool across many requests within one process is correct and always was), or
 *  - a single already-connected `pg.Client` scoped to exactly one Cloudflare Worker request
 *    (see `worker/index.ts`), per Cloudflare Hyperdrive's documented guidance that Worker
 *    requests must not share I/O objects (sockets, pool connections) across requests.
 *
 * Every query method below calls `this.connection.query(...)`, which both `pg.Pool` and
 * `pg.Client` implement identically, so no other method needed to change. Only multi-statement
 * transactions need to know which kind of connection they're running against - `runTransaction`
 * below routes to the pool-checkout variant or the single-client variant accordingly.
 */
export class PostgresRepository {
  public async checkHealth(): Promise<boolean> {
    try {
      const result = await this.connection.query('SELECT 1 AS ok');
      return result.rows[0]?.ok === 1;
    } catch {
      return false;
    }
  }
  private connection: pg.Pool | pg.Client;
  private serverSalt: string;
  private loginAttempts: Map<string, { count: number; firstAttemptAt: number; blockedUntil?: number }> = new Map();

  constructor(connection: pg.Pool | pg.Client) {
    this.connection = connection;
    this.serverSalt = getRequestEnv('SERVER_SECRET_SALT') || (getRequestEnv('NODE_ENV') === 'production' ? '' : crypto.randomBytes(32).toString('hex'));
  }

  /**
   * Routes a transactional callback to the correct helper depending on whether this repository
   * instance holds a `pg.Pool` (checks out + releases a client) or a single request-scoped
   * `pg.Client` (runs directly on that same connection, per Cloudflare's request-isolation rules).
   */
  private runTransaction<T>(callback: (client: pg.PoolClient | pg.Client) => Promise<T>): Promise<T> {
    if (this.connection instanceof PgPool) {
      return withTransaction(callback, this.connection);
    }
    return withClientTransaction(callback as (client: pg.Client) => Promise<T>, this.connection);
  }

  /**
   * One-way salted HMAC-SHA256 for IP address pseudonymization.
   * Strictly prevents storing raw IP addresses in scan tables.
   */
  public anonymizeIp(ip: string): string {
    if (!this.serverSalt) {
      throw new Error('SERVER_SECRET_SALT is required in production for IP pseudonymization.');
    }
    return crypto.createHmac('sha256', this.serverSalt).update(ip.trim()).digest('hex');
  }

  /**
   * PBKDF2-HMAC-SHA256 password hashing with 600,000 iterations.
   */
  public hashPassword(password: string, salt?: string): { hash: string; salt: string } {
    const userSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, userSalt, 600000, 32, 'sha256').toString('hex');
    return { hash, salt: userSalt };
  }

  /**
   * Constant-time equality check to prevent timing attacks.
   */
  public verifyPassword(password: string, storedHash: string, salt: string): boolean {
    const computedHash = crypto.pbkdf2Sync(password, salt, 600000, 32, 'sha256').toString('hex');
    const hashBuffer = Buffer.from(storedHash, 'hex');
    const computedBuffer = Buffer.from(computedHash, 'hex');
    if (hashBuffer.length !== computedBuffer.length) return false;
    return crypto.timingSafeEqual(hashBuffer, computedBuffer);
  }

  public async verifyPasswordAsync(password: string, storedHash: string, salt: string): Promise<boolean> {
    const computedHash = await new Promise<Buffer>((resolve, reject) => {
      crypto.pbkdf2(password, salt, 600000, 32, 'sha256', (err, derivedKey) => {
        if (err) reject(err); else resolve(derivedKey);
      });
    });
    const hashBuffer = Buffer.from(storedHash, 'hex');
    if (hashBuffer.length !== computedHash.length) return false;
    return crypto.timingSafeEqual(hashBuffer, computedHash);
  }

  // --- ADMIN USERS ---

  public async getAdminUser(username: string): Promise<(AdminUser & { salt: string; passwordHash: string }) | null> {
    const query = `
      SELECT 
        id, 
        username, 
        password_hash AS "passwordHash", 
        password_salt AS salt, 
        role, 
        status, 
        created_at AS "createdAt", 
        last_login_at AS "lastLogin"
      FROM admin_users
      WHERE username = $1 AND status = 'active'
      LIMIT 1
    `;
    const res = await this.connection.query(query, [username]);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      username: row.username,
      passwordHash: row.passwordHash,
      salt: row.salt,
      createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
      lastLogin: row.lastLogin ? new Date(row.lastLogin).toISOString() : undefined,
      role: String(row.role || 'viewer').toUpperCase() as AdminUser['role'],
      status: String(row.status || 'disabled').toUpperCase() as AdminUser['status'],
    };
  }

  public async getAllAdminUsernames(): Promise<string[]> {
    const query = 'SELECT username FROM admin_users ORDER BY username ASC';
    const res = await this.connection.query(query);
    return res.rows.map((r) => r.username);
  }

  /**
   * Bootstraps or updates administrator credentials in PostgreSQL inside a transaction.
   */
  public async bootstrapAdminCredentials(
    username: string,
    passwordPlain: string,
    options?: { force?: boolean }
  ): Promise<{ success: boolean; username: string; isNewUser: boolean }> {
    const isProduction = process.env.NODE_ENV === 'production';
    const userVal = validateAdminUsername(username);
    if (!userVal.valid) {
      throw new Error(`Failed to bootstrap admin: ${userVal.error}`);
    }
    const passVal = validateAdminPassword(passwordPlain, isProduction);
    if (!passVal.valid) {
      throw new Error(`Failed to bootstrap admin: ${passVal.error}`);
    }

    return await this.runTransaction(async (client) => {
      const checkRes = await client.query(
        'SELECT id, username, password_hash, password_salt FROM admin_users WHERE username = $1 LIMIT 1',
        [username]
      );
      const existing = checkRes.rows[0];
      const isNewUser = !existing;
      const { hash, salt } = this.hashPassword(passwordPlain);

      if (existing) {
        const isSame = this.verifyPassword(passwordPlain, existing.password_hash, existing.password_salt);
        if (!isSame || options?.force) {
          await client.query(
            'UPDATE admin_users SET password_hash = $1, password_salt = $2, updated_at = NOW() WHERE username = $3',
            [hash, salt, username]
          );

          // Invalidate active sessions
          await client.query(
            'UPDATE admin_sessions SET revoked_at = NOW() WHERE username = $1 AND revoked_at IS NULL',
            [username]
          );

          await client.query(
            `INSERT INTO security_logs (id, event_type, ip_address, details, created_at)
             VALUES ($1, 'ADMIN_CREDENTIALS_ROTATED', $3, $2, NOW())`,
            [`sec_${crypto.randomUUID()}`, `Admin credentials rotated for user '${username}'. All active sessions invalidated.`, this.anonymizeIp('127.0.0.1')]
          );

          await client.query(
            `INSERT INTO admin_audit_logs (id, admin_username, action, ip_address, details, created_at)
             VALUES ($1, $2, 'ROTATE_CREDENTIALS', $3, 'Credentials updated from environment/bootstrap.', NOW())`,
            [`aud_${crypto.randomUUID()}`, username, this.anonymizeIp('127.0.0.1')]
          );
        }
      } else {
        const userId = `usr_admin_${Date.now()}`;
        await client.query(
          `INSERT INTO admin_users (id, username, password_hash, password_salt, role, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 'admin', 'active', NOW(), NOW())`,
          [userId, username, hash, salt]
        );

        await client.query(
          `INSERT INTO security_logs (id, event_type, ip_address, details, created_at)
           VALUES ($1, 'ADMIN_USER_CREATED', $3, $2, NOW())`,
          [`sec_${crypto.randomUUID()}`, `Admin user '${username}' initialized via secure bootstrap hash.`, this.anonymizeIp('127.0.0.1')]
        );

        await client.query(
          `INSERT INTO admin_audit_logs (id, admin_username, action, ip_address, details, created_at)
           VALUES ($1, $2, 'BOOTSTRAP_ADMIN', $3, 'Admin identity initialized via secure environment bootstrap.', NOW())`,
          [`aud_${crypto.randomUUID()}`, username, this.anonymizeIp('127.0.0.1')]
        );
      }

      // If a non-default custom username is provided, remove legacy 'admin' if present
      if (username !== 'admin') {
        await client.query('DELETE FROM admin_users WHERE username = $1', ['admin']);
      }

      return { success: true, username, isNewUser };
    });
  }

  /**
   * Rotates credentials transactionally in PostgreSQL.
   */
  public async rotateAdminCredentials(username: string, newPasswordPlain: string): Promise<boolean> {
    const isProduction = process.env.NODE_ENV === 'production';
    const passVal = validateAdminPassword(newPasswordPlain, isProduction);
    if (!passVal.valid) {
      throw new Error(`Failed to rotate admin credentials: ${passVal.error}`);
    }

    return await this.runTransaction(async (client) => {
      const userRes = await client.query('SELECT id FROM admin_users WHERE username = $1 LIMIT 1', [username]);
      if (userRes.rows.length === 0) {
        throw new Error(`Cannot rotate credentials: User '${username}' does not exist.`);
      }

      const { hash, salt } = this.hashPassword(newPasswordPlain);

      await client.query(
        'UPDATE admin_users SET password_hash = $1, password_salt = $2, updated_at = NOW() WHERE username = $3',
        [hash, salt, username]
      );

      // Invalidate active sessions
      await client.query(
        'UPDATE admin_sessions SET revoked_at = NOW() WHERE username = $1 AND revoked_at IS NULL',
        [username]
      );

      await client.query(
        `INSERT INTO security_logs (id, event_type, ip_address, details, created_at)
         VALUES ($1, 'ADMIN_CREDENTIALS_ROTATED', $3, $2, NOW())`,
        [`sec_${crypto.randomUUID()}`, `Admin credentials rotated for user '${username}'.`, this.anonymizeIp('127.0.0.1')]
      );

      await client.query(
        `INSERT INTO admin_audit_logs (id, admin_username, action, ip_address, details, created_at)
         VALUES ($1, $2, 'ROTATE_CREDENTIALS', $3, 'Password hash rotated. Active sessions revoked.', NOW())`,
        [`aud_${crypto.randomUUID()}`, username, this.anonymizeIp('127.0.0.1')]
      );

      return true;
    });
  }

  public async updateAdminLastLogin(username: string): Promise<void> {
    await this.connection.query('UPDATE admin_users SET last_login_at = NOW() WHERE username = $1', [username]);
  }

  // --- SESSIONS ---

  public async createSession(username: string, userId: string, ipAddress: string): Promise<AdminSession> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashSessionToken(rawToken);
    const id = `sess_${crypto.randomUUID()}`;
    const now = Date.now();
    const expiresAt = now + 24 * 60 * 60 * 1000;

    const query = `
      INSERT INTO admin_sessions (
        id, token_hash, user_id, username, ip_address, created_at, expires_at, last_active_at
      ) VALUES (
        $1, $2, $3, $4, $5, TO_TIMESTAMP($6 / 1000.0), TO_TIMESTAMP($7 / 1000.0), TO_TIMESTAMP($8 / 1000.0)
      )
    `;

    await this.connection.query(query, [
      id,
      tokenHash,
      userId,
      username,
      this.anonymizeIp(ipAddress),
      now,
      expiresAt,
      now,
    ]);

    return {
      token: rawToken,
      username,
      userId,
      createdAt: now,
      expiresAt,
      lastActiveAt: now,
      ipAddress,
      role: (await this.getAdminUser(username))?.role || 'VIEWER',
    };
  }

  public async getSession(rawToken: string): Promise<AdminSession | null> {
    if (!rawToken) return null;
    const tokenHash = hashSessionToken(rawToken);

    const query = `
      SELECT 
        s.id, 
        s.token_hash, 
        s.user_id AS "userId", 
        s.username, 
        au.role AS role,
        s.ip_address AS "ipAddress", 
        EXTRACT(EPOCH FROM s.created_at) * 1000 AS "createdAt", 
        EXTRACT(EPOCH FROM s.expires_at) * 1000 AS "expiresAt", 
        EXTRACT(EPOCH FROM s.last_active_at) * 1000 AS "lastActiveAt",
        s.revoked_at AS "revokedAt"
      FROM admin_sessions s
      JOIN admin_users au ON au.id = s.user_id
      WHERE s.token_hash = $1 AND au.status = 'active'
      LIMIT 1
    `;

    const res = await this.connection.query(query, [tokenHash]);
    if (res.rows.length === 0) return null;

    const row = res.rows[0];
    const now = Date.now();
    const expiresAt = Number(row.expiresAt);

    if (row.revokedAt || now > expiresAt) {
      return null;
    }

    // Update last_active_at
    await this.connection.query(
      'UPDATE admin_sessions SET last_active_at = NOW() WHERE token_hash = $1',
      [tokenHash]
    );

    return {
      token: rawToken,
      username: row.username,
      userId: row.userId,
      role: String(row.role || 'viewer').toUpperCase() as AdminSession['role'],
      createdAt: Math.round(Number(row.createdAt)),
      expiresAt: Math.round(expiresAt),
      lastActiveAt: now,
      ipAddress: row.ipAddress,
    };
  }

  public async invalidateSession(rawToken: string): Promise<boolean> {
    if (!rawToken) return false;
    const tokenHash = hashSessionToken(rawToken);
    const res = await this.connection.query(
      'UPDATE admin_sessions SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL',
      [tokenHash]
    );
    return (res.rowCount ?? 0) > 0;
  }

  public async invalidateAllSessions(username?: string): Promise<number> {
    if (username) {
      const res = await this.connection.query(
        'UPDATE admin_sessions SET revoked_at = NOW() WHERE username = $1 AND revoked_at IS NULL',
        [username]
      );
      return res.rowCount ?? 0;
    } else {
      const res = await this.connection.query(
        'UPDATE admin_sessions SET revoked_at = NOW() WHERE revoked_at IS NULL'
      );
      return res.rowCount ?? 0;
    }
  }

  // --- DISTRIBUTED API RATE LIMITING ---

  public async consumeApiRateLimit(bucketKey: string, windowMs: number, maxRequests: number): Promise<{ isLimited: boolean; remaining: number; retryAfterSeconds: number }> {
    const now = Date.now();
    return this.runTransaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [bucketKey]);
      const rowRes = await client.query('SELECT window_started_at, request_count FROM api_rate_limits WHERE bucket_key = $1 FOR UPDATE', [bucketKey]);
      let windowStartedAt = now;
      let requestCount = 0;
      if (rowRes.rows[0]) {
        windowStartedAt = new Date(rowRes.rows[0].window_started_at).getTime();
        requestCount = Number(rowRes.rows[0].request_count || 0);
        if (now - windowStartedAt >= windowMs) {
          windowStartedAt = now;
          requestCount = 0;
        }
      }
      if (requestCount >= maxRequests) {
        const retryAfterSeconds = Math.max(1, Math.ceil((windowStartedAt + windowMs - now) / 1000));
        return { isLimited: true, remaining: 0, retryAfterSeconds };
      }
      requestCount += 1;
      const expiresAt = new Date(windowStartedAt + windowMs);
      await client.query(
        `INSERT INTO api_rate_limits (bucket_key, window_started_at, request_count, expires_at)
         VALUES ($1, TO_TIMESTAMP($2 / 1000.0), $3, $4)
         ON CONFLICT (bucket_key) DO UPDATE SET window_started_at = EXCLUDED.window_started_at, request_count = EXCLUDED.request_count, expires_at = EXCLUDED.expires_at`,
        [bucketKey, windowStartedAt, requestCount, expiresAt]
      );
      return { isLimited: false, remaining: Math.max(0, maxRequests - requestCount), retryAfterSeconds: 0 };
    });
  }

  // --- BRUTE FORCE RATE LIMITING ---

  /** PostgreSQL-backed brute-force limiter. Checks both IP and (when available) account buckets. */
  public async checkLoginRateLimitAsync(ip: string, username?: string): Promise<{ isBlocked: boolean; retryAfterSeconds?: number }> {
    const now = Date.now();
    const ipHash = this.anonymizeIp(ip);
    const bucketKeys = [ipHash, ...(username ? [`acct_${this.anonymizeIp(username.toLowerCase())}`] : [])];
    for (const key of bucketKeys) {
      const table = key.startsWith('acct_') ? 'auth_rate_limit_buckets' : 'auth_rate_limits';
      const column = key.startsWith('acct_') ? 'bucket_key' : 'ip_hash';
      const res = await this.connection.query(`SELECT blocked_until, first_attempt_at FROM ${table} WHERE ${column} = $1 LIMIT 1`, [key]);
      const row = res.rows[0];
      if (!row) continue;
      const firstAttemptAt = new Date(row.first_attempt_at).getTime();
      if (now - firstAttemptAt > 15 * 60 * 1000) {
        await this.connection.query(`DELETE FROM ${table} WHERE ${column} = $1`, [key]);
        continue;
      }
      if (row.blocked_until) {
        const blockedUntil = new Date(row.blocked_until).getTime();
        if (blockedUntil > now) return { isBlocked: true, retryAfterSeconds: Math.max(1, Math.ceil((blockedUntil - now) / 1000)) };
      }
    }
    return { isBlocked: false };
  }

  public async recordFailedLoginAsync(ip: string, username?: string): Promise<void> {
    const buckets = [
      { key: this.anonymizeIp(ip), table: 'auth_rate_limits', column: 'ip_hash' },
      ...(username ? [{ key: `acct_${this.anonymizeIp(username.toLowerCase())}`, table: 'auth_rate_limit_buckets', column: 'bucket_key' }] : []),
    ];
    for (const bucket of buckets) {
      await this.runTransaction(async (client) => {
        await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [bucket.key]);
        const existing = await client.query(`SELECT failure_count, first_attempt_at FROM ${bucket.table} WHERE ${bucket.column} = $1 FOR UPDATE`, [bucket.key]);
        const now = Date.now();
        if (!existing.rows.length) {
          await client.query(`INSERT INTO ${bucket.table} (${bucket.column}, failure_count, first_attempt_at, blocked_until) VALUES ($1, 1, NOW(), NULL)`, [bucket.key]);
          return;
        }
        const firstAttemptAt = new Date(existing.rows[0].first_attempt_at).getTime();
        if (now - firstAttemptAt > 15 * 60 * 1000) {
          await client.query(`UPDATE ${bucket.table} SET failure_count = 1, first_attempt_at = NOW(), blocked_until = NULL WHERE ${bucket.column} = $1`, [bucket.key]);
          return;
        }
        const nextCount = Number(existing.rows[0].failure_count || 0) + 1;
        const blockedUntil = nextCount >= 5 ? new Date(now + 15 * 60 * 1000) : null;
        await client.query(`UPDATE ${bucket.table} SET failure_count = $2, blocked_until = $3 WHERE ${bucket.column} = $1`, [bucket.key, nextCount, blockedUntil]);
      });
    }
  }

  public async resetFailedLoginsAsync(ip: string, username?: string): Promise<void> {
    await this.connection.query('DELETE FROM auth_rate_limits WHERE ip_hash = $1', [this.anonymizeIp(ip)]);
    if (username) await this.connection.query('DELETE FROM auth_rate_limit_buckets WHERE bucket_key = $1', [`acct_${this.anonymizeIp(username.toLowerCase())}`]);
  }

  // Synchronous compatibility methods for legacy unit tests running without PostgreSQL.
  public checkLoginRateLimit(ip: string): { isBlocked: boolean; retryAfterSeconds?: number } {
    const record = this.loginAttempts.get(ip);
    const now = Date.now();
    if (!record) return { isBlocked: false };
    if (record.blockedUntil && record.blockedUntil > now) {
      return { isBlocked: true, retryAfterSeconds: Math.max(1, Math.ceil((record.blockedUntil - now) / 1000)) };
    }
    if (now - record.firstAttemptAt > 15 * 60 * 1000) this.loginAttempts.delete(ip);
    return { isBlocked: false };
  }

  public recordFailedLogin(ip: string): void {
    const now = Date.now();
    const record = this.loginAttempts.get(ip) || { count: 0, firstAttemptAt: now };
    if (now - record.firstAttemptAt > 15 * 60 * 1000) {
      record.count = 0;
      record.firstAttemptAt = now;
      delete record.blockedUntil;
    }
    record.count += 1;
    if (record.count >= 5) record.blockedUntil = now + 15 * 60 * 1000;
    this.loginAttempts.set(ip, record);
  }

  public resetFailedLogins(ip: string): void {
    this.loginAttempts.delete(ip);
  }

  public async getPopulationInsight(privacyScore: number, windowDays = 30): Promise<{ sampleSize: number; scorePercentile: number | null; averageScore: number | null; status: 'READY' | 'INSUFFICIENT_SAMPLE'; comparisonWindowDays: number }> {
    const boundedScore = Math.max(0, Math.min(100, Math.round(privacyScore)));
    const boundedDays = Math.min(90, Math.max(1, Math.round(windowDays)));
    const res = await this.connection.query(`
      SELECT COUNT(*)::INTEGER AS sample_size,
             COALESCE(ROUND(AVG(privacy_score)::numeric, 1), 0)::FLOAT AS avg_score,
             COUNT(*) FILTER (WHERE privacy_score <= $1)::INTEGER AS at_or_below
      FROM scan_sessions
      WHERE verification_status = 'COMPLETE'
        AND verification_coverage_pct >= 80
        AND created_at >= NOW() - ($2::INTEGER * INTERVAL '1 day')
    `, [boundedScore, boundedDays]);
    const row = res.rows[0] || {};
    const sampleSize = Number(row.sample_size || 0);
    const ready = sampleSize >= 30;
    return {
      sampleSize,
      scorePercentile: ready ? Number(((Number(row.at_or_below) / sampleSize) * 100).toFixed(1)) : null,
      averageScore: ready ? Number(row.avg_score || 0) : null,
      status: ready ? 'READY' : 'INSUFFICIENT_SAMPLE',
      comparisonWindowDays: boundedDays,
    };
  }

  // --- SCAN SESSIONS & ANALYTICS ---

  public async recordScanSession(
    record: Omit<ScanSessionRecord, 'id' | 'createdAt'>
  ): Promise<ScanSessionRecord> {
    const id = `scan_${crypto.randomUUID()}`;
    const nowIso = new Date().toISOString();

    const query = `
      INSERT INTO scan_sessions (
        id, ip_hash, country_code, city, isp, is_vpn, is_proxy, is_tor, is_webrtc_leak, network_intelligence_status, webrtc_evidence_state,
        privacy_score, score_tier, user_agent_category, verification_status, verification_coverage_pct, overall_confidence, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW()
      )
      RETURNING 
        id, ip_hash AS "ipHash", country_code AS "countryCode", city, isp, 
        is_vpn AS "isVpn", is_proxy AS "isProxy", is_tor AS "isTor", is_webrtc_leak AS "isWebRtcLeak",
        network_intelligence_status AS "networkIntelligenceStatus", webrtc_evidence_state AS "webRtcEvidenceState",
        privacy_score AS "privacyScore", score_tier AS "scoreTier", 
        user_agent_category AS "userAgentCategory", verification_status AS "verificationStatus", verification_coverage_pct AS "verificationCoveragePct", overall_confidence AS "overallConfidence", created_at AS "createdAt"
    `;

    const res = await this.connection.query(query, [
      id,
      record.ipHash,
      record.countryCode || 'XX',
      record.city || '',
      record.isp || '',
      record.isVpn,
      record.isProxy,
      record.isTor,
      record.isWebRtcLeak,
      record.networkIntelligenceStatus || 'UNAVAILABLE',
      record.webRtcEvidenceState || 'UNKNOWN',
      record.privacyScore,
      record.scoreTier,
      record.userAgentCategory || '',
      record.verificationStatus || 'PARTIAL',
      record.verificationCoveragePct ?? 0,
      record.overallConfidence || 'LOW',
    ]);

    const row = res.rows[0];
    return {
      id: row.id,
      ipHash: row.ipHash,
      countryCode: row.countryCode,
      city: row.city,
      isp: row.isp,
      isVpn: row.isVpn,
      isProxy: row.isProxy,
      isTor: row.isTor,
      isWebRtcLeak: row.isWebRtcLeak,
      networkIntelligenceStatus: row.networkIntelligenceStatus,
      webRtcEvidenceState: row.webRtcEvidenceState,
      privacyScore: row.privacyScore,
      scoreTier: row.scoreTier,
      userAgentCategory: row.userAgentCategory,
      verificationCoveragePct: Number(row.verificationCoveragePct ?? 0),
      overallConfidence: row.overallConfidence,
      createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : nowIso,
    };
  }

  public async getSystemAnalyticsSummary(): Promise<SystemAnalyticsSummary & { tierCounts: Record<string, number>; todayScans: number }> {
    // 1. Core aggregates
    const aggRes = await this.connection.query(`
      SELECT 
        COUNT(*)::INTEGER AS total_scans,
        COUNT(DISTINCT ip_hash)::INTEGER AS unique_ips,
        COUNT(*) FILTER (WHERE verification_status = 'COMPLETE')::INTEGER AS completed_scans,
        COALESCE(ROUND(AVG(privacy_score) FILTER (WHERE verification_status = 'COMPLETE')::numeric, 1), 0)::FLOAT AS avg_score,
        COALESCE(ROUND(AVG(verification_coverage_pct) FILTER (WHERE verification_status = 'COMPLETE')::numeric, 1), 0)::FLOAT AS avg_coverage,
        COUNT(*) FILTER (WHERE network_intelligence_status = 'VERIFIED' AND is_vpn = TRUE AND verification_status = 'COMPLETE')::INTEGER AS vpn_count,
        COUNT(*) FILTER (WHERE webrtc_evidence_state = 'CONFIRMED' AND is_webrtc_leak = TRUE AND verification_status = 'COMPLETE')::INTEGER AS webrtc_count,
        COUNT(*) FILTER (WHERE network_intelligence_status = 'VERIFIED' AND verification_status = 'COMPLETE')::INTEGER AS network_verified_count,
        COUNT(*) FILTER (WHERE webrtc_evidence_state = 'CONFIRMED' AND verification_status = 'COMPLETE')::INTEGER AS webrtc_verified_count,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::INTEGER AS today_scans
      FROM scan_sessions
    `);
    const agg = aggRes.rows[0] || {
      total_scans: 0,
      unique_ips: 0,
      avg_score: 0,
      vpn_count: 0,
      webrtc_count: 0,
      today_scans: 0,
    };

    const totalScans = Number(agg.total_scans);
    const uniqueIpsCount = Number(agg.unique_ips);
    const averagePrivacyScore = Number(agg.avg_score);
    const vpnDenominator = Number(agg.network_verified_count || 0);
    const webrtcDenominator = Number(agg.webrtc_verified_count || 0);
    const vpnDetectionRate = vpnDenominator > 0 ? parseFloat(((Number(agg.vpn_count) / vpnDenominator) * 100).toFixed(1)) : 0;
    const webRtcLeakRate = webrtcDenominator > 0 ? parseFloat(((Number(agg.webrtc_count) / webrtcDenominator) * 100).toFixed(1)) : 0;
    const todayScans = Number(agg.today_scans);
    const completedScans = Number(agg.completed_scans || 0);
    const completeRatePercent = totalScans > 0 ? Number(((completedScans / totalScans) * 100).toFixed(1)) : 0;
    const averageCoveragePercent = Number(agg.avg_coverage || 0);
    const confidenceRes = await this.connection.query(`
      SELECT overall_confidence AS confidence, COUNT(*)::INTEGER AS count
      FROM scan_sessions
      WHERE verification_status = 'COMPLETE'
      GROUP BY overall_confidence
    `);
    const confidenceCounts: Record<'HIGH'|'MEDIUM'|'LOW', number> = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    for (const row of confidenceRes.rows) {
      if (row.confidence === 'HIGH' || row.confidence === 'MEDIUM' || row.confidence === 'LOW') {
        const confidence = row.confidence as 'HIGH' | 'MEDIUM' | 'LOW';
        confidenceCounts[confidence] = Number(row.count);
      }
    }
    const networkVerifiedRate = totalScans > 0 ? Number(((Number(agg.network_verified_count || 0) / totalScans) * 100).toFixed(1)) : 0;
    const webRtcVerifiedRate = totalScans > 0 ? Number(((Number(agg.webrtc_verified_count || 0) / totalScans) * 100).toFixed(1)) : 0;
    const trendRes = await this.connection.query(`
      SELECT TO_CHAR(DATE(created_at), 'YYYY-MM-DD') AS date,
             COUNT(*)::INTEGER AS count,
             COALESCE(ROUND(AVG(privacy_score) FILTER (WHERE verification_status = 'COMPLETE')::numeric, 1), 0)::FLOAT AS average_score
      FROM scan_sessions
      WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `);
    const dailyTrend = trendRes.rows.map((row) => ({ date: row.date, count: Number(row.count), averageScore: row.average_score == null ? null : Number(row.average_score) }));

    // 2. Top Countries
    const topCountriesRes = await this.connection.query(`
      SELECT country_code AS "countryCode", COUNT(*)::INTEGER AS count
      FROM scan_sessions
      WHERE country_code IS NOT NULL AND country_code != '' AND country_code != 'XX'
      GROUP BY country_code
      ORDER BY count DESC
      LIMIT 10
    `);
    const topCountries = topCountriesRes.rows.map((r) => ({
      countryCode: r.countryCode,
      count: Number(r.count),
    }));

    // 3. Tier counts
    const tierRes = await this.connection.query(`
      SELECT score_tier AS "scoreTier", COUNT(*)::INTEGER AS count
      FROM scan_sessions
      WHERE verification_status = 'COMPLETE'
      GROUP BY score_tier
    `);
    const tierCounts: Record<string, number> = {
      EXCELLENT: 0,
      GOOD: 0,
      MODERATE: 0,
      CRITICAL: 0,
    };
    for (const r of tierRes.rows) {
      if (r.scoreTier && tierCounts[r.scoreTier] !== undefined) {
        tierCounts[r.scoreTier] = Number(r.count);
      }
    }

    // 4. Recent scans (without ipHash for privacy)
    const recentRes = await this.connection.query(`
      SELECT 
        id, country_code AS "countryCode", city, isp, 
        is_vpn AS "isVpn", is_proxy AS "isProxy", is_tor AS "isTor", is_webrtc_leak AS "isWebRtcLeak",
        network_intelligence_status AS "networkIntelligenceStatus", webrtc_evidence_state AS "webRtcEvidenceState",
        privacy_score AS "privacyScore", score_tier AS "scoreTier", 
        user_agent_category AS "userAgentCategory", verification_status AS "verificationStatus", verification_coverage_pct AS "verificationCoveragePct", overall_confidence AS "overallConfidence", created_at AS "createdAt"
      FROM scan_sessions
      ORDER BY created_at DESC
      LIMIT 10
    `);
    const recentScans = recentRes.rows.map((r) => ({
      ...r,
      createdAt: new Date(r.createdAt).toISOString(),
    }));

    return {
      totalScans,
      uniqueIpsCount,
      averagePrivacyScore,
      vpnDetectionRate,
      webRtcLeakRate,
      topCountries,
      recentScans,
      tierCounts,
      todayScans,
      completedScans,
      scoredScans: completedScans,
      scoreDistributionTotal: completedScans,
      vpnDetections: Number(agg.vpn_count || 0),
      webRtcConfirmedLeaks: Number(agg.webrtc_count || 0),
      completeRatePercent,
      averageCoveragePercent,
      confidenceCounts,
      networkVerifiedRate,
      webRtcVerifiedRate,
      dailyTrend,
    };
  }

  public async getScanSessionsPaginated(params: {
    page?: number;
    limit?: number;
    country?: string;
    tier?: string;
    isVpn?: boolean;
    search?: string;
    sortBy?: 'createdAt' | 'privacyScore' | 'countryCode';
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{
    data: Array<Omit<ScanSessionRecord, 'ipHash'>>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: any[] = [];
    let paramIdx = 1;

    if (params.country && params.country !== 'ALL') {
      conditions.push(`country_code = $${paramIdx++}`);
      values.push(params.country.toUpperCase());
    }

    if (params.tier && params.tier !== 'ALL') {
      conditions.push(`score_tier = $${paramIdx++}`);
      values.push(params.tier.toUpperCase());
    }

    if (typeof params.isVpn === 'boolean') {
      conditions.push(`(is_vpn = $${paramIdx} OR is_proxy = $${paramIdx})`);
      values.push(params.isVpn);
      paramIdx++;
    }

    if (params.search) {
      conditions.push(`(
        city ILIKE $${paramIdx} OR 
        isp ILIKE $${paramIdx} OR 
        country_code ILIKE $${paramIdx} OR 
        user_agent_category ILIKE $${paramIdx}
      )`);
      values.push(`%${params.search}%`);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total matching
    const countRes = await this.connection.query(
      `SELECT COUNT(*)::INTEGER AS total FROM scan_sessions ${whereClause}`,
      values
    );
    const total = Number(countRes.rows[0]?.total || 0);
    const totalPages = Math.ceil(total / limit) || 1;

    // Sorting column mapping (safe against SQL injection)
    let sortColumn = 'created_at';
    if (params.sortBy === 'privacyScore') sortColumn = 'privacy_score';
    else if (params.sortBy === 'countryCode') sortColumn = 'country_code';

    const sortDir = params.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const dataValues = [...values, limit, offset];
    const dataRes = await this.connection.query(
      `
      SELECT 
        id, country_code AS "countryCode", city, isp, 
        is_vpn AS "isVpn", is_proxy AS "isProxy", is_tor AS "isTor", is_webrtc_leak AS "isWebRtcLeak",
        network_intelligence_status AS "networkIntelligenceStatus", webrtc_evidence_state AS "webRtcEvidenceState",
        privacy_score AS "privacyScore", score_tier AS "scoreTier", 
        user_agent_category AS "userAgentCategory", verification_status AS "verificationStatus", verification_coverage_pct AS "verificationCoveragePct", overall_confidence AS "overallConfidence", created_at AS "createdAt"
      FROM scan_sessions
      ${whereClause}
      ORDER BY ${sortColumn} ${sortDir}
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
      `,
      dataValues
    );

    const data = dataRes.rows.map((r) => ({
      ...r,
      createdAt: new Date(r.createdAt).toISOString(),
    }));

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  // --- SECURITY LOGS ---

  public async recordSecurityLog(log: Omit<SecurityLogRecord, 'id' | 'createdAt'>): Promise<SecurityLogRecord> {
    const id = `sec_${crypto.randomUUID()}`;
    const res = await this.connection.query(
      `INSERT INTO security_logs (id, event_type, ip_address, details, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, event_type AS "eventType", ip_address AS "ipAddress", details, created_at AS "createdAt"`,
      [id, log.eventType, this.anonymizeIp(log.ipAddress), log.details]
    );
    const row = res.rows[0];
    return {
      id: row.id,
      eventType: row.eventType,
      ipAddress: row.ipAddress,
      details: row.details,
      createdAt: new Date(row.createdAt).toISOString(),
    };
  }

  public async getSecurityLogsPaginated(params: {
    page?: number;
    limit?: number;
    eventType?: string;
    search?: string;
  } = {}): Promise<{
    data: SecurityLogRecord[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: any[] = [];
    let paramIdx = 1;

    if (params.eventType && params.eventType !== 'ALL') {
      conditions.push(`event_type = $${paramIdx++}`);
      values.push(params.eventType);
    }

    if (params.search) {
      conditions.push(`(event_type ILIKE $${paramIdx} OR details ILIKE $${paramIdx} OR ip_address ILIKE $${paramIdx})`);
      values.push(`%${params.search}%`);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await this.connection.query(`SELECT COUNT(*)::INTEGER AS total FROM security_logs ${whereClause}`, values);
    const total = Number(countRes.rows[0]?.total || 0);
    const totalPages = Math.ceil(total / limit) || 1;

    const dataValues = [...values, limit, offset];
    const dataRes = await this.connection.query(
      `SELECT id, event_type AS "eventType", ip_address AS "ipAddress", details, created_at AS "createdAt"
       FROM security_logs
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      dataValues
    );

    const data = dataRes.rows.map((r) => ({
      ...r,
      createdAt: new Date(r.createdAt).toISOString(),
    }));

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  // --- PAGE VIEWS & PERFORMANCE ---

  public async recordPageView(pv: Omit<PageViewRecord, 'id' | 'createdAt'>): Promise<void> {
    const id = `pv_${crypto.randomUUID()}`;
    await this.connection.query(
      `INSERT INTO page_views (id, route, language, user_agent_category, duration_ms, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [id, pv.route, pv.language, pv.userAgentCategory, pv.durationMs || 0]
    );
  }

  public async getPageViewMetrics(): Promise<{
    totalViews: number;
    routeBreakdown: Array<{ route: string; count: number }>;
    languageBreakdown: Array<{ language: string; count: number }>;
    deviceBreakdown: Array<{ category: string; count: number }>;
  }> {
    const totalRes = await this.connection.query('SELECT COUNT(*)::INTEGER AS total FROM page_views');
    const totalViews = Number(totalRes.rows[0]?.total || 0);

    const routeRes = await this.connection.query(
      'SELECT route, COUNT(*)::INTEGER AS count FROM page_views GROUP BY route ORDER BY count DESC'
    );
    const langRes = await this.connection.query(
      'SELECT language, COUNT(*)::INTEGER AS count FROM page_views GROUP BY language ORDER BY count DESC'
    );
    const deviceRes = await this.connection.query(
      'SELECT user_agent_category AS category, COUNT(*)::INTEGER AS count FROM page_views GROUP BY user_agent_category ORDER BY count DESC'
    );

    return {
      totalViews,
      routeBreakdown: routeRes.rows.map((r) => ({ route: r.route, count: Number(r.count) })),
      languageBreakdown: langRes.rows.map((r) => ({ language: r.language, count: Number(r.count) })),
      deviceBreakdown: deviceRes.rows.map((r) => ({ category: r.category, count: Number(r.count) })),
    };
  }

  public async recordPerformanceMetric(perf: Omit<PerformanceMetricRecord, 'id' | 'createdAt'>): Promise<void> {
    const id = `perf_${crypto.randomUUID()}`;
    await this.connection.query(
      `INSERT INTO performance_metrics (id, endpoint, method, status_code, response_time_ms, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [id, perf.endpoint, perf.method, perf.statusCode, perf.responseTimeMs]
    );
  }

  public async getPerformanceMetricsSummary(): Promise<{
    totalRequests: number;
    avgResponseTimeMs: number;
    errorRatePercent: number;
    uptimeSeconds: number;
    endpoints: Array<{ endpoint: string; requestsCount: number; avgLatencyMs: number }>;
  }> {
    const summaryRes = await this.connection.query(`
      SELECT 
        COUNT(*)::INTEGER AS total_requests,
        COALESCE(ROUND(AVG(response_time_ms)::numeric, 0), 0)::INTEGER AS avg_latency,
        COUNT(*) FILTER (WHERE status_code >= 400)::INTEGER AS error_count
      FROM performance_metrics
    `);
    const summary = summaryRes.rows[0] || { total_requests: 0, avg_latency: 0, error_count: 0 };
    const totalRequests = Number(summary.total_requests);
    const avgResponseTimeMs = Number(summary.avg_latency);
    const errorRatePercent = totalRequests > 0 ? parseFloat(((Number(summary.error_count) / totalRequests) * 100).toFixed(2)) : 0;

    const endpointRes = await this.connection.query(`
      SELECT 
        endpoint,
        COUNT(*)::INTEGER AS requests_count,
        ROUND(AVG(response_time_ms)::numeric, 0)::INTEGER AS avg_latency
      FROM performance_metrics
      GROUP BY endpoint
      ORDER BY requests_count DESC
    `);

    const endpoints = endpointRes.rows.map((r) => ({
      endpoint: r.endpoint,
      requestsCount: Number(r.requests_count),
      avgLatencyMs: Number(r.avg_latency),
    }));

    return {
      totalRequests,
      avgResponseTimeMs,
      errorRatePercent,
      uptimeSeconds: Math.floor(process.uptime()),
      endpoints,
    };
  }

  // --- ADMIN AUDIT LOGS ---

  public async recordAdminAudit(audit: Omit<AdminAuditRecord, 'id' | 'createdAt'>): Promise<void> {
    const id = `aud_${crypto.randomUUID()}`;
    await this.connection.query(
      `INSERT INTO admin_audit_logs (id, admin_username, action, ip_address, details, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [id, audit.adminUsername, audit.action, this.anonymizeIp(audit.ipAddress), audit.details]
    );
  }

  public async getAdminAuditLogsPaginated(params: { page?: number; limit?: number; search?: string } = {}): Promise<{
    data: AdminAuditRecord[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: any[] = [];
    let paramIdx = 1;

    if (params.search) {
      conditions.push(`(admin_username ILIKE $${paramIdx} OR action ILIKE $${paramIdx} OR details ILIKE $${paramIdx})`);
      values.push(`%${params.search}%`);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await this.connection.query(`SELECT COUNT(*)::INTEGER AS total FROM admin_audit_logs ${whereClause}`, values);
    const total = Number(countRes.rows[0]?.total || 0);
    const totalPages = Math.ceil(total / limit) || 1;

    const dataValues = [...values, limit, offset];
    const dataRes = await this.connection.query(
      `SELECT id, admin_username AS "adminUsername", action, ip_address AS "ipAddress", details, created_at AS "createdAt"
       FROM admin_audit_logs
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      dataValues
    );

    const data = dataRes.rows.map((r) => ({
      ...r,
      createdAt: new Date(r.createdAt).toISOString(),
    }));

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  // --- RETENTION & CLEANUP ---

  public async cleanupExpiredSessions(): Promise<number> {
    const res = await this.connection.query(
      `DELETE FROM admin_sessions 
       WHERE expires_at < NOW() - INTERVAL '7 days' 
          OR revoked_at < NOW() - INTERVAL '7 days'`
    );
    return res.rowCount ?? 0;
  }

  public async purgeOldRecords(retentionDays = 90): Promise<{ scansDeleted: number; pageViewsDeleted: number; perfDeleted: number; securityLogsDeleted: number; auditLogsDeleted: number; authRateLimitsDeleted: number }> {
    const scans = await this.connection.query(
      `DELETE FROM scan_sessions WHERE created_at < NOW() - ($1 || ' days')::INTERVAL`,
      [retentionDays]
    );
    const pvs = await this.connection.query(
      `DELETE FROM page_views WHERE created_at < NOW() - ($1 || ' days')::INTERVAL`,
      [retentionDays]
    );
    const perfs = await this.connection.query(
      `DELETE FROM performance_metrics WHERE created_at < NOW() - ($1 || ' days')::INTERVAL`,
      [retentionDays]
    );
    const securityLogs = await this.connection.query(
      `DELETE FROM security_logs WHERE created_at < NOW() - ($1 || ' days')::INTERVAL`,
      [retentionDays]
    );
    const auditLogs = await this.connection.query(
      `DELETE FROM admin_audit_logs WHERE created_at < NOW() - ($1 || ' days')::INTERVAL`,
      [retentionDays]
    );
    const authRateLimits = await this.connection.query(
      `DELETE FROM auth_rate_limits WHERE first_attempt_at < NOW() - INTERVAL '1 day' AND (blocked_until IS NULL OR blocked_until < NOW())`
    );

    return {
      scansDeleted: scans.rowCount ?? 0,
      pageViewsDeleted: pvs.rowCount ?? 0,
      perfDeleted: perfs.rowCount ?? 0,
      securityLogsDeleted: securityLogs.rowCount ?? 0,
      auditLogsDeleted: auditLogs.rowCount ?? 0,
      authRateLimitsDeleted: authRateLimits.rowCount ?? 0,
    };
  }

  public async getTableRecordCounts(): Promise<{
    adminUsers: number;
    adminSessions: number;
    scanSessions: number;
    securityLogs: number;
    adminAuditLogs: number;
    pageViews: number;
    performanceMetrics: number;
  }> {
    const [u, s, sc, sec, aud, pv, perf] = await Promise.all([
      this.connection.query('SELECT COUNT(*)::INTEGER AS c FROM admin_users'),
      this.connection.query('SELECT COUNT(*)::INTEGER AS c FROM admin_sessions'),
      this.connection.query('SELECT COUNT(*)::INTEGER AS c FROM scan_sessions'),
      this.connection.query('SELECT COUNT(*)::INTEGER AS c FROM security_logs'),
      this.connection.query('SELECT COUNT(*)::INTEGER AS c FROM admin_audit_logs'),
      this.connection.query('SELECT COUNT(*)::INTEGER AS c FROM page_views'),
      this.connection.query('SELECT COUNT(*)::INTEGER AS c FROM performance_metrics'),
    ]);

    return {
      adminUsers: Number(u.rows[0].c),
      adminSessions: Number(s.rows[0].c),
      scanSessions: Number(sc.rows[0].c),
      securityLogs: Number(sec.rows[0].c),
      adminAuditLogs: Number(aud.rows[0].c),
      pageViews: Number(pv.rows[0].c),
      performanceMetrics: Number(perf.rows[0].c),
    };
  }
}
