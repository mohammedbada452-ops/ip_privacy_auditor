# Administrator Credential Management & Production Security Architecture

## 1. Overview & Architecture

The Privacy Auditor administrator console (`/admin`, `/admin/dashboard`) protects operational telemetry, rate-limiting audit logs, and anonymized scan session records. This document establishes the production security guidelines, environment configuration standards, cryptographic guarantees, and operator credential rotation procedures.

---

## 2. Environment Variables & Secret Configuration

Production environments configure administrative access exclusively via secure Environment Secrets in **the deployment environment / secrets manager**.

| Environment Variable | Requirement Level | Allowed Characters & Length | Description |
| :--- | :--- | :--- | :--- |
| `ADMIN_USERNAME` | Production: Required (unless Master Secret used) | `3 - 64` chars; `[a-zA-Z0-9._\-@]`, **No whitespace** | Primary administrator username identity. |
| `ADMIN_PASSWORD` | Production: Required (unless Master Secret used) | `8 - 128` chars; Non-default, high-entropy passphrase | Initial bootstrap password plaintext (hashed immediately upon ingestion). |
| `ADMIN_SECRET_KEY` | Optional (Production Emergency / Superadmin) | `16 - 128` chars; Cryptographic secret token | Master Secret bypass for emergency recovery or break-glass access. |

### Documented Example (`.env.example`)
```env
# ============================================================
# ADMINISTRATOR AUTHENTICATION & SECRETS (GOOGLE AI STUDIO SECRETS)
# ============================================================
ADMIN_USERNAME=<set-in-deployment-secrets>
ADMIN_PASSWORD=<set-in-deployment-secrets>
ADMIN_SECRET_KEY=<optional-production-secret>
```

> **Security Rule:** Plaintext credentials and secrets **MUST NEVER** be committed to source code repositories, embedded in test scripts, rendered on client bundles, or logged to console/files.

---

## 3. Cryptographic Implementation & Hashing Standard

- **Algorithm:** PBKDF2 (Password-Based Key Derivation Function 2)
- **HMAC Digest:** SHA-256 (`crypto.pbkdf2Sync(..., 'sha256')`)
- **Iteration Count:** `600,000` iterations
- **Key Output Length:** 32 bytes (256-bit hash, represented as 64 hexadecimal characters)
- **Cryptographic Salt:** Per-user unique 16-byte random salt generated via `crypto.randomBytes(16).toString('hex')` (32 hex characters)
- **Constant-Time Verification:** Password and Master Secret comparisons execute strictly using `crypto.timingSafeEqual()` on equal-length binary buffers to eliminate side-channel timing attack vectors.

---

## 4. Production Bootstrap Lifecycle

```
Server Ingress / Startup
        │
        ▼
Read ADMIN_USERNAME & ADMIN_PASSWORD from Environment
        │
        ├── Validate username constraints (No whitespace, 3-64 chars, safe regex)
        ├── Validate password constraints (Min 8 chars, reject default/weak list)
        │
        ▼
Compute PBKDF2 Hash (600,000 iters) with 16-byte cryptographically random salt
        │
        ▼
Store ONLY (username, passwordHash, salt) in Repository
(Plaintext password is immediately discarded from memory)
        │
        ▼
Purge legacy default seeded accounts (e.g., 'admin') if custom identity is specified
```

- **Re-evaluation on Restart:** On process restart, the server checks if the configured password hash in memory matches the environment. If identical, existing user metadata is maintained without destructive wipes.
- **Production Guard:** In `NODE_ENV === 'production'`, the server strictly prohibits default credentials (`admin/admin`, `admin/password`, etc.). If credentials are missing, administrator authentication endpoints reject logins and report clear administrative configuration requirements without leaking sensitive values.

---

## 5. Master Secret Key (`ADMIN_SECRET_KEY`)

`ADMIN_SECRET_KEY` provides a break-glass / emergency authentication mechanism:
- **Role:** Assigns the `superadmin` role with identifier `usr_secret_master`.
- **Timing-Safe Evaluation:** Compares submitted key against configured secret using `crypto.timingSafeEqual()`.
- **Rate-Limiting & Auditing:** Master secret attempts are strictly rate-limited under the same 5-attempt per-IP lockout rules and recorded in security/audit logs.

---

## 6. Operator Credential Rotation & Session Invalidation

To rotate administrator credentials in production:

1. **Update Secret in the deployment environment / secrets manager:**
   - Update `ADMIN_PASSWORD` with the new high-entropy passphrase.
2. **Deploy / Restart Application Container:**
   - On container startup, `DatabaseRepository.bootstrapAdminCredentials()` detects the updated credentials, derives a new random salt, and updates the stored PBKDF2 hash.
3. **Automatic Session Invalidation:**
   - All pre-existing active admin sessions (`activeSessions`) for that username are immediately revoked.
   - All subsequent requests with old session tokens receive `401 Unauthorized`.
4. **Log In with New Credentials:**
   - Operators log in at `/admin` using the new passphrase.
   - Old passphrase submissions are strictly rejected (`INVALID_CREDENTIALS`).

---

## 7. Brute-Force Rate Limiting & Session Hardening

- **Rate Limit Window:** 5 consecutive failed login attempts per client IP triggers an automatic **15-minute lockout** (`blockedUntil`).
- **Response Status:** HTTP `429 Too Many Requests` with `retryAfterSeconds` indicator.
- **Session Duration:** 24 hours (`expiresAt = Date.now() + 24 * 60 * 60 * 1000`).
- **Session Revocation:** Calling `POST /api/admin/logout` immediately deletes the session token from memory and logs an audit record.
- **Token Ingress:** Supports `Authorization: Bearer <token>` and `x-admin-token` headers.

---

## 8. Database Independence

Admin authentication operates securely in-memory using cryptographically salted PBKDF2 hashes and active token tracking. It does not require PostgreSQL or external database provisioning for standard operation. If durable cloud SQL storage is configured in the future via `DATABASE_URL`, identical PBKDF2 password hashes and audit records will map directly to the persistent relational schema.
