# External Validation Checklist

Run only after deploying the exact release candidate over HTTPS. Record timestamps, test region, browser/version, VPN/proxy mode and raw evidence references.

## Baseline

1. Run the audit without Psiphon. Record server-observed public IPv4/IPv6, DNS, WebRTC candidates, Canvas, WebGL and Audio.
2. Repeat with Psiphon disabled/enabled.
3. Compare against BrowserLeaks, EFF Cover Your Tracks, IPLeak and Whoer.
4. Treat differences as correlation evidence, not automatic leaks.

## Required assertions

- Localhost: 127.0.0.1 / ::1 = LOOPBACK and Public IP = NOT MEASURED.
- Hosted deployment: Public IP source = SERVER_OBSERVED or TRUSTED_PROXY_CHAIN.
- Geo/ASN is absent for loopback/private addresses.
- WebGL UNAVAILABLE/BLOCKED/ERROR yields score impact 0.
- Audio TIMEOUT/UNAVAILABLE/ERROR yields score impact 0.
- Public WebRTC candidate without private candidate does not create a leak finding.
- Header Security Score is independent of Header Privacy Exposure Score.
- GPC/DNT do not show negative points when their canonical score impact is 0.
- Final score equals 100 + sum(confirmed negative canonical score impacts), bounded to [0,100].
- Every displayed negative point equals a canonical negative scoreImpact.
