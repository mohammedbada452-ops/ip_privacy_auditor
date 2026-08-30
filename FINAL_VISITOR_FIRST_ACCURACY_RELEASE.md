# PrivaSec — Visitor-First Accuracy Release

## Scope
This release preserves the successful Cloudflare Worker deployment architecture and existing product features, except the Website Audit feature, which was intentionally removed from the user-facing product and production API route.

## Visitor-first homepage changes
The homepage now places the live connection identity first, before the specialist navigation:
- Active public IP address and IP version
- Country + ISO-derived flag
- City / region and approximate geolocation
- ZIP / postal code when available
- IP geolocation timezone
- Current local time in the IP geolocation timezone
- Network ISP
- Organization
- ASN organization
- ASN
- Network type when supplied by the provider
- VPN / Proxy / Tor status with explicit unavailable states
- Provider-supplied network privacy score/grade when actually returned; never presented as a global anonymity guarantee
- Provider / measurement provenance
- Browser quick view, HTTP-header quick view and evidence summary

## Network accuracy
For the current client IP, the production Worker combines:
1. Cloudflare request.cf metadata for authoritative per-request edge context.
2. HackMyIP for public IP geolocation/network/privacy intelligence.

Provider data is preferred field-by-field and Cloudflare edge metadata fills only missing values. This avoids replacing a rich provider result with a partial Cloudflare-only result.

The application does not convert missing evidence into a negative or positive assertion. VPN/Proxy/Tor remain unavailable when the provider cannot verify them.

## Free provider policy
HackMyIP remains the production keyless HTTPS provider. IPAPI is not added because its current free offering is positioned for testing/development rather than production use. IPinfo Lite remains optional when the project owner supplies a token.

## Website Audit removal
Removed from the product UI, routing, footer/tool navigation, production Worker route, and local server route registration. The rest of the application is preserved.

## Cloudflare deployment preservation
No changes to the deployment foundation:
- Worker name: `ip-privacy-auditor`
- Worker entry: `./worker/index.ts`
- Assets directory: `./dist`
- HYPERDRIVE binding preserved
- Workers Builds root: `/`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Production branch: `main`

## Validation performed in this environment
- 266 TS/TSX source files syntax-parsed successfully
- Cloudflare deployment structure guard: PASS
- Production-truth guard: PASS
- Header runtime guard: PASS
- Free-intelligence release guard: PASS
- Project-integrity guard: PASS
- Admin-metrics integrity guard: PASS
- No user-facing/production `site-audit` references remain in `src`, `worker`, `server`, or `packages/api-client`
- No `node_modules`, `dist`, `.env`, PEM/key artifacts included in the release workspace

## Not verified here
A live `npm ci`, Vite production build, Wrangler deploy, live provider calls, and live browser E2E run cannot be executed in this environment. Those must be verified by Cloudflare after upload.
