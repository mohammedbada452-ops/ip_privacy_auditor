# Accuracy Implementation Acceptance

## P0

- 127.0.0.1 and ::1 are LOOPBACK / LOCAL_DEVELOPMENT.
- Localhost never calls GeoIP/ASN and never presents loopback as public IP.
- Public egress is marked SERVER_OBSERVED when directly observed by the application server.
- Trusted proxy input is accepted only from explicitly configured trusted infrastructure.

## Canonical evidence

Every scored factor is normalized through the PrivacyEngine to:
`signal`, `status`, `value`, `classification`, `severity`, `confidence`, `scoreImpact`, `evidence`, `provenance`.

## Scoring invariants

- Negative score impact requires CONFIRMED evidence.
- UNKNOWN, UNAVAILABLE, BLOCKED and ERROR do not receive negative score impact.
- Observed fingerprinting surfaces may have score impact 0.
- UI deductions must come from `analysis.deductions` or the factor's canonical `scoreImpact`.
- Final score = clamp(100 + sum(canonical negative scoreImpact), 0, 100).

## Classification

Security Vulnerability, Privacy Exposure, Fingerprinting Surface, Configuration and Informational are distinct classifications.

## WebRTC

Private/local candidate exposure can be scored. Public ICE candidates are review-only unless independently correlated with a trusted egress measurement. mDNS candidates are displayed separately.

## Headers

Header Security Score and Header Privacy Exposure Score are independent. GPC/DNT are informational with 0 points unless the scoring policy explicitly changes.
