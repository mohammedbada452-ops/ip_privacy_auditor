# Phase 13 — Batch 1 Production Hardening

## Scope
This batch intentionally targets request isolation, brute-force/rate-limit correctness, bounded request-body handling, and administrative CSRF/cookie consistency. The deployment configuration and existing build/deploy scripts were left intact.

## Changes implemented

1. **Request-scoped environment access**
   - Replaced direct `process.env` reads in shared server/runtime code with `getRequestEnv(...)`.
   - Extended the request-scoped environment contract for `PORT`, `DATABASE_URL`, and `CORS_ALLOWED_ORIGINS`.
   - Preserved `process.env` fallback for Node/Express tests and local runtime through the central accessor.
   - Important: Cloudflare Workers now does populate `process.env` when the relevant Node compatibility behavior is enabled, so the original Mimo wording that it is simply “undefined” is outdated. The real architectural issue is that shared Worker code should not bypass the request-scoped environment abstraction.

2. **Lazy server-salt resolution**
   - `DatabaseRepository` no longer reads `SERVER_SECRET_SALT` during singleton construction.
   - The salt is resolved at anonymization time, inside the active request context.
   - Development keeps a stable generated fallback so deterministic local/test behavior is preserved.
   - `PostgresRepository` uses the same lazy resolution model.

3. **Rate-limiter memory-cap fix**
   - Removed the destructive `Map.clear()` behavior when the in-memory limiter exceeds 10,000 buckets.
   - Bucket access refreshes insertion order and only the least-recently-used bucket is evicted as a final memory guard.
   - The PostgreSQL fallback window map received the same non-destructive eviction behavior.

4. **Brute-force window correctness**
   - `recordFailedLogin()` now starts a fresh 15-minute window when the previous window has expired, instead of continuing to increment the old counter.

5. **Bounded Worker request-body reads**
   - Worker JSON/form bodies are now read through a stream reader with a byte counter.
   - When `Content-Length` is unavailable or unreliable, the reader is cancelled as soon as the configured body limit is crossed instead of first loading the entire body into memory.

6. **Administrative CSRF hardening**
   - Worker admin logout now requires a valid double-submit CSRF token from both cookie and `X-CSRF-Token`, using a timing-safe comparison.
   - Worker logout-cookie deletion now matches the production cookie attributes (`Secure`/`SameSite=Strict`/`Path=/`).
   - Express logout cookie deletion was aligned from `SameSite=Lax` to `SameSite=Strict`.

7. **IP intelligence fault isolation**
   - RDAP and reverse-DNS calls are additionally guarded at the route aggregation layer so one provider failure cannot reject the complete `Promise.all()` result.

8. **Regression tests**
   - Added a concurrent request-environment isolation test for HMAC salts.
   - Added a rate-limiter storage-cap regression test.
   - Added an expired-login-window regression test.
   - Added the new request-environment test to the canonical `npm test` script.

## Validation performed

- `git diff --check`: passed.
- TypeScript syntax/transpilation checks for all changed `.ts` files using the installed TypeScript compiler: passed.
- A full `npm test` / `npm run build:cloudflare` was **not executed successfully in this sandbox** because the uploaded project does not contain installed dependencies and the environment cannot retrieve the complete npm dependency tree; `npm ci --offline` stopped on an uncached package (`youch-core`).
- No Cloudflare deployment was attempted from this environment. Existing `wrangler.jsonc`, compatibility date, asset configuration, Hyperdrive binding, and deployment scripts were not altered.

## Deployment safety
The intended production deployment command remains unchanged:

```text
npm run build:cloudflare
npx --yes wrangler@4.125.0 deploy
```

The next verification step should be run in the project’s normal Node 22/npm 11 environment with network access, then the deployment guard and live smoke checks should be run before accepting the batch.
