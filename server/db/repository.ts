import crypto from 'crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import type {
  AdminUser,
  ScanSessionRecord,
  SecurityLogRecord,
  SystemAnalyticsSummary,
} from './types';
import { validateAdminUsername, validateAdminPassword } from '../config';
import type { PostgresRepository } from './postgresRepository';
import { ProductionGuard } from './productionGuard';
import { loadDevelopmentSeeds } from './dev-seeds/devSeedData';

/**
 * Request-scoped PostgreSQL repository storage.
 *
 * The long-running Node/Express dev server (server.ts) calls `setPostgresRepository()` once at
 * startup with a persistent `pg.Pool` - correct there, since it is a single OS process handling
 * requests sequentially with no cross-isolate concerns. Cloudflare Workers must NOT do that: a
 * Worker isolate can interleave multiple concurrent requests, and per Cloudflare's Hyperdrive
 * guidance, a database connection created during one request's I/O context must never be read or
 * written during another request's context. AsyncLocalStorage gives each request's entire async
 * call tree its own isolated view of "the current PostgresRepository" with zero risk of one
 * request seeing another's connection - concurrent `.run()` calls never share their stores.
 * See `runWithRequestScopedRepository` below, used by worker/index.ts once per request.
 */
const postgresRepoRequestScope = new AsyncLocalStorage<PostgresRepository | null>();

export interface PageViewRecord {
  id: string;
  route: string;
  language: string;
  userAgentCategory: string;
  createdAt: string;
  durationMs?: number;
}

export interface AdminAuditRecord {
  id: string;
  adminUsername: string;
  action: 'LOGIN' | 'LOGOUT' | 'FAILED_LOGIN' | 'VIEW_STATS' | 'VIEW_LOGS' | 'VIEW_SCANS' | 'EXPORT_DATA' | 'BOOTSTRAP_ADMIN' | 'ROTATE_CREDENTIALS';
  ipAddress: string;
  details: string;
  createdAt: string;
}

export interface PerformanceMetricRecord {
  id: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs: number;
  createdAt: string;
}

export interface AdminSession {
  token: string;
  username: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
  lastActiveAt: number;
  ipAddress: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'ANALYST' | 'VIEWER';
}

/**
 * Unified Database Repository
 * Fully compliant with DATA_SPEC.md, ADMIN_SPEC.md, FIX 8.1, FIX 8.2, and FIX 8.3.
 * Supports PostgreSQL relational persistence and explicit zero-data clean startup.
 */
export class DatabaseRepository {
  private postgresRepo: PostgresRepository | null = null;

  // In-memory development-only fallback stores
  private adminUsers: Map<string, AdminUser & { salt: string; passwordHash: string }> = new Map();
  private scanSessions: ScanSessionRecord[] = [];
  private securityLogs: SecurityLogRecord[] = [];
  private pageViews: PageViewRecord[] = [];
  private adminAuditLogs: AdminAuditRecord[] = [];
  private performanceMetrics: PerformanceMetricRecord[] = [];
  private activeSessions: Map<string, AdminSession> = new Map();
  private loginAttempts: Map<string, { count: number; firstAttemptAt: number; blockedUntil?: number }> = new Map();
  private apiRateLimitWindows: Map<string, number[]> = new Map();

  private serverSalt: string;

  constructor() {
    this.serverSalt = process.env.SERVER_SECRET_SALT || (process.env.NODE_ENV === 'production' ? '' : crypto.randomBytes(32).toString('hex'));
    this.initializeDefaultState();
  }

  public setPostgresRepository(repo: PostgresRepository | null): void {
    // Used by the Node/Express dev server (server/db/init.ts) only. Cloudflare Workers must
    // never call this - it would be exactly the shared/global connection state this design
    // avoids. Workers use `runWithRequestScopedRepository` instead.
    this.postgresRepo = repo;
  }

  public getPostgresRepository(): PostgresRepository | null {
    const scoped = postgresRepoRequestScope.getStore();
    // `undefined` means "no request-scoped context is active" (the Node dev server path,
    // which never calls runWithRequestScopedRepository) - fall back to the shared field set by
    // setPostgresRepository(). Once inside a request-scoped context (a Cloudflare Worker
    // request), the value explicitly scoped to THIS request always wins, `null` included
    // (meaning: database unavailable for this particular request).
    return scoped !== undefined ? scoped : this.postgresRepo;
  }

  public isPostgresActive(): boolean {
    return this.getPostgresRepository() !== null;
  }

