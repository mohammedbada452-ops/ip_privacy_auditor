import type pg from 'pg';

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
];

/**
 * Runs all pending database migrations sequentially inside isolated transactions.
 */
export async function runMigrations(pool: pg.Pool): Promise<{ applied: number; currentVersion: number }> {
  const client = await pool.connect();
  try {
    // 1. Ensure migrations tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Fetch applied migration versions
    const appliedResult = await client.query<{ version: number }>(
      'SELECT version FROM schema_migrations ORDER BY version ASC'
    );
    const appliedVersions = new Set(appliedResult.rows.map((r) => r.version));

    let appliedCount = 0;
    let latestVersion = appliedResult.rows.length > 0 ? appliedResult.rows[appliedResult.rows.length - 1].version : 0;

    // 3. Execute pending migrations in sequence
    for (const migration of MIGRATIONS) {
      if (!appliedVersions.has(migration.version)) {
        await client.query('BEGIN');
        try {
          await client.query(migration.sql);
          await client.query(
            'INSERT INTO schema_migrations (version, name, applied_at) VALUES ($1, $2, NOW())',
            [migration.version, migration.name]
          );
          await client.query('COMMIT');
          appliedCount++;
          latestVersion = migration.version;
        } catch (err) {
          await client.query('ROLLBACK');
          throw new Error(`Migration ${migration.version} (${migration.name}) failed: ${(err as Error).message}`);
        }
      }
    }

    return { applied: appliedCount, currentVersion: latestVersion };
  } finally {
    client.release();
  }
}
