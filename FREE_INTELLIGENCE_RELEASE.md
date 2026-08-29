# Free Intelligence Release

This release adds optional/free enrichment without changing the canonical Privacy Score engine or removing any existing service.

## Included now

- RDAP registration enrichment for public IPs via `rdap.org` routing to authoritative RDAP services.
- Reverse DNS (PTR) lookup via Cloudflare DNS-over-HTTPS (`cloudflare-dns.com/dns-query`), no API key required.
- IPinfo Lite as an optional Geo/ASN fallback. Set `IPINFO_TOKEN` in Cloudflare Worker secrets/environment. IPinfo Lite is currently free with unlimited authenticated country-level geolocation and basic ASN requests; public use requires attribution.
- Existing AbuseIPDB reputation integration remains optional and isolated from the canonical Privacy Score.

## Failure policy

All enrichment is best-effort. If an external provider is unavailable, the application returns an explicit unavailable/error state and keeps existing audit results intact.

## Cloudflare settings

Secrets/variables are server-side only. Never put `IPINFO_TOKEN` or `ABUSEIPDB_API_KEY` in frontend code or GitHub source.

## Deliberately deferred

Paid IP intelligence, commercial fingerprinting, large threat feeds, and services with restrictive commercial/API terms are intentionally left for a later phase.