  /**
   * Scopes `repo` (or `null` when the database is unavailable) to the current request only, for
   * the duration of `fn`. Every call to `getPostgresRepository()`/`isPostgresActive()` anywhere
   * in the async call tree started by `fn` - including inside services imported elsewhere, like
   * `adminAuthService` - sees this exact value. Concurrent invocations (concurrent Worker
   * requests handled by the same warm isolate) each get their own independent store; nothing is
   * written to a shared field, so there is no possibility of one request observing or closing
   * another request's database connection.
   */
  public runWithRequestScopedRepository<T>(repo: PostgresRepository | null, fn: () => Promise<T>): Promise<T> {
    return postgresRepoRequestScope.run(repo, fn);
  }

  // Runtime persistence facade. Production callers use these async methods so PostgreSQL
  // becomes the source of truth while the synchronous methods remain available for tests.

  public async consumeApiRateLimitAsync(
    bucketKey: string,
    windowMs: number,
    maxRequests: number
  ): Promise<{ isLimited: boolean; remaining: number; retryAfterSeconds: number }> {
    const postgresRepo = this.getPostgresRepository();
    if (postgresRepo) {
      return postgresRepo.consumeApiRateLimit(bucketKey, windowMs, maxRequests);
    }

    // Development/degraded fallback must retain state between calls. The previous
    // implementation created a new map for every request, effectively disabling
    // rate limiting whenever PostgreSQL was unavailable.
    const now = Date.now();
    const windowStart = now - windowMs;
    const timestamps = (this.apiRateLimitWindows.get(bucketKey) || []).filter(
      (timestamp) => timestamp > windowStart
    );

    if (timestamps.length >= maxRequests) {
      const oldestInWindow = timestamps[0] || now;
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((oldestInWindow + windowMs - now) / 1000)
      );
      this.apiRateLimitWindows.set(bucketKey, timestamps);
      return {
        isLimited: true,
        remaining: 0,
        retryAfterSeconds,
      };
    }

    timestamps.push(now);
    this.apiRateLimitWindows.set(bucketKey, timestamps);

    if (this.apiRateLimitWindows.size > 10_000) {
      this.apiRateLimitWindows.clear();
    }

