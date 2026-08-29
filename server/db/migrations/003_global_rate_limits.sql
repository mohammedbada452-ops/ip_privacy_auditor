-- Distributed request rate limiting and auth buckets
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
