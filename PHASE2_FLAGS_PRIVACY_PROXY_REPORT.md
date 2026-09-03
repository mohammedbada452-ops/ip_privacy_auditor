# PrivaSec Phase 2 — Flags & Third-Party Privacy Hardening

## Scope
- Keep flags only in the IP Location card.
- No SVG flags.
- No emoji flags.
- Remove direct browser requests to third-party flag hosts.
- Keep the real ISO country-code driven behavior.

## Implementation
`CountryFlag.tsx` now uses a same-origin `/api/flag/{iso2}` URL.
The Cloudflare Worker validates the 2-letter ISO code, fetches the approved PNG server-side, and caches the response at the Cloudflare edge.

This means the visitor browser does not connect directly to the flag provider. The provider is contacted by the Worker, not by the user's browser.

## Important accuracy note
The PNG artwork is still sourced from FlagCDN/Flagpedia on the Worker side for this release because the execution environment could not retrieve the Hampus Borgos PNG archive as local binary assets. This release therefore solves the browser privacy/network exposure problem without inventing or generating flag artwork. A future fully self-hosted local-PNG package can replace the upstream fetch without changing the UI contract.

## Verification
- Country flag release verification: PASS
- Cloudflare deployment guard: PASS
- Production truth: PASS
- Free intelligence release: PASS
- Admin metrics integrity: PASS

## No changes
No changes were made to scoring logic, provider logic, database schema, Hyperdrive configuration, deployment bindings, language selector behavior, WebRTC logic, Network presentation, or Footer layout.
