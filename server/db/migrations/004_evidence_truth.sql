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
