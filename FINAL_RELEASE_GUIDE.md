# PrivaSec Privacy Auditor — Final Production Release

## Production truth policy
This release never intentionally fabricates live IP, GeoIP, DNS, RDAP, reputation, browser, or fingerprint observations. When a signal is unavailable, unsupported, blocked, or not provable from the available evidence, the application reports `UNKNOWN`, `UNAVAILABLE`, or `NOT MEASURED` instead of substituting a guessed value.

Test/demo fixtures remain isolated under test/development code paths. Mock GeoIP is blocked outside test/development.

## Cloudflare Workers Builds
Configure the Worker build as follows:

- Root directory: `/`
- Build command: `npm run build:cloudflare`
- Deploy command: `npx --yes wrangler@4.125.0 deploy`
- Do not add `bun install --frozen-lockfile`.
- Do not add a custom Wrangler `build.command` because Cloudflare Workers Builds already owns the build step.

The build creates `dist/`, verifies it, performs Wrangler type generation/type checking, and only then runs the deploy command.

## Required production configuration
Set these as Cloudflare Worker secrets/variables, not in GitHub:

- `SERVER_SECRET_SALT`: required in production; use at least 32 random characters.
- `ADMIN_USERNAME` + `ADMIN_PASSWORD`, or `ADMIN_USERNAME` + a sufficiently strong `ADMIN_SECRET_KEY`, for production admin bootstrap.
- `ABUSEIPDB_API_KEY`: optional; enables external IP reputation checks.
- `IPINFO_TOKEN`: optional; enables IPinfo Lite country/basic ASN fallback.

`HYPERDRIVE` is configured by the Worker binding in `wrangler.jsonc` and must point to the intended PostgreSQL Hyperdrive configuration in the Cloudflare account.

## Free production intelligence
The default GeoIP provider is HackMyIP over HTTPS. The current client request is first enriched from Cloudflare's request metadata when available; public target IPs can use the external GeoIP provider. RDAP and reverse DNS are independent auxiliary checks. AbuseIPDB and IPinfo Lite remain optional and do not silently alter the canonical Privacy Score.

## Deployment acceptance
A production deployment is accepted only when:

1. dependency installation succeeds with the committed `package-lock.json`;
2. the build produces a non-empty `dist/`;
3. Wrangler deploy completes without recursive custom-build output;
4. `/api/healthz` reports the actual runtime/persistence state;
5. `/api/ip` returns the observed client IP for the request;
6. public-IP enrichment shows a real provider or an explicit unavailable state;
7. browser signals show measured/unknown states honestly;
8. admin/persistence features are disabled with explicit `503` when PostgreSQL is genuinely unavailable.
