# PrivaSec — Accuracy & Canonical Scoring Repair Report

Date: 2026-08-27

## Executive result

The P0/P1 accuracy and scoring requirements were implemented in the project source. The current model now uses one canonical chain:

`Collector -> Evidence -> Classification -> Confidence -> Canonical Score Impact -> UI/Export`

The purpose of this repair was to eliminate false-safe results, duplicated penalties, and contradictions between the Overview, Browser, Headers, Network and export surfaces.

## Implemented

### Network/IP
- `127.0.0.1` and `::1` are LOOPBACK / LOCAL_DEVELOPMENT.
- Loopback is never treated as a public egress IP.
- Loopback is not sent to GeoIP/ASN lookups.
- Public egress is explicitly marked as `SERVER_OBSERVED` when directly observed by the application server.
- Forwarded client IP headers are trusted only through explicitly configured proxy trust.

### Canonical collector contract
The public normalized collector result contains:

- signal
- status
- value
- classification
- severity
- confidence
- scoreImpact
- evidence
- provenance

Allowed canonical states:

`SUCCESS | BLOCKED | UNAVAILABLE | ERROR | NOT_RUN`

### WebGL
- A successful unmasked renderer observation is a FINGERPRINTING_SURFACE finding with `-3` canonical impact.
- UNAVAILABLE/BLOCKED/ERROR produces zero score impact.
- No duplicate UI interpretation is allowed to create a second penalty.

### AudioContext
- Observed audio signature is a FINGERPRINTING_SURFACE finding with `0` score impact.
- Timeout/unavailable/error does not become `NO RISK` and does not receive a penalty.
- UI and export report observation state instead of inventing a vulnerability score.

### Canvas
- A stable canvas signature is an observed fingerprinting surface, not proof of uniqueness.
- Canvas remains unscored (`0`) until a population comparison is available.
- Missing/blocked canvas is explicitly not measured.

### WebRTC
The audit separates:

- private/local IP exposure
- public ICE candidates
- mDNS candidates
- server-egress correlation

A public ICE candidate alone is review-only and does not deduct points.
Private/local exposure is the scored privacy exposure (`-20`).

### Finding classification
Findings are separated into:

- SECURITY
- PRIVACY_EXPOSURE
- FINGERPRINTING_SURFACE
- CONFIGURATION
- INFORMATIONAL

User-Agent, WebGL, Canvas and AudioContext are not automatically treated as security vulnerabilities.

### Header scoring
Header Security Score and Header Privacy Exposure Score are independent. Informational/configuration findings are explicitly scoped as `INFORMATIONAL`.

GPC and DNT remain `0` impact when inactive unless the canonical policy is intentionally changed.

### UI/export consistency
- No default fake composite fingerprint is emitted when components are unavailable.
- Unavailable Canvas/WebGL/Audio is not presented as a detected or randomized signal.
- Browser export reports explicit collector status.
- Timeline summaries use “not measured” instead of “generic/randomized” when evidence is missing.

## Verification performed

### Static parsing
All 245 TypeScript/TSX files were transpile-parsed successfully with no syntax diagnostics.

### Strict targeted type checks
- Accuracy Core: PASS
- Header classifier/types: PASS
- IP extractor: PASS under the project-aware Express type contract

### Runtime canonical scoring scenarios
- Localhost loopback: `100`
- WebGL exposed: `97`
- WebGL unavailable: `100`
- Audio observed: `100`
- Audio timeout: `100`
- Public WebRTC candidate without confirmed leak: `100`
- Private WebRTC exposure: `80`
- WebGL exposure + private WebRTC exposure: `77`

All canonical assertions in the targeted runtime harness passed.

### Package/config integrity
- `package.json` parses successfully.
- The new header score-scope regression test is included in the project test command.
- Active canonical accuracy documentation was updated.

## Explicit release gate

The following could not honestly be marked PASS in this isolated environment:

1. Full `npm test` because the uploaded project does not contain `node_modules`.
2. Full `npm run build` for the same dependency reason.
3. Full Playwright matrix because Playwright packages/browsers are not installed here.
4. External BrowserLeaks / EFF Cover Your Tracks / IPLeak / Whoer comparison because the current project has no public deployment URL available to this audit environment.
5. Real Psiphon before/after comparison because it requires a real client connection and a deployed endpoint.

These are environment/deployment verification gates, not claims of success or failure of the repaired source.

## Canonical acceptance rule

A visible negative point must exist in the canonical score calculation. An UNKNOWN/UNAVAILABLE/BLOCKED/ERROR signal must not become SAFE, and a public WebRTC candidate must not become a confirmed leak without independent correlation.
