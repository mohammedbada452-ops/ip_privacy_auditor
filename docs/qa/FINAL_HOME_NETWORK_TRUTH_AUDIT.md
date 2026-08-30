# Final Home Network Truth Audit

## Scope
This release corrects the homepage network identity presentation and removes known semantic contradictions without changing the Cloudflare deployment architecture.

## Correctness changes
- Public IP display now prefers the verified `/api/ip/details` address and falls back to the authoritative `/api/ip` value.
- Public country codes from HackMyIP are treated as ISO 3166-1 alpha-2 codes and converted to a human-readable English country name with `Intl.DisplayNames`; no country is hard-coded from a test IP.
- A flag is derived only from a validated two-letter country code.
- ISP, organization, and ASN are displayed from provider-observed network data, with `Unavailable`/`Not assigned` when the provider did not return a value.
- VPN, proxy, and Tor statuses are displayed as detected / not detected / unavailable. No absence of evidence is converted into a positive claim.
- Cloudflare infrastructure forwarding headers are classified as trusted infrastructure when the request carries the Worker-authenticated observed-IP marker. User VPN/proxy detection remains a separate IP-intelligence signal.
- Browser composite fingerprint generation now uses the actual normalized fingerprint payload / hardware hash fields rather than assuming the wrong nested data shape.
- The browser overview no longer counts mDNS or Canvas/WebGL masking as GPC/DNT controls; the `privacyProtectionsActive` metric now means explicit GPC/DNT controls only.
- Privacy score copy clarifies that the score is based on score-eligible evidence and is not a global guarantee of privacy.

## Deployment safety
The Worker entry point and Hyperdrive architecture are unchanged. No database binding, deployment command, Worker name, or Cloudflare asset path was removed.

## Validation
- Full TypeScript parser sweep: 272 TS/TSX files, 0 parse errors.
- No live build/deploy was performed in this environment because the project dependency installation requires network access.
