# Admin Specification: System Management & Security Panel

## 1. Overview
The Admin Portal provides system administrators and security analysts with aggregate usage metrics, threat analytics, system health metrics, and audit logs. It is designed to be lightweight, secure, and isolated from public scanning interfaces.

---

## 2. Authentication & Session Management
- **Login Route**: `POST /api/admin/login`
- **Authentication Strategy**:
  - Validates username and bcrypt-hashed password stored in `admin_users` database table.
  - Upon successful authentication, issues a signed, HTTP-Only, SameSite=Strict session cookie containing a secure session ID or JWT token.
- **Protected Middleware**: `adminAuth` middleware intercepts requests to `/api/admin/*` (except login) and verifies session validity before granting access.
- **Logout Route**: `POST /api/admin/logout` invalidates session cookie.

---

## 3. Admin Features & UI Dashboard

### A. Aggregate KPI Overview
- **Total Scan Volume**: Total privacy audits executed.
- **Unique Visitor IP Count**: Count of unique anonymized IP hashes.
- **Average Privacy Score**: Overall health metric across all audited visitors.
- **VPN / Proxy Usage Rate**: Percentage of users scanning through VPN/Proxy connections.
- **WebRTC Leak Rate**: Percentage of sessions exposing local WebRTC IP leaks.

### B. GeoIP Threat & Volume Map
- Interactive tabular breakdown of top scanning countries sorted by volume and average privacy score.
- Quick filter to highlight regions with high proxy usage or severe security deductions.

### C. System Audit Logs
- Real-time event log displaying:
  - `ADMIN_LOGIN_SUCCESS`
  - `ADMIN_LOGIN_FAILED`
  - `ANOMALOUS_SCAN_RATE`
  - `DATABASE_MAINTENANCE`
- Searchable by IP, event type, or timestamp range.

---

## 4. Admin API Endpoint Summary
| Endpoint | Method | Purpose | Auth Required |
| :--- | :--- | :--- | :--- |
| `/api/admin/login` | POST | Authenticate admin credentials | No |
| `/api/admin/logout` | POST | Invalidate admin session | Yes |
| `/api/admin/stats` | GET | Fetch aggregate KPI metrics | Yes |
| `/api/admin/logs` | GET | Fetch security & audit event logs | Yes |
| `/api/admin/scans` | GET | List paginated scan sessions (anonymized) | Yes |
