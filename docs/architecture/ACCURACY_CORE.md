# Accuracy Core

## Canonical rules

1. `UNKNOWN` and `UNAVAILABLE` are never treated as `NOT_DETECTED`/safe evidence.
2. A public IP seen by the site's own server is an observation of the connection reaching that server; it is not by itself a leak.
3. `127.0.0.1` / loopback is never labeled as a public egress address. In local development it is explicitly scoped as LOOPBACK.
4. Proxy/VPN/Tor/hosting classification is context unless an independent signal establishes a privacy exposure.
5. WebRTC public ICE candidates are a review signal until correlated with an independently observed egress address.
6. Canvas/WebGL/Audio indicate fingerprinting surface; they do not prove uniqueness without population comparison.
7. Score deductions come only from confirmed findings and are the single source for every displayed score impact.
8. Coverage is reported separately from score. Incomplete verification never becomes a claim of complete safety.
9. Client browser observations remain client-observed evidence and are excluded from population statistics unless explicitly validated.
10. Every user-visible claim must have a corresponding factor/evidence record.

## WebRTC verifier privacy
WebRTC collection must use operator-configured STUN endpoints (`VITE_PRIVASEC_STUN_SERVERS`) and must not silently use third-party STUN infrastructure. Public candidates are REVIEW until correlated with an independent server-observed egress IP.
