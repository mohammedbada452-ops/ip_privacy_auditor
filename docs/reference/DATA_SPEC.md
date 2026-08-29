# Data Specification: Database & Data Models

## 1. Overview & Storage Strategy
The application stores aggregate analytics, audit logs, and administrator credentials to power the Admin Dashboard while strictly respecting user privacy. In accordance with privacy-by-design principles:
- **No Raw IP Addresses are permanently stored** in the scan analytics table. IPs are anonymized using standard one-way SHA-256 salted hashing or truncated (e.g., `203.0.113.xxx`).
- Scan records only contain anonymized aggregate data (Country, Privacy Score, VPN Flag, WebRTC Leak Flag).

---

## 2. Relational Database Schema

```sql
-- Table 1: Admin Users (For Admin Panel Authentication)
CREATE TABLE admin_users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- Table 2: Scan Sessions (Anonymized Aggregate Scan Data)
CREATE TABLE scan_sessions (
    id VARCHAR(36) PRIMARY KEY,
    ip_hash VARCHAR(64) NOT NULL,            -- SHA-256 salted hash of client IP
    country_code VARCHAR(2),                  -- ISO 3166-1 alpha-2 (e.g., 'US', 'SA')
    city VARCHAR(128),
    isp VARCHAR(128),
    is_vpn BOOLEAN DEFAULT FALSE,
    is_proxy BOOLEAN DEFAULT FALSE,
    is_tor BOOLEAN DEFAULT FALSE,
    is_webrtc_leak BOOLEAN DEFAULT FALSE,
    privacy_score INTEGER NOT NULL,          -- 0 to 100
    score_tier VARCHAR(16) NOT NULL,          -- 'CRITICAL', 'MODERATE', 'GOOD', 'EXCELLENT'
    user_agent_category VARCHAR(64),         -- e.g., 'Chrome/Desktop', 'Safari/Mobile'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table 3: Security & Anomaly Audit Logs
CREATE TABLE security_logs (
    id VARCHAR(36) PRIMARY KEY,
    event_type VARCHAR(64) NOT NULL,         -- 'ADMIN_LOGIN_SUCCESS', 'ADMIN_LOGIN_FAILED', 'RATE_LIMIT_EXCEEDED'
    ip_address VARCHAR(45) NOT NULL,         -- Logged for security audit purposes
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast analytical queries
CREATE INDEX idx_scan_sessions_created_at ON scan_sessions(created_at);
CREATE INDEX idx_scan_sessions_country ON scan_sessions(country_code);
CREATE INDEX idx_scan_sessions_score ON scan_sessions(privacy_score);
CREATE INDEX idx_security_logs_event_type ON security_logs(event_type);
```

---

## 3. TypeScript Interface Definitions

```typescript
// Shared Types for Database Records & Domain Entities

export interface AdminUser {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
  lastLogin?: string;
}

export interface ScanSessionRecord {
  id: string;
  ipHash: string;
  countryCode: string;
  city: string;
  isp: string;
  isVpn: boolean;
  isProxy: boolean;
  isTor: boolean;
  isWebRtcLeak: boolean;
  privacyScore: number;
  scoreTier: 'CRITICAL' | 'MODERATE' | 'GOOD' | 'EXCELLENT';
  userAgentCategory: string;
  createdAt: string;
}

export interface SecurityLogRecord {
  id: string;
  eventType: string;
  ipAddress: string;
  details: string;
  createdAt: string;
}

export interface SystemAnalyticsSummary {
  totalScans: number;
  uniqueIpsCount: number;
  averagePrivacyScore: number;
  vpnDetectionRate: number;
  webRtcLeakRate: number;
  topCountries: Array<{ countryCode: string; count: number }>;
  recentScans: Array<Omit<ScanSessionRecord, 'ipHash'>>;
}
```

---

## 4. Data Retention & Privacy Compliance
- **Scan Session Data Retention**: Scan records in `scan_sessions` automatically expire or can be truncated after 30 days.
- **Ip Anonymization Formula**:
  `ipHash = HMAC-SHA256(clientIp, SERVER_SECRET_SALT)`
- **GDPR & Privacy Compliance**: Users can request single-session non-persistence by selecting a "Do Not Store Analytics" mode in the client UI.
