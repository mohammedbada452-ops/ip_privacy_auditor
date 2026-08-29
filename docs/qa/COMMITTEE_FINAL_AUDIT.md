# Committee Final Engineering Audit — PrivaSec

## Executive decision

**Source hardening status: RELEASE CANDIDATE, pending a real dependency-installed CI run and a production PostgreSQL smoke test.**

The remediation pass preserves the product concept and existing feature modules. No scanner feature, analysis engine, UI workflow, or API family was intentionally removed. Changes focus on correctness, persistence, security, privacy, operational safety, naming/document drift, and maintainability.

## Closed findings

1. PostgreSQL is now the runtime source of truth for admin identities, sessions, analytics, scan history, security logs, page views, performance metrics, and audit logs whenever PostgreSQL is active. Synchronous in-memory methods remain only as development/test compatibility paths.
2. Production startup fails closed when PostgreSQL is unavailable or critical security configuration is missing.
3. Admin sessions are persisted in PostgreSQL using hashed session tokens and are validated through the async persistence facade.
4. Admin login uses asynchronous PBKDF2 verification and 600,000 SHA-256 iterations; passwords are never trimmed before verification.
5. Production admin credentials require a valid administrator identity plus either a strong password or a secret key bound to that identity.
6. Brute-force protection is persisted in PostgreSQL with pseudonymized IP keys and transaction-level advisory locking, making login throttling effective across multiple application instances.
7. Raw client IPs are not inserted into PostgreSQL audit/security `ip_address` columns; those identifiers are HMAC-pseudonymized.
8. Authentication audit text no longer interpolates raw client IPs.
9. Trusted-proxy processing requires explicit proxy configuration in production and evaluates forwarded chains from the trusted side rather than accepting arbitrary client-supplied proxy addresses.
10. GeoIP fallback no longer downgrades to plaintext HTTP, and provider failures do not log raw IP addresses.
11. Missing GeoIP data uses `XX` rather than a fabricated US country code.
12. Production CORS and CSRF behavior is restricted to explicit/same-origin requests; malformed or cross-site administrative requests are rejected.
13. Production CSP is tightened, including removal of `unsafe-eval` and broad HTTP/WebSocket sources.
14. Production requires a 32+ character `SERVER_SECRET_SALT`.
15. Static asset requests are no longer counted as page views; only HTML page responses are recorded as page views.
16. PostgreSQL retention now removes expired sessions and old scans, telemetry, security logs, audit logs, and stale authentication rate-limit records.
17. Unused `@google/genai` was removed from runtime dependencies and the lockfile.
18. AI Studio/Google-specific runtime branding and setup instructions were removed from the application-facing README/metadata.
19. Misleading `*Placeholder` route wrapper names were replaced by explicit `*Route` names while preserving the same rendered feature components.
20. An accidental duplicate wrapper `<div>` in the admin login UI was removed.
21. The login API no longer returns a bearer session token in JSON; the client uses the HttpOnly cookie transport already implemented by the application.
22. TypeScript strictness was enabled for the project configuration.
23. A dedicated `finalHardening.test.ts` was added for proxy trust, production secret validation, and public/reserved IP classification.
24. Migration `002_auth_rate_limits` was added for distributed admin brute-force protection.
25. Administrative responses are marked `no-store`/`no-cache` to prevent sensitive dashboard data from being cached.
26. Graceful SIGTERM/SIGINT handling now drains the HTTP server and closes the PostgreSQL pool.

## Verification performed

- Runtime checks of `validateIp()` and trusted-proxy CIDR matching passed under Node 22 type-stripping execution.
- Static structure checks passed for route wrapper references and the corrected admin-login markup.
- The final source contains no runtime references to the removed Google AI Studio branding or legacy route-wrapper component names.
- The source bundle was inspected after the remediation pass for persistence call paths and raw-IP logging patterns.

## Verification limitation

The uploaded source archive did not contain `node_modules`. An attempt to install the dependency tree with npm exceeded the available execution window, so a full `npm test`, `npm run lint`, and production `npm run build` were **not** honestly certifiable from this environment.

The remaining release gate is therefore operational rather than architectural: run the complete CI/build suite with dependencies installed, then perform one smoke test against a real PostgreSQL instance with production environment variables. Any failure from that gate should be treated as a new defect, not silently ignored.
