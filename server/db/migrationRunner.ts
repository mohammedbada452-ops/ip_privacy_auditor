import type pg from 'pg';
import pgRuntime from 'pg';

const { Pool: PgPool } = pgRuntime;

export interface Migration {
  version: number;
  name: string;
  sql: string;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: '001_initial_schema',
    sql: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS admin_users (
        id VARCHAR(64) PRIMARY KEY,
        username VARCHAR(64) UNIQUE NOT NULL,
        password_hash VARCHAR(128) NOT NULL,
        password_salt VARCHAR(64) NOT NULL,
        role VARCHAR(32) NOT NULL DEFAULT 'admin',
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_login_at TIMESTAMPTZ
      );

      CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);

      CREATE TABLE IF NOT EXISTS admin_sessions (
        id VARCHAR(64) PRIMARY KEY,
        token_hash VARCHAR(64) UNIQUE NOT NULL,
        user_id VARCHAR(64) NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
        username VARCHAR(64) NOT NULL,
        ip_address VARCHAR(64) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL,
        last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        revoked_at TIMESTAMPTZ
      );

      CREATE INDEX IF NOT EXISTS idx_admin_sessions_token_hash ON admin_sessions(token_hash);
      CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);
      CREATE INDEX IF NOT EXISTS idx_admin_sessions_revoked_at ON admin_sessions(revoked_at);
      CREATE INDEX IF NOT EXISTS idx_admin_sessions_username ON admin_sessions(username);

      CREATE TABLE IF NOT EXISTS scan_sessions (
        id VARCHAR(64) PRIMARY KEY,
        ip_hash VARCHAR(64) NOT NULL,
        country_code VARCHAR(8) NOT NULL DEFAULT 'XX',
        city VARCHAR(128) NOT NULL DEFAULT '',
        isp VARCHAR(256) NOT NULL DEFAULT '',
        is_vpn BOOLEAN NOT NULL DEFAULT FALSE,
        is_proxy BOOLEAN NOT NULL DEFAULT FALSE,
        is_tor BOOLEAN NOT NULL DEFAULT FALSE,
        is_webrtc_leak BOOLEAN NOT NULL DEFAULT FALSE,
        privacy_score INTEGER NOT NULL,
        score_tier VARCHAR(16) NOT NULL,
        user_agent_category VARCHAR(64) NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_scan_sessions_created_at ON scan_sessions(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_scan_sessions_privacy_score ON scan_sessions(privacy_score);
      CREATE INDEX IF NOT EXISTS idx_scan_sessions_score_tier ON scan_sessions(score_tier);
      CREATE INDEX IF NOT EXISTS idx_scan_sessions_country_code ON scan_sessions(country_code);
      CREATE INDEX IF NOT EXISTS idx_scan_sessions_ip_hash ON scan_sessions(ip_hash);

      CREATE TABLE IF NOT EXISTS security_logs (
        id VARCHAR(64) PRIMARY KEY,
        event_type VARCHAR(64) NOT NULL,
        ip_address VARCHAR(64) NOT NULL,
        details TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_security_logs_event_type ON security_logs(event_type);

      CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id VARCHAR(64) PRIMARY KEY,
        admin_username VARCHAR(64) NOT NULL,
        action VARCHAR(64) NOT NULL,
        ip_address VARCHAR(64) NOT NULL,
        details TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_username ON admin_audit_logs(admin_username);

      CREATE TABLE IF NOT EXISTS page_views (
        id VARCHAR(64) PRIMARY KEY,
        route VARCHAR(128) NOT NULL,
        language VARCHAR(16) NOT NULL DEFAULT 'en',
        user_agent_category VARCHAR(64) NOT NULL DEFAULT '',
        duration_ms INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_page_views_route ON page_views(route);
      CREATE INDEX IF NOT EXISTS idx_page_views_language ON page_views(language);

      CREATE TABLE IF NOT EXISTS performance_metrics (
        id VARCHAR(64) PRIMARY KEY,
        endpoint VARCHAR(128) NOT NULL,
        method VARCHAR(16) NOT NULL,
        status_code INTEGER NOT NULL,
        response_time_ms INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at ON performance_metrics(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_performance_metrics_endpoint ON performance_metrics(endpoint);
    `,
  },
  {
    version: 2,
    name: '002_auth_rate_limits',
    sql: `
      CREATE TABLE IF NOT EXISTS auth_rate_limits (
        ip_hash VARCHAR(64) PRIMARY KEY,
        failure_count INTEGER NOT NULL DEFAULT 0,
        first_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        blocked_until TIMESTAMPTZ
      );

      CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_blocked_until ON auth_rate_limits(blocked_until);
    `,
  },
  {
    version: 3,
    name: '003_global_rate_limits',
    sql: `
      CREATE TABLE IF NOT EXISTS api_rate_limits (
        bucket_key VARCHAR(191) PRIMARY KEY,
        window_started_at TIMESTAMPTZ NOT NULL,
        request_count INTEGER NOT NULL DEFAULT 0,
        expires_at TIMESTAMPTZ NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_api_rate_limits_expires_at ON api_rate_limits(expires_at);

      CREATE TABLE IF NOT EXISTS auth_rate_limit_buckets (
        bucket_key VARCHAR(191) PRIMARY KEY,
        failure_count INTEGER NOT NULL DEFAULT 0,
        first_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        blocked_until TIMESTAMPTZ
      );

      CREATE INDEX IF NOT EXISTS idx_auth_rate_limit_buckets_blocked_until ON auth_rate_limit_buckets(blocked_until);
    `,
  },
  {
    version: 4,
    name: '004_evidence_truth',
    sql: `
      -- Evidence-truth fields: distinguish unknown from false in persisted analytics.
      ALTER TABLE scan_sessions ADD COLUMN IF NOT EXISTS network_intelligence_status VARCHAR(16) NOT NULL DEFAULT 'UNAVAILABLE';
      ALTER TABLE scan_sessions ADD COLUMN IF NOT EXISTS webrtc_evidence_state VARCHAR(16) NOT NULL DEFAULT 'UNKNOWN';
      ALTER TABLE scan_sessions ALTER COLUMN is_vpn DROP DEFAULT;
      ALTER TABLE scan_sessions ALTER COLUMN is_proxy DROP DEFAULT;
      ALTER TABLE scan_sessions ALTER COLUMN is_tor DROP DEFAULT;
      ALTER TABLE scan_sessions ALTER COLUMN is_webrtc_leak DROP DEFAULT;
      ALTER TABLE scan_sessions ALTER COLUMN is_vpn DROP NOT NULL;
      ALTER TABLE scan_sessions ALTER COLUMN is_proxy DROP NOT NULL;
      ALTER TABLE scan_sessions ALTER COLUMN is_tor DROP NOT NULL;
      ALTER TABLE scan_sessions ALTER COLUMN is_webrtc_leak DROP NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_scan_sessions_network_status ON scan_sessions(network_intelligence_status);
      CREATE INDEX IF NOT EXISTS idx_scan_sessions_webrtc_state ON scan_sessions(webrtc_evidence_state);
    `,
  },
  {
    version: 5,
    name: '005_verification_status',
    sql: `
      -- Persist scan verification completeness so population intelligence only uses fully verifiable audits.
      ALTER TABLE scan_sessions ADD COLUMN IF NOT EXISTS verification_status VARCHAR(16) NOT NULL DEFAULT 'COMPLETE';
      CREATE INDEX IF NOT EXISTS idx_scan_sessions_verification_status ON scan_sessions(verification_status);

      -- Historical rows created before verification provenance existed must not be presented as fully verified.
      UPDATE scan_sessions
      SET verification_status = 'PARTIAL'
      WHERE network_intelligence_status <> 'VERIFIED' OR webrtc_evidence_state IN ('UNKNOWN', 'UNAVAILABLE');
    `,
  },
  {
    version: 6,
    name: '006_accuracy_coverage',
    sql: `
      -- Accuracy Core: persist verification coverage/confidence so population analytics never
      -- treat incomplete audits as equivalent to fully verified audits.
      ALTER TABLE scan_sessions
        ADD COLUMN IF NOT EXISTS verification_coverage_pct INTEGER NOT NULL DEFAULT 0
          CHECK (verification_coverage_pct >= 0 AND verification_coverage_pct <= 100),
        ADD COLUMN IF NOT EXISTS overall_confidence VARCHAR(8) NOT NULL DEFAULT 'LOW'
          CHECK (overall_confidence IN ('HIGH','MEDIUM','LOW'));

      CREATE INDEX IF NOT EXISTS idx_scan_sessions_verified_created_at
        ON scan_sessions(created_at DESC)
        WHERE verification_status = 'COMPLETE';
    `,
  },
];

/**
 * Migration runner shared by the Node development server and Cloudflare Worker.
 *
 * Node/Express: a pool is supplied and one pool client is checked out for the complete
 * migration transaction, then released.
 *
 * Cloudflare Worker: a single request-scoped pg.Client is supplied. When
 * `acquireAdvisoryLock` is enabled, a transaction-level PostgreSQL advisory lock serializes
 * schema changes across concurrent requests/isolates. The client always remains owned by the
 * caller and is never cached by this module.
 */
export interface MigrationRunOptions {
  /** Serialize migration execution across concurrent Worker requests/isolates. */
  acquireAdvisoryLock?: boolean;
}

// Stable application-specific PostgreSQL advisory-lock key. Two int32 values are accepted by
// pg_advisory_xact_lock and avoid depending on server-specific hash functions.
const MIGRATION_LOCK_KEY = { namespace: 19472831, resource: 6014 };

export async function runMigrations(
  connection: pg.Pool | pg.Client,
  options: MigrationRunOptions = {},
): Promise<{ applied: number; currentVersion: number }> {
  const isPool = connection instanceof PgPool;
  const client = isPool ? await (connection as pg.Pool).connect() : (connection as pg.Client);
  let inTransaction = false;

  try {
    // The tracking table must exist before we can inspect migration state. This statement is
    // intentionally outside the migration transaction because migration #1 creates the table
    // itself and therefore cannot be the prerequisite for taking the advisory lock.
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query('BEGIN');
    inTransaction = true;

    if (options.acquireAdvisoryLock) {
      await client.query(
        'SELECT pg_advisory_xact_lock($1, $2)',
        [MIGRATION_LOCK_KEY.namespace, MIGRATION_LOCK_KEY.resource],
      );
    }

    const appliedResult = await client.query<{ version: number }>(
      'SELECT version FROM schema_migrations ORDER BY version ASC'
    );
    const appliedVersions = new Set(appliedResult.rows.map((r) => r.version));

    let appliedCount = 0;
    let latestVersion = appliedResult.rows.length > 0
      ? appliedResult.rows[appliedResult.rows.length - 1].version
      : 0;

    for (const migration of MIGRATIONS) {
      if (appliedVersions.has(migration.version)) continue;

      try {
        await client.query(migration.sql);
        await client.query(
          `INSERT INTO schema_migrations (version, name, applied_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (version) DO NOTHING`,
          [migration.version, migration.name]
        );
        appliedCount++;
        latestVersion = migration.version;
      } catch (err) {
        throw new Error(
          `Migration ${migration.version} (${migration.name}) failed: ${(err as Error).message}`,
        );
      }
    }

    await client.query('COMMIT');
    inTransaction = false;
    return { applied: appliedCount, currentVersion: latestVersion };
  } catch (err) {
    if (inTransaction) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        console.error('[DATABASE] Migration rollback failed:', rollbackErr);
      }
    }
    throw err;
  } finally {
    if (isPool) (client as pg.PoolClient).release();
  }
}
