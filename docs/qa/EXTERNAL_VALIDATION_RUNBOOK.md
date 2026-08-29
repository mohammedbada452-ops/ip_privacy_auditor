# PrivaSec External Validation Runbook

## Purpose
Validate measurements from a real public deployment without treating third-party sites as an oracle for PrivaSec's internal score.

## Phase 1 — Localhost
- Open the audit on `http://localhost:<port>` without custom forwarding headers.
- Expected: `127.0.0.1` is classified as `LOOPBACK`; public IP is `NOT_MEASURED`.
- Geo/ISP/ASN must remain unavailable/not measured.
- Add `TRUST_LOCAL_PROXY=true` only when a deliberately configured local reverse proxy is part of the test.

## Phase 2 — Public deployment
Record results from PrivaSec, BrowserLeaks, Whoer, and IPLeak at the same time and network. Compare only equivalent observables:
- server-observed public IPv4/IPv6 egress
- DNS resolver observations
- WebRTC private candidates
- WebRTC public ICE candidates
- HTTP/HTTPS egress
- timezone consistency

Do not infer a leak from a public ICE candidate without correlation.

## Phase 3 — Psiphon
Run two controlled scans:
1. Psiphon OFF
2. Psiphon ON

Capture before/after:
- public IPv4
- public IPv6
- DNS
- WebRTC private candidates
- WebRTC public candidates
- HTTP/HTTPS egress

A public candidate that differs from the server-observed egress is `REVIEW`, not automatically `LEAK`. A private LAN candidate is a confirmed local-network exposure.

## Acceptance criteria
- No `UNKNOWN`, `UNAVAILABLE`, `BLOCKED`, `TIMEOUT`, or `ERROR` state is rendered as `SAFE`.
- Every displayed negative score equals a canonical `scoreImpact`.
- Informational/fingerprinting findings show zero score impact unless explicitly and canonically scored.
- A local endpoint never receives Geo/ISP/ASN enrichment from `127.0.0.1` or `::1`.
- The final score equals the sum of canonical scored deductions, bounded to 0–100.
