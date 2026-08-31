# Admin Production Authentication & Security Architecture

## 1. Overview & Architectural Principles

The **PrivaSec Administrator Subsystem** provides a zero-compromise, defense-in-depth administrative console designed to meet enterprise security and privacy standards.

### Core Security Tenets
1. **Zero Hardcoded Production Credentials**: No default passwords or static admin secrets exist in source code or production database seeds.
2. **Server-Authoritative Identity**: The server is the sole source of truth for administrative sessions.
3. **No Client-Side Token Storage**: Browser JavaScript has zero access to session secrets. `localStorage`, `sessionStorage`, `IndexedDB`, and URL query parameters are strictly forbidden from storing admin tokens.
4. **Transport Security**: Sessions are maintained exclusively via `HttpOnly`, `Secure` (in production), `SameSite=Strict` cookies.
5. **Cryptographic Rigor**: Passwords are saved solely as PBKDF2 hashes (600,000 iterations, SHA-256) with unique per-user 16-byte random salts. Verification employs constant-time buffer comparison to neutralize timing attacks.
6. **Active Defenses**: Multi-layered protection against brute-force attacks (rate limiting with exponential cooldown) and CSRF (SameSite cookies + Fetch Metadata validation).

---

## 2. Environment Configuration

Administrator access in production is configured strictly via environment variables:

| Environment Variable | Requirement | Description |
|---|---|---|
| `ADMIN_USERNAME` | Production Required | Username (3–64 characters, alphanumeric, `.`, `_`, `-`, `@`). |
| `ADMIN_PASSWORD` | Production Required | Bootstrap password (minimum 8 characters in production). Weak defaults (e.g. `admin`, `password123`) are rejected at startup. |
| `ADMIN_SECRET_KEY` | Optional | High-entropy emergency master secret key (minimum 16 characters). |
| `SECURITY_PEPPER` / `SERVER_SALT` | Optional | Server-wide cryptographic pepper for IP HMAC anonymization. |

### Bootstrap Lifecycle
1. On startup or first admin authentication attempt, `AdminAuthService` reads `ADMIN_USERNAME` and `ADMIN_PASSWORD`.
2. Credentials undergo structural validation and weak-password rejection.
3. The plain password is immediately hashed with a unique 16-byte random salt using PBKDF2 (600,000 iterations).
4. The hashed record is stored in memory/database. **Plaintext passwords are never retained or logged**.
5. Server restarts are **idempotent**: re-evaluating the same bootstrap credentials will not invalidate active sessions or overwrite hashes.

---

## 3. Session Transport & Cookie Security

### Cookie Specification
- **Name**: `privasec_admin_session`
- **Value**: Cryptographically random 256-bit hexadecimal session token.
- **HttpOnly**: `true` (Inaccessible to `document.cookie` or client-side scripts).
- **Secure**: `true` when `NODE_ENV === 'production'` (HTTPS only).
- **SameSite**: `lax` (Blocks cross-site state-changing request cookie submission).
- **Path**: `/`
- **Max-Age**: `86400` seconds (24 hours, synchronized with server session expiration).

### API Contract
- `POST /api/admin/auth/login`: Validates credentials, creates server session, sets `privasec_admin_session` HttpOnly cookie.
- `GET /api/admin/auth/session`: Validates cookie or bearer token, returns `{ authenticated: true, username, expiresAt }`.
- `POST /api/admin/auth/logout`: Invalidates server session and clears `privasec_admin_session` cookie.

---

## 4. CSRF & Cross-Site Defenses

To safeguard cookie-based authentication, all state-changing endpoints (`POST`, `PUT`, `PATCH`, `DELETE`) pass through `adminCsrfGuard`:
1. **Fetch Metadata (`Sec-Fetch-Site`)**: Rejects requests where `Sec-Fetch-Site === 'cross-site'` with `403 CSRF_BLOCKED`.
2. **Origin & Referer Validation**: Validates that request `Origin` matches the server `Host` header.
3. **SameSite Cookie Enforcement**: Modern browsers omit the session cookie during cross-site form posts.

---

## 5. Threat Mitigation Matrix

| Threat Vector | Mitigation Strategy |
|---|---|
| **XSS Token Theft** | `HttpOnly` cookies ensure tokens cannot be accessed by malicious scripts or injected DOM payloads. |
| **CSRF Attacks** | `SameSite=Strict` cookies, Fetch Metadata (`Sec-Fetch-Site`) validation, and same-origin host verification. |
| **Credential Stuffing / Brute-Force** | IP-level exponential rate limiter blocking client after 5 consecutive failures. |
| **Timing Attacks** | `crypto.timingSafeEqual` constant-time comparison for password hashes and secret keys. |
| **Server Restart Session Loss** | Non-destructive bootstrap idempotency preserves existing sessions and credentials. |
| **Information Leakage** | Sanitized responses, data minimization in audit logs, salted HMAC IP anonymization. |

---

## 6. Verification & Automated Testing

Automated verification is executed via the comprehensive security test suites:
```bash
# Run complete test suite including FIX 8.1
npm test

# Run FIX 8.1 dedicated security invariants suite
npx tsx server/tests/fix8_1AdminSecurity.test.ts
```
