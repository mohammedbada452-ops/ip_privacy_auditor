-- Persist scan verification completeness so population intelligence only uses fully verifiable audits.
ALTER TABLE scan_sessions ADD COLUMN IF NOT EXISTS verification_status VARCHAR(16) NOT NULL DEFAULT 'COMPLETE';
CREATE INDEX IF NOT EXISTS idx_scan_sessions_verification_status ON scan_sessions(verification_status);

-- Historical rows created before verification provenance existed must not be presented as fully verified.
UPDATE scan_sessions
SET verification_status = 'PARTIAL'
WHERE network_intelligence_status <> 'VERIFIED' OR webrtc_evidence_state IN ('UNKNOWN', 'UNAVAILABLE');
