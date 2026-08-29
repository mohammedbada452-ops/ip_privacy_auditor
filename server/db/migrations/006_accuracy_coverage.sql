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
