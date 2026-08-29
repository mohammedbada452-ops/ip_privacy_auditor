# PrivaSec Canonical Accuracy Core

## Non-negotiable rule
The UI never invents a score. Every score shown to a user must come from the same canonical evidence-to-score pipeline.

`Collector -> Evidence -> Classification -> Confidence -> Scored/Unscored -> scoreImpact -> Canonical Score -> UI`

## Collector states
Collectors use explicit states: `SUCCESS`, `BLOCKED`, `UNAVAILABLE`, `ERROR`, `TIMEOUT` (where applicable), and `NOT_RUN` at the presentation/integration layer.

`UNAVAILABLE`, `BLOCKED`, `ERROR`, and `TIMEOUT` are never equivalent to `NOT_DETECTED` and never receive a safety reward.

## IP semantics
- `127.0.0.1` / `::1` = `LOOPBACK` and never a public egress measurement.
- Private, link-local, CGNAT, documentation, and reserved addresses are not enriched as public geo/ISP/ASN.
- Public egress in production comes from the trusted server-observed client path.
- Forwarded headers are trusted only from explicitly configured proxy networks.

## Fingerprinting semantics
Canvas, WebGL, AudioContext, User-Agent and related signals are fingerprinting/observational surfaces unless a separate confirmed security/privacy exposure exists. Their presence does not prove uniqueness.

## WebRTC semantics
The following are separate observations:
- private/local ICE candidate exposure
- public ICE candidate presence
- mDNS candidate presence
- correlation between a public ICE candidate and server-observed egress

A public ICE candidate alone is `REVIEW`, not a confirmed leak.

## Scoring
A finding may be:
- `Observed`: evidence was successfully obtained.
- `Scored`: the canonical engine assigned non-zero score impact.
- `Informational`: observed but intentionally contributes `0`.

For every factor:
- `scoreImpact === points` only when scored.
- `scoreImpact === 0` when not scored.
- every displayed negative number must exist as a canonical negative score factor.

## Category separation
Findings are classified into `SECURITY`, `PRIVACY_EXPOSURE`, `FINGERPRINTING_SURFACE`, `CONFIGURATION`, or `INFORMATIONAL`.

Header subsystem scores are separate from the global privacy score: `headerSecurityScore` measures only explicitly security-scoped request-header findings; `headerPrivacyExposureScore` measures privacy-exposure findings. GPC/DNT are configuration signals with zero score impact in the current calibration.

## Verification
A partial audit may still have a useful score, but the UI must show verification coverage and confidence and must not describe the result as proof of complete safety or anonymity.