    return {
      isLimited: false,
      remaining: Math.max(0, maxRequests - timestamps.length),
      retryAfterSeconds: 0,
    };
  }

  public async getAdminUserAsync(username: string) {
    const postgresRepo = this.getPostgresRepository();
    return postgresRepo ? postgresRepo.getAdminUser(username) : this.getAdminUser(username);
  }

  public async getAllAdminUsernamesAsync(): Promise<string[]> {
    const postgresRepo = this.getPostgresRepository();
    return postgresRepo ? postgresRepo.getAllAdminUsernames() : this.getAllAdminUsernames();
  }

  public async bootstrapAdminCredentialsAsync(username: string, passwordPlain: string, options?: { force?: boolean }) {
    const postgresRepo = this.getPostgresRepository();
    if (postgresRepo) return postgresRepo.bootstrapAdminCredentials(username, passwordPlain, options);
    return this.bootstrapAdminCredentials(username, passwordPlain, options);
  }

  public async rotateAdminCredentialsAsync(username: string, newPasswordPlain: string): Promise<boolean> {
    const postgresRepo = this.getPostgresRepository();
    if (postgresRepo) return postgresRepo.rotateAdminCredentials(username, newPasswordPlain);
    return this.rotateAdminCredentials(username, newPasswordPlain);
  }

  public async updateAdminLastLoginAsync(username: string): Promise<void> {
    const postgresRepo = this.getPostgresRepository();
    if (postgresRepo) return postgresRepo.updateAdminLastLogin(username);
    this.updateAdminLastLogin(username);
  }

  public async createSessionAsync(username: string, userId: string, ipAddress: string): Promise<AdminSession> {
    const postgresRepo = this.getPostgresRepository();
    if (postgresRepo) return postgresRepo.createSession(username, userId, ipAddress);
    return this.createSession(username, userId, ipAddress);
  }

  public async getSessionAsync(token: string): Promise<AdminSession | null> {
    const postgresRepo = this.getPostgresRepository();
    if (postgresRepo) return postgresRepo.getSession(token);
    return this.getSession(token);
  }

  public async invalidateSessionAsync(token: string): Promise<boolean> {
    const postgresRepo = this.getPostgresRepository();
    if (postgresRepo) return postgresRepo.invalidateSession(token);
    return this.invalidateSession(token);
  }

  public async invalidateAllSessionsAsync(username?: string): Promise<number> {
    const postgresRepo = this.getPostgresRepository();
    if (postgresRepo) return postgresRepo.invalidateAllSessions(username);
    return this.invalidateAllSessions(username);
  }

  public async checkLoginRateLimitAsync(ip: string, username?: string): Promise<{ isBlocked: boolean; retryAfterSeconds?: number }> {
    const postgresRepo = this.getPostgresRepository();
    if (postgresRepo) return postgresRepo.checkLoginRateLimitAsync(ip, username);
    return this.checkLoginRateLimit(ip);
  }

  public async recordFailedLoginAsync(ip: string, username?: string): Promise<void> {
    const postgresRepo = this.getPostgresRepository();
    if (postgresRepo) return postgresRepo.recordFailedLoginAsync(ip, username);
    this.recordFailedLogin(ip);
  }

  public async resetFailedLoginsAsync(ip: string, username?: string): Promise<void> {
    const postgresRepo = this.getPostgresRepository();
    if (postgresRepo) return postgresRepo.resetFailedLoginsAsync(ip, username);
    this.resetFailedLogins(ip);
  }

  public async recordScanSessionAsync(record: Omit<ScanSessionRecord, 'id' | 'createdAt'>): Promise<ScanSessionRecord> {
    const postgresRepo = this.getPostgresRepository();
    if (postgresRepo) return postgresRepo.recordScanSession(record);
    return this.recordScanSession(record);
  }

  public async getPopulationInsightAsync(privacyScore: number, windowDays = 30) {
    const postgresRepo = this.getPostgresRepository();
    if (postgresRepo) return postgresRepo.getPopulationInsight(privacyScore, windowDays);
    const boundedScore = Math.max(0, Math.min(100, Math.round(privacyScore)));
    const recent = this.scanSessions.filter((scan) => Date.now() - new Date(scan.createdAt).getTime() <= Math.min(90, Math.max(1, windowDays)) * 86400000);
    if (recent.length < 30) return { sampleSize: recent.length, scorePercentile: null, averageScore: null, status: 'INSUFFICIENT_SAMPLE' as const, comparisonWindowDays: windowDays };
    const atOrBelow = recent.filter((r) => r.privacyScore <= boundedScore).length;
    return { sampleSize: recent.length, scorePercentile: Number(((atOrBelow / recent.length) * 100).toFixed(1)), averageScore: Number((recent.reduce((a,b)=>a+b.privacyScore,0)/recent.length).toFixed(1)), status: 'READY' as const, comparisonWindowDays: windowDays };
  }

  public async getSystemAnalyticsSummaryAsync(): Promise<SystemAnalyticsSummary & { tierCounts?: Record<string, number>; todayScans?: number }> {
    const postgresRepo = this.getPostgresRepository();
    if (postgresRepo) return postgresRepo.getSystemAnalyticsSummary();
    return this.getSystemAnalyticsSummary();
  }

  public async getScanSessionsPaginatedAsync(params: Parameters<DatabaseRepository['getScanSessionsPaginated']>[0]) {
    const postgresRepo = this.getPostgresRepository();
    if (postgresRepo) return postgresRepo.getScanSessionsPaginated(params);
    return this.getScanSessionsPaginated(params);
  }

  public async recordSecurityLogAsync(log: Omit<SecurityLogRecord, 'id' | 'createdAt'>): Promise<SecurityLogRecord> {
    const postgresRepo = this.getPostgresRepository();
    if (postgresRepo) return postgresRepo.recordSecurityLog(log);
    return this.recordSecurityLog(log);
  }

  public async getSecurityLogsPaginatedAsync(params: Parameters<DatabaseRepository['getSecurityLogsPaginated']>[0]) {
    const postgresRepo = this.getPostgresRepository();
    if (postgresRepo) return postgresRepo.getSecurityLogsPaginated(params);
    return this.getSecurityLogsPaginated(params);
  }

  public async recordPageViewAsync(pv: Omit<PageViewRecord, 'id' | 'createdAt'>): Promise<void> {
    const postgresRepo = this.getPostgresRepository();
    if (postgresRepo) return postgresRepo.recordPageView(pv);
    this.recordPageView(pv);
  }

  public async getPageViewMetricsAsync() {
    const postgresRepo = this.getPostgresRepository();
    if (postgresRepo) return postgresRepo.getPageViewMetrics();
    return this.getPageViewMetrics();
  }

  public async recordPerformanceMetricAsync(perf: Omit<PerformanceMetricRecord, 'id' | 'createdAt'>): Promise<void> {
    const postgresRepo = this.getPostgresRepository();
    if (postgresRepo) return postgresRepo.recordPerformanceMetric(perf);
    this.recordPerformanceMetric(perf);
  }

  public async getPerformanceMetricsSummaryAsync() {
    const postgresRepo = this.getPostgresRepository();
    if (postgresRepo) return postgresRepo.getPerformanceMetricsSummary();
    return this.getPerformanceMetricsSummary();
  }

  public async recordAdminAuditAsync(audit: Omit<AdminAuditRecord, 'id' | 'createdAt'>): Promise<void> {
    const postgresRepo = this.getPostgresRepository();
    if (postgresRepo) return postgresRepo.recordAdminAudit(audit);
    this.recordAdminAudit(audit);
  }

  public async getAdminAuditLogsPaginatedAsync(params: Parameters<DatabaseRepository['getAdminAuditLogsPaginated']>[0] = {}) {
    const postgresRepo = this.getPostgresRepository();
    if (postgresRepo) return postgresRepo.getAdminAuditLogsPaginated(params);
    return this.getAdminAuditLogsPaginated(params);
  }

  /**
   * One-way HMAC-SHA256 salted anonymization for IP addresses
   * Strictly guarantees NO raw IPs are stored in scan records.
   */
  public anonymizeIp(ip: string): string {
    if (!this.serverSalt) {
      throw new Error('SERVER_SECRET_SALT is required in production for IP pseudonymization.');
    }
    return crypto.createHmac('sha256', this.serverSalt).update(ip.trim()).digest('hex');
  }

  /**
   * Hash password securely with PBKDF2 (256-bit key with 600,000 iterations)
   */
  public hashPassword(password: string, salt?: string): { hash: string; salt: string } {
    const userSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, userSalt, 600000, 32, 'sha256').toString('hex');
    return { hash, salt: userSalt };
  }

  /**
   * Verify password with constant-time equality check to prevent timing attacks
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

  /**
   * Initialize clean database state.
   * NEVER seeds synthetic scans, fake pageviews, or dummy analytics.
   * Only bootstraps the administrator credentials configured in environment variables.
   */
  private initializeDefaultState() {
    const isProduction = process.env.NODE_ENV === 'production';
    const envUsername = process.env.ADMIN_USERNAME ? process.env.ADMIN_USERNAME.trim() : undefined;
    const envPassword = process.env.ADMIN_PASSWORD || undefined;

    if (envUsername && envPassword) {
      try {
        this.bootstrapAdminCredentials(envUsername, envPassword);
      } catch (err: any) {
        if (isProduction) {
          throw err;
        }
      }
    }
  }

  /**
   * Explicit Development-Only Seed Loader
   * Strictly rejected by ProductionGuard if called in production mode.
   */
  public loadDevelopmentSeeds(): void {
    ProductionGuard.assertNoProductionSeedExecution('DatabaseRepository.loadDevelopmentSeeds');
    loadDevelopmentSeeds(this);
  }

  /**
   * Test isolation helper: Resets all in-memory repository stores to clean zero state.
   */
  public resetAllDataForTesting(): void {
    this.scanSessions = [];
    this.securityLogs = [];
    this.pageViews = [];
    this.adminAuditLogs = [];
    this.performanceMetrics = [];
    this.activeSessions.clear();
    this.loginAttempts.clear();
  }

  // --- ADMIN USERS & SESSIONS ---

  public getAdminUser(username: string) {
    const user = this.adminUsers.get(username);
    if (!user || user.status !== 'ACTIVE') return undefined;
    return user;
  }

  public getAllAdminUsernames(): string[] {
    return Array.from(this.adminUsers.keys());
  }

  /**
   * Bootstraps or updates administrator credentials from environment.
   * Stores only the PBKDF2 hash + random salt.
   * Plaintext password is NEVER stored or persisted.
   */
  public bootstrapAdminCredentials(
    username: string,
    passwordPlain: string,
    options?: { force?: boolean }
  ): { success: boolean; username: string; isNewUser: boolean } {
    const isProduction = process.env.NODE_ENV === 'production';
    const userVal = validateAdminUsername(username);
    if (!userVal.valid) {
      throw new Error(`Failed to bootstrap admin: ${userVal.error}`);
    }
    const passVal = validateAdminPassword(passwordPlain, isProduction);
    if (!passVal.valid) {
      throw new Error(`Failed to bootstrap admin: ${passVal.error}`);
    }

    const existingUser = this.adminUsers.get(username);
    const isNewUser = !existingUser;

    // Generate new cryptographic salt & PBKDF2 hash
    const { hash, salt } = this.hashPassword(passwordPlain);

    if (existingUser) {
      const isSamePassword = this.verifyPassword(passwordPlain, existingUser.passwordHash, existingUser.salt);
      if (!isSamePassword || options?.force) {
        existingUser.passwordHash = hash;
        existingUser.salt = salt;
        this.adminUsers.set(username, existingUser);

        // Invalidate all active sessions for this user on credential change
        this.invalidateAllSessions(username);

        this.recordSecurityLog({
          eventType: 'ADMIN_CREDENTIALS_ROTATED',
          ipAddress: '127.0.0.1',
          details: `Admin credentials rotated for user '${username}'. All active sessions invalidated.`,
        });

        this.recordAdminAudit({
          adminUsername: username,
          action: 'ROTATE_CREDENTIALS',
          ipAddress: '127.0.0.1',
          details: 'Credentials updated from environment/bootstrap.',
        });
      }
    } else {
      this.adminUsers.set(username, {
        id: `usr_admin_${crypto.randomUUID()}`,
        username,
        passwordHash: hash,
        salt,
        createdAt: new Date().toISOString(),
        role: isProduction ? 'SUPERADMIN' : 'ADMIN',
        status: 'ACTIVE',
      });

      this.recordSecurityLog({
        eventType: 'ADMIN_USER_CREATED',
        ipAddress: '127.0.0.1',
        details: `Admin user '${username}' initialized via secure bootstrap hash.`,
      });

      this.recordAdminAudit({
        adminUsername: username,
        action: 'BOOTSTRAP_ADMIN',
        ipAddress: '127.0.0.1',
        details: 'Admin identity initialized via secure environment bootstrap.',
      });
    }

    // In production or when a custom username is configured, remove any legacy default 'admin' user if different
    if (username !== 'admin' && this.adminUsers.has('admin')) {
      this.adminUsers.delete('admin');
    }

    // If PostgreSQL repository is active, asynchronously persist to database
    const postgresRepo = this.getPostgresRepository();
    if (postgresRepo) {
      postgresRepo.bootstrapAdminCredentials(username, passwordPlain, options).catch((err) => {
        console.error('[DATABASE] Async bootstrap to PostgreSQL failed:', err.message);
      });
    }

    return { success: true, username, isNewUser };
  }

  /**
   * Rotates admin credentials safely.
   */
  public rotateAdminCredentials(username: string, newPasswordPlain: string): boolean {
    const isProduction = process.env.NODE_ENV === 'production';
    const passVal = validateAdminPassword(newPasswordPlain, isProduction);
    if (!passVal.valid) {
      throw new Error(`Failed to rotate admin credentials: ${passVal.error}`);
    }

    const user = this.adminUsers.get(username);
    if (!user) {
      throw new Error(`Cannot rotate credentials: User '${username}' does not exist.`);
    }

    const { hash, salt } = this.hashPassword(newPasswordPlain);
    user.passwordHash = hash;
    user.salt = salt;
    this.adminUsers.set(username, user);

    // Invalidate existing sessions
    this.invalidateAllSessions(username);

    this.recordSecurityLog({
      eventType: 'ADMIN_CREDENTIALS_ROTATED',
      ipAddress: '127.0.0.1',
      details: `Admin credentials rotated for user '${username}'.`,
    });

    this.recordAdminAudit({
      adminUsername: username,
      action: 'ROTATE_CREDENTIALS',
      ipAddress: '127.0.0.1',
      details: 'Password hash rotated. Active sessions revoked.',
    });

    const postgresRepo = this.getPostgresRepository();
    if (postgresRepo) {
      postgresRepo.rotateAdminCredentials(username, newPasswordPlain).catch((err) => {
        console.error('[DATABASE] Async rotate credentials to PostgreSQL failed:', err.message);
      });
    }

    return true;
  }

  /**
   * Invalidate all active sessions or all sessions for a specific username
   */
  public invalidateAllSessions(username?: string): number {
    let count = 0;
    for (const [token, session] of this.activeSessions.entries()) {
      if (!username || session.username === username) {
        this.activeSessions.delete(token);
        count++;
      }
    }
    return count;
  }

  public updateAdminLastLogin(username: string) {
    const user = this.adminUsers.get(username);
    if (user) {
      user.lastLogin = new Date().toISOString();
      this.adminUsers.set(username, user);
    }
  }

  public createSession(username: string, userId: string, ipAddress: string): AdminSession {
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours

    const session: AdminSession = {
      token,
      username,
      userId,
      createdAt: now,
      expiresAt,
      lastActiveAt: now,
      ipAddress,
      role: this.getAdminUser(username)?.role || 'VIEWER',
    };

    this.activeSessions.set(token, session);

    const postgresRepo = this.getPostgresRepository();
    if (postgresRepo) {
      postgresRepo.createSession(username, userId, ipAddress).catch((err) => {
        console.error('[DATABASE] Async session create in PostgreSQL failed:', err.message);
      });
    }

    return session;
  }

  public getSession(token: string): AdminSession | null {
    if (!token) return null;
    const session = this.activeSessions.get(token);
    if (!session) return null;

    if (Date.now() > session.expiresAt) {
      this.activeSessions.delete(token);
      return null;
    }

    session.lastActiveAt = Date.now();
    return session;
  }

  public invalidateSession(token: string): boolean {
    const result = this.activeSessions.delete(token);
    const postgresRepo = this.getPostgresRepository();
    if (postgresRepo && token) {
      postgresRepo.invalidateSession(token).catch((err) => {
        console.error('[DATABASE] Async session invalidate in PostgreSQL failed:', err.message);
      });
    }
    return result;
  }

  // --- BRUTE FORCE RATE LIMITING ---

  public checkLoginRateLimit(ip: string): { isBlocked: boolean; retryAfterSeconds?: number } {
    const record = this.loginAttempts.get(ip);
    const now = Date.now();

    if (!record) return { isBlocked: false };

    if (record.blockedUntil && record.blockedUntil > now) {
      const retryAfterSeconds = Math.ceil((record.blockedUntil - now) / 1000);
      return { isBlocked: true, retryAfterSeconds };
    }

    // Reset window if 15 minutes have passed
    if (now - record.firstAttemptAt > 15 * 60 * 1000) {
      this.loginAttempts.delete(ip);
      return { isBlocked: false };
    }

    return { isBlocked: false };
  }

  public recordFailedLogin(ip: string) {
    const now = Date.now();
    const record = this.loginAttempts.get(ip) || { count: 0, firstAttemptAt: now };
    record.count += 1;

    if (record.count >= 5) {
      record.blockedUntil = now + 15 * 60 * 1000; // Block for 15 minutes
    }

    this.loginAttempts.set(ip, record);
  }

  public resetFailedLogins(ip: string) {
    this.loginAttempts.delete(ip);
  }

  // --- SCAN SESSIONS & ANALYTICS ---

  public recordScanSession(record: Omit<ScanSessionRecord, 'id' | 'createdAt'>): ScanSessionRecord {
    const newRecord: ScanSessionRecord = {
      id: `scan_${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
      ...record,
    };
    this.scanSessions.unshift(newRecord);
    
    // Retention cleanup (cap at 10,000 records)
    if (this.scanSessions.length > 10000) {
      this.scanSessions = this.scanSessions.slice(0, 10000);
    }

    const postgresRepo = this.getPostgresRepository();
    if (postgresRepo) {
      postgresRepo.recordScanSession(record).catch((err) => {
        console.error('[DATABASE] Async scan session record in PostgreSQL failed:', err.message);
      });
    }

    return newRecord;
  }

  public getSystemAnalyticsSummary(): SystemAnalyticsSummary {
    const totalScans = this.scanSessions.length;
    const uniqueIps = new Set(this.scanSessions.map((s) => s.ipHash)).size;
    const completed = this.scanSessions.filter((s) => s.verificationStatus === 'COMPLETE');
    const sumScore = completed.reduce((acc, s) => acc + s.privacyScore, 0);
    const averagePrivacyScore = completed.length > 0 ? parseFloat((sumScore / completed.length).toFixed(1)) : 0;

    const verifiedNetwork = completed.filter((s) => s.networkIntelligenceStatus === 'VERIFIED');
    const vpnCount = verifiedNetwork.filter((s) => s.isVpn === true).length;
    const vpnDetectionRate = verifiedNetwork.length > 0 ? parseFloat(((vpnCount / verifiedNetwork.length) * 100).toFixed(1)) : 0;

    const verifiedWebRtc = completed.filter((s) => s.webRtcEvidenceState === 'CONFIRMED' || s.webRtcEvidenceState === 'NOT_DETECTED');
    const webrtcLeakCount = verifiedWebRtc.filter((s) => s.isWebRtcLeak === true && s.webRtcEvidenceState === 'CONFIRMED').length;
    const webRtcLeakRate = verifiedWebRtc.length > 0 ? parseFloat(((webrtcLeakCount / verifiedWebRtc.length) * 100).toFixed(1)) : 0;

    // Top Countries
    const countryCounts: Record<string, number> = {};
    for (const scan of this.scanSessions) {
      if (scan.countryCode) {
        countryCounts[scan.countryCode] = (countryCounts[scan.countryCode] || 0) + 1;
      }
    }
    const topCountries = Object.entries(countryCounts)
      .map(([countryCode, count]) => ({ countryCode, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Tier distribution
    const tierCounts = {
      EXCELLENT: completed.filter((s) => s.scoreTier === 'EXCELLENT').length,
      GOOD: completed.filter((s) => s.scoreTier === 'GOOD').length,
      MODERATE: completed.filter((s) => s.scoreTier === 'MODERATE').length,
      CRITICAL: completed.filter((s) => s.scoreTier === 'CRITICAL').length,
    };

    const completedScans = this.scanSessions.filter((s) => s.verificationStatus === 'COMPLETE').length;
    const completeRatePercent = totalScans > 0 ? parseFloat(((completedScans / totalScans) * 100).toFixed(1)) : 0;
    const averageCoveragePercent = completed.length > 0 ? parseFloat((completed.reduce((sum, s) => sum + (s.verificationCoveragePct ?? 0), 0) / completed.length).toFixed(1)) : 0;
    const confidenceCounts = {
      HIGH: completed.filter((s) => s.overallConfidence === 'HIGH').length,
      MEDIUM: completed.filter((s) => s.overallConfidence === 'MEDIUM').length,
      LOW: completed.filter((s) => s.overallConfidence === 'LOW').length,
    };
    const dayMap = new Map<string, { count: number; scores: number[] }>();
    for (const scan of this.scanSessions) {
      const key = new Date(scan.createdAt).toISOString().slice(0, 10);
      const entry = dayMap.get(key) || { count: 0, scores: [] };
      entry.count += 1; entry.scores.push(scan.privacyScore); dayMap.set(key, entry);
    }
    const dailyTrend = Array.from(dayMap.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-7).map(([date, value]) => {
      const completedScores = this.scanSessions
        .filter((s) => s.verificationStatus === 'COMPLETE' && new Date(s.createdAt).toISOString().slice(0, 10) === date)
        .map((s) => s.privacyScore);
      return { date, count: value.count, averageScore: completedScores.length ? parseFloat((completedScores.reduce((a, b) => a + b, 0) / completedScores.length).toFixed(1)) : null };
    });

    return {
      totalScans,
      uniqueIpsCount: uniqueIps,
      averagePrivacyScore,
      vpnDetectionRate,
      webRtcLeakRate,
      topCountries,
      recentScans: this.scanSessions.slice(0, 10).map(({ ipHash: _ipHash, ...rest }) => rest),
      tierCounts,
      completedScans,
      scoredScans: completedScans,
      scoreDistributionTotal: completedScans,
      vpnDetections: vpnCount,
      webRtcConfirmedLeaks: webrtcLeakCount,
      completeRatePercent,
      averageCoveragePercent,
      confidenceCounts,
      networkVerifiedRate: totalScans > 0 ? parseFloat(((verifiedNetwork.length/totalScans)*100).toFixed(1)) : 0,
      webRtcVerifiedRate: totalScans > 0 ? parseFloat(((verifiedWebRtc.length/totalScans)*100).toFixed(1)) : 0,
      dailyTrend,
      todayScans: this.scanSessions.filter((s) => {
        const d = new Date(s.createdAt);
        const today = new Date();
        return d.toDateString() === today.toDateString();
      }).length,
    } as SystemAnalyticsSummary & { tierCounts: Record<string, number>; todayScans: number };
  }

  public getScanSessionsPaginated(params: {
    page?: number;
    limit?: number;
    country?: string;
    tier?: string;
    isVpn?: boolean;
    search?: string;
    sortBy?: 'createdAt' | 'privacyScore' | 'countryCode';
    sortOrder?: 'asc' | 'desc';
  } = {}) {
    let filtered = [...this.scanSessions];

    if (params.country && params.country !== 'ALL') {
      const c = params.country.toUpperCase();
      filtered = filtered.filter((s) => s.countryCode === c);
    }

    if (params.tier && params.tier !== 'ALL') {
      const t = params.tier.toUpperCase();
      filtered = filtered.filter((s) => s.scoreTier === t);
    }

    if (typeof params.isVpn === 'boolean') {
      filtered = filtered.filter((s) => s.isVpn === params.isVpn || s.isProxy === params.isVpn);
    }

    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          (s.city && s.city.toLowerCase().includes(q)) ||
          (s.isp && s.isp.toLowerCase().includes(q)) ||
          (s.countryCode && s.countryCode.toLowerCase().includes(q)) ||
          (s.userAgentCategory && s.userAgentCategory.toLowerCase().includes(q))
      );
    }

    const sortBy = params.sortBy || 'createdAt';
    const sortOrder = params.sortOrder || 'desc';

    filtered.sort((a, b) => {
      let valA: any = a[sortBy];
      let valB: any = b[sortBy];
      if (sortBy === 'createdAt') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const total = filtered.length;
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10)); // bounded page size
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;

    const data = filtered.slice(offset, offset + limit).map(({ ipHash: _ipHash, ...safeRecord }) => safeRecord);

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

  public recordSecurityLog(log: Omit<SecurityLogRecord, 'id' | 'createdAt'>): SecurityLogRecord {
    const newLog: SecurityLogRecord = {
      id: `sec_${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
      ...log,
    };
    this.securityLogs.unshift(newLog);
    if (this.securityLogs.length > 5000) {
      this.securityLogs = this.securityLogs.slice(0, 5000);
    }

    const postgresRepo = this.getPostgresRepository();
    if (postgresRepo) {
      postgresRepo.recordSecurityLog(log).catch((err) => {
        console.error('[DATABASE] Async security log record in PostgreSQL failed:', err.message);
      });
    }

    return newLog;
  }

  public getSecurityLogsPaginated(params: {
    page?: number;
    limit?: number;
    eventType?: string;
    search?: string;
  } = {}) {
    let filtered = [...this.securityLogs];

    if (params.eventType && params.eventType !== 'ALL') {
      filtered = filtered.filter((l) => l.eventType === params.eventType);
    }

    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.eventType.toLowerCase().includes(q) ||
          l.details.toLowerCase().includes(q) ||
          l.ipAddress.toLowerCase().includes(q)
      );
    }

    const total = filtered.length;
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;

    const data = filtered.slice(offset, offset + limit);

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

  public recordPageView(pv: Omit<PageViewRecord, 'id' | 'createdAt'>) {
    this.pageViews.unshift({
      id: `pv_${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
      ...pv,
    });
    if (this.pageViews.length > 10000) {
      this.pageViews = this.pageViews.slice(0, 10000);
    }

    const postgresRepo = this.getPostgresRepository();
    if (postgresRepo) {
      postgresRepo.recordPageView(pv).catch((err) => {
        console.error('[DATABASE] Async page view record in PostgreSQL failed:', err.message);
      });
    }
  }

  public getPageViewMetrics() {
    const routeCounts: Record<string, number> = {};
    const languageCounts: Record<string, number> = {};
    const deviceCounts: Record<string, number> = {};

    for (const pv of this.pageViews) {
      routeCounts[pv.route] = (routeCounts[pv.route] || 0) + 1;
      languageCounts[pv.language] = (languageCounts[pv.language] || 0) + 1;
      deviceCounts[pv.userAgentCategory] = (deviceCounts[pv.userAgentCategory] || 0) + 1;
    }

    return {
      totalViews: this.pageViews.length,
      routeBreakdown: Object.entries(routeCounts).map(([route, count]) => ({ route, count })),
      languageBreakdown: Object.entries(languageCounts).map(([language, count]) => ({ language, count })),
      deviceBreakdown: Object.entries(deviceCounts).map(([category, count]) => ({ category, count })),
    };
  }

  public recordPerformanceMetric(perf: Omit<PerformanceMetricRecord, 'id' | 'createdAt'>) {
    this.performanceMetrics.unshift({
      id: `perf_${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
      ...perf,
    });
    if (this.performanceMetrics.length > 5000) {
      this.performanceMetrics = this.performanceMetrics.slice(0, 5000);
    }

    const postgresRepo = this.getPostgresRepository();
    if (postgresRepo) {
      postgresRepo.recordPerformanceMetric(perf).catch((err) => {
        console.error('[DATABASE] Async performance metric record in PostgreSQL failed:', err.message);
      });
    }
  }

  public getPerformanceMetricsSummary() {
    const totalRequests = this.performanceMetrics.length;
    const avgResponseTime =
      totalRequests > 0
        ? Math.round(this.performanceMetrics.reduce((acc, p) => acc + p.responseTimeMs, 0) / totalRequests)
        : 0;

    const errorCount = this.performanceMetrics.filter((p) => p.statusCode >= 400).length;
    const errorRate = totalRequests > 0 ? parseFloat(((errorCount / totalRequests) * 100).toFixed(2)) : 0;

    const endpointStats: Record<string, { count: number; totalMs: number }> = {};
    for (const p of this.performanceMetrics) {
      if (!endpointStats[p.endpoint]) {
        endpointStats[p.endpoint] = { count: 0, totalMs: 0 };
      }
      endpointStats[p.endpoint].count += 1;
      endpointStats[p.endpoint].totalMs += p.responseTimeMs;
    }

    const endpoints = Object.entries(endpointStats).map(([endpoint, data]) => ({
      endpoint,
      requestsCount: data.count,
      avgLatencyMs: Math.round(data.totalMs / data.count),
    }));

    return {
      totalRequests,
      avgResponseTimeMs: avgResponseTime,
      errorRatePercent: errorRate,
      uptimeSeconds: Math.floor(process.uptime()),
      endpoints,
    };
  }

  // --- ADMIN AUDIT LOGS ---

  public recordAdminAudit(audit: Omit<AdminAuditRecord, 'id' | 'createdAt'>) {
    this.adminAuditLogs.unshift({
      id: `aud_${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
      ...audit,
    });
    if (this.adminAuditLogs.length > 5000) {
      this.adminAuditLogs = this.adminAuditLogs.slice(0, 5000);
    }

    const postgresRepo = this.getPostgresRepository();
    if (postgresRepo) {
      postgresRepo.recordAdminAudit(audit).catch((err) => {
        console.error('[DATABASE] Async admin audit record in PostgreSQL failed:', err.message);
      });
    }
  }

  public getAdminAuditLogsPaginated(params: { page?: number; limit?: number; search?: string } = {}) {
    let filtered = [...this.adminAuditLogs];

    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.adminUsername.toLowerCase().includes(q) ||
          a.action.toLowerCase().includes(q) ||
          a.details.toLowerCase().includes(q)
      );
    }

    const total = filtered.length;
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;

    const data = filtered.slice(offset, offset + limit);

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
}

export const dbRepository = new DatabaseRepository();
