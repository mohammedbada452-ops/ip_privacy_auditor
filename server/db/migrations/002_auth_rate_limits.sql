-- Distributed admin-login brute-force protection
CREATE TABLE IF NOT EXISTS auth_rate_limits (
  ip_hash VARCHAR(64) PRIMARY KEY,
  failure_count INTEGER NOT NULL DEFAULT 0,
  first_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  blocked_until TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_blocked_until ON auth_rate_limits(blocked_until);
