# Comprehensive Project Review & Fix Report

Date: 2026-08-29

## Root cause of the external "site opens but no results"

The Cloudflare Worker initialized the entire Express API behind a mandatory PostgreSQL startup gate. If `HYPERDRIVE`/`DATABASE_URL` was missing, invalid, unreachable, or otherwise failed the initial `SELECT 1`, the Worker threw before creating the request handler.

That behavior was incompatible with the application's own architecture: the public `/api/ip`, `/api/headers`, and `/api/privacy/score` paths can calculate audit results without persistent storage. The frontend therefore received an available static site but could not reach the API, producing a page with no results.

### Fix applied

`worker/index.ts` now:
- starts the Express/Cloudflare handler even when PostgreSQL is temporarily unavailable;
- uses Hyperdrive's `connectionString` when present;
- runs the existing versioned migrations when the database is reachable;
- enables the shared PostgreSQL repository only after health + migrations succeed;
- exposes public audit APIs in a clearly degraded mode when persistence is unavailable;
- blocks production administrative API operations with a precise `503 PERSISTENCE_UNAVAILABLE` response until persistence is restored;
- keeps `/api/healthz` and readiness information truthful instead of reporting a false healthy state.

Cloudflare's current documentation confirms that `pg` with Hyperdrive is supported/recommended and that Hyperdrive exposes a request-scoped `connectionString`; the worker configuration pattern in this project matches that model.

## Additional defects corrected

### 1. In-memory API rate-limit fallback was effectively disabled

`DatabaseRepository.consumeApiRateLimitAsync()` created a brand-new map on every call, so every request started with an empty limiter.

Fixed by keeping bounded per-bucket timestamp state on the repository instance.

### 2. API client error parsing was brittle

`packages/api-client/src/index.ts` assumed every unsuccessful response was JSON. A proxy/runtime error page or plain-text 503 caused a JSON parse exception and obscured the real HTTP status.

Fixed to:
- inspect `Content-Type`;
- parse JSON only for JSON responses;
- preserve structured API errors;
- fall back to a concise text/HTTP error when the server returns non-JSON.

### 3. Worker migration dependency was unnecessarily carrying unused filesystem imports

`server/db/migrationRunner.ts` imported `fs` and `path` although neither was used. Those imports were removed, reducing Worker bundling/runtime surface.

## Structural checks

Passed before the dependency-install environment became incomplete:
- TypeScript root check (`tsc --noEmit`)
- Cloudflare deployment structure/route guard
- Admin metrics integrity
- Project integrity
- Relative-import existence audit

A full re-run of TypeScript/Playwright/build after the edits was blocked by the sandbox dependency installation. The first install attempt timed out, and the remaining `node_modules` was incomplete; the original project checks had passed before that environment corruption.

## External verification limitation

The supplied archive contains historical deployment documentation naming a `workers.dev` hostname, but this sandbox does not have the account credentials needed to query the Cloudflare deployment or Hyperdrive configuration. Direct network/DNS access to that hostname from the sandbox also failed.

Therefore I cannot truthfully claim that a fresh production deployment was performed from this environment.

## Deployment requirement

Because Vite treats `dist/` as generated output, the corrected source must be rebuilt before packaging a final production release:

1. install dependencies on the deployment machine with a clean `node_modules`;
2. run `npm run cf:typecheck`;
3. run the full test suite and E2E suite;
4. run `npm run build:cloudflare:auto`;
5. run `npx wrangler deploy --dry-run`;
6. deploy with the real Cloudflare credentials;
7. smoke-test:
   - `/`
   - `/browser`
   - `/headers`
   - `/api/healthz`
   - `/api/health/live`
   - `/api/health/ready`
   - `/api/ip`
   - `/api/ip/details`
   - `/api/headers`
   - `/api/privacy/score`
   - `/api/analyze/browser`

## Security observations

- No real Cloudflare token was found in the supplied project files.
- The project contains a test-only/example PostgreSQL URL in source/tests; it should remain non-production.
- Production secrets must stay in Cloudflare secret bindings and not in `wrangler.jsonc` or source control.
- The historical handoff documentation says a Cloudflare token had previously been exposed during troubleshooting; that token should be revoked/rotated if it is still active.

## Files changed

- `worker/index.ts`
- `server/db/repository.ts`
- `packages/api-client/src/index.ts`
- `server/db/migrationRunner.ts`
- `PROJECT_REVIEW_AND_FIX_REPORT.md` (this file)
