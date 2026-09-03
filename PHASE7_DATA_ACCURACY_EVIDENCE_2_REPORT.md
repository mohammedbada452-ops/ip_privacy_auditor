# PrivaSec Privacy Auditor — Phase 7 Data Accuracy & Evidence 2.0

Date: 2026-09-03

## Objective
Strengthen IP/GeoIP result accuracy so the application distinguishes observed data from consensus, represents conflicts explicitly, and never upgrades a single provider into unsupported high-confidence evidence.

## Research basis
The current HackMyIP API documentation states that its lookup endpoint accepts IPv4/IPv6 and returns country code, approximate coordinates, timezone, postal code, ASN, ISP and explicit privacy signals including VPN/datacenter/residential. It also states the API is free for personal and commercial use with reasonable request volume. Source: HackMyIP API, https://hackmyip.com/api (accessed 2026-09-03).

IPinfo's March 19, 2026 documentation confirms that IPinfo Lite is the current free API, requires a token, provides country/continent/ASN, supports commercial use for free with attribution, and does not provide city, coordinates, hostname or timezone. Source: IPinfo Support, https://support.ipinfo.io/hc/en-us/articles/34121895556242-Legacy-Free-API-vs-IPinfo-Lite (updated 2026-03-19).

MaxMind documents that IP geolocation is inherently approximate and that city/state/postal precision varies by network type and geography; it recommends falling back to less-specific data when more specific geolocation is not sufficiently reliable. Source: MaxMind Support, https://support.maxmind.com/knowledge-base/articles/maxmind-geolocation-accuracy (accessed 2026-09-03).

Cloudflare documents request.cf as Worker-specific request metadata and its IP geolocation facilities as visitor-location metadata. This is useful as a corroborating edge observation, but the project does not treat it as proof of VPN usage. Sources: https://developers.cloudflare.com/workers/runtime-apis/request/ and https://developers.cloudflare.com/network/ip-geolocation/ (accessed 2026-09-03).

OWASP API Security guidance recommends validation of third-party data, bounded resource processing, timeouts, and careful handling of external API responses. Sources: https://owasp.org/API-Security/editions/2023/en/0x11-t10/ and https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/ (accessed 2026-09-03).

## Implemented

### 1. Evidence-quality semantics
Added `server/providers/geoip/accuracy.ts` with field-level evidence quality values:
- HIGH — independent verified observations agree.
- MEDIUM — a verified source exists but independent corroboration is absent or incomplete.
- LOW — independent verified observations conflict.
- UNKNOWN — no usable evidence is available.

These values are explicitly evidence quality, not statistical probabilities or geolocation accuracy percentages.

### 2. Provider observations now carry granular fields
Provider observations can now include country, ASN, region, city, postal code and timezone. This allows future comparison at field level instead of treating an entire provider result as either globally correct or globally wrong.

### 3. Conflict-aware consensus
The GeoIP service now exposes country/ASN agreement metadata and conflict flags. A conflicting provider result is not silently overwritten. The primary result remains available while the API communicates disagreement.

### 4. Cloudflare edge corroboration
For the current client request only, the Worker-provided Cloudflare edge observation is included as an independent corroborating observation when the internal bridge is active. It is not used for arbitrary target-IP lookups and is not treated as evidence of VPN/proxy/Tor by itself.

### 5. IPinfo Lite used only for its actual data coverage
IPinfo Lite remains optional and token-gated. It is used as a country/ASN corroboration source and is not expected to provide city, postal code or timezone data because its documented Lite response does not include those fields.

### 6. UI truthfulness
The geographic intelligence card now shows a compact localized evidence-quality indicator without presenting the value as a probability. Raw evidence values remain intact and the existing conflict/observation area is preserved.

### 7. Existing scoring preserved
The canonical Privacy Score formula was not changed in this phase. Geo evidence quality is a trust/presentation layer and does not manufacture or remove score deductions.

## Additional repair discovered during validation
The localization type layer contained structural issues from earlier phases that could prevent a clean TypeScript pass:
- `signalState` had been placed at the wrong level in all six locale dictionaries.
- `geoSourceConflict`, `informationalCount`, and `webrtcNoPublicCandidates` were present or required without complete type synchronization.
- Several duplicated UI keys existed in locale objects.

These were corrected without changing translated wording semantics. The localization verifier now reports 989 string keys across all six languages.

## Verification
PASS:
- Phase 7 geo evidence verifier
- Phase 5 SEO verifier
- Phase 2 vocabulary/evidence verifier
- Localization structure — 989 string keys × 6 languages
- Project integrity
- Production truth
- Free intelligence release
- Country flag release
- Admin metrics integrity
- Phase 4 API trust hardening
- Runtime helper test for HIGH/MEDIUM/LOW/UNKNOWN and material conflicts

A dependency-backed production build and full E2E suite were not claimed because the execution environment does not contain the project's full installed dependency tree. Targeted TypeScript diagnostics showed no remaining structural locale errors or phase-7 syntax errors; unresolved diagnostics are dependency/environment related.

## Accuracy policy now enforced
1. Unknown remains unknown.
2. Unavailable remains unavailable.
3. A single provider does not become HIGH-confidence consensus.
4. Independent agreement can raise evidence quality.
5. Independent disagreement lowers evidence quality.
6. Provider geography remains approximate and does not establish a person's physical location.
7. VPN/proxy/Tor are never inferred from ISP names or geographic mismatch alone.
8. Optional enrichment failure does not fabricate a result or alter the canonical score.

## Provider decision
Keep HackMyIP as the default free primary provider because its current public documentation covers the fields required by PrivaSec and states free commercial use with reasonable request volume. Keep IPinfo Lite as optional corroboration where a free token is intentionally configured. Do not introduce a lower-quality or less-compatible free provider merely to increase provider count.

## Remaining work for the 95/100 target
The next high-impact phase should address performance and observability, followed by full runtime E2E verification. A final 95/100 rating should only be awarded after the application passes dependency-backed build, E2E, and live production checks.
