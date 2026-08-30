# PrivaSec latency/runtime fix

## Root causes addressed

1. Cloudflare Hyperdrive does not support PostgreSQL advisory locks. The migration runner previously used `pg_advisory_lock`, which could stall Worker requests. It was removed. Migration markers now use idempotent `ON CONFLICT DO NOTHING` together with idempotent DDL.

2. The Worker previously initialized PostgreSQL for every `/api/*` route, including read-only endpoints such as `/api/ip` and `/api/ip/details`. The Worker now opens a request-scoped database client only for routes that actually require persistence, rate limiting, health checks, population insights, or admin/auth operations.

3. `/api/ip/details` now combines authoritative Cloudflare edge metadata with the real free HackMyIP provider when available. This enables explicit VPN/proxy/hosting signals without treating unknown data as negative evidence. Both lookups run in parallel and HackMyIP has a bounded 5-second timeout.

## Expected behavior

- Initial Network stage no longer waits for PostgreSQL migrations because `/api/ip` and `/api/ip/details` are database-free.
- Database-dependent audit routes still use a fresh `pg.Client` per request and the connection is closed in `finally`.
- VPN detection is real when HackMyIP returns an explicit VPN signal; otherwise the UI must show Unknown/Unavailable.
- No mock provider is enabled in production.

## Verification limits

A live Cloudflare deployment and live third-party API calls were not executed inside this offline build environment. The fixes were statically checked and packaged from the project source.
