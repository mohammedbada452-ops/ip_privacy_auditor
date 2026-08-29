-- FIX 8.2: Initial PostgreSQL Schema for PrivaSec
-- Privacy-Safe Relational Persistence

-- 1. Schema Migrations Tracking Table
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Admin Users Table (Zero Plaintext Passwords)
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

-- 3. Admin Sessions Table (Hashed Tokens Only — Raw Tokens Never Stored)
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

-- 4. Scan Sessions Table (Strictly Salted HMAC Pseudonymized IP — No Raw IPs or Secrets)
CREATE TABLE IF NOT EXISTS scan_sessions (
  id VARCHAR(64) PRIMARY KEY,
  ip_hash VARCHAR(64) NOT NULL,
  country_code VARCHAR(8) NOT NULL DEFAULT 'XX',
  city VARCHAR(128) NOT NULL DEFAULT '',
  isp VARCHAR(256) NOT NULL DEFAULT '',
  is_vpn BOOLEAN,
  is_proxy BOOLEAN,
  is_tor BOOLEAN,
  is_webrtc_leak BOOLEAN,
  network_intelligence_status VARCHAR(16) NOT NULL DEFAULT 'UNAVAILABLE',
  webrtc_evidence_state VARCHAR(16) NOT NULL DEFAULT 'UNKNOWN',
  privacy_score INTEGER NOT NULL,
  score_tier VARCHAR(16) NOT NULL,
  user_agent_category VARCHAR(64) NOT NULL DEFAULT '',
  verification_status VARCHAR(16) NOT NULL DEFAULT 'COMPLETE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_sessions_created_at ON scan_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_sessions_privacy_score ON scan_sessions(privacy_score);
CREATE INDEX IF NOT EXISTS idx_scan_sessions_score_tier ON scan_sessions(score_tier);
CREATE INDEX IF NOT EXISTS idx_scan_sessions_country_code ON scan_sessions(country_code);
CREATE INDEX IF NOT EXISTS idx_scan_sessions_ip_hash ON scan_sessions(ip_hash);

-- 5. Security Logs Table (Sanitized Event Logging)
CREATE TABLE IF NOT EXISTS security_logs (
  id VARCHAR(64) PRIMARY KEY,
  event_type VARCHAR(64) NOT NULL,
  ip_address VARCHAR(64) NOT NULL,
  details TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_logs_event_type ON security_logs(event_type);

-- 6. Admin Audit Logs Table (Append-Only Operational Audit Trail)
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

-- 7. Page Views Table (Route & Language Telemetry)
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

-- 8. Performance Metrics Table (API Latency & Status Codes)
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
