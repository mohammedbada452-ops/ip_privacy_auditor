# Privacy Engine Specification: Canonical Evidence & Scoring

## 1. Authority and scope
The Privacy Engine is the single source of truth for the unified privacy score. Collectors produce observations; the engine classifies them and decides whether they contribute to the canonical score.

**Authority chain:**

`Collector -> Evidence -> Classification -> Confidence -> Score Impact -> Canonical Score -> UI/Export`

No UI component may invent or reinterpret a penalty.

## 2. Canonical collector states

The public canonical status vocabulary is:

`SUCCESS | BLOCKED | UNAVAILABLE | ERROR | NOT_RUN`

An unavailable, blocked, errored, or not-run collector never receives a negative score contribution merely because it could not be measured.

## 3. Evidence semantics

Each finding is represented by:

```ts
{
  signal,
  status,
  value,
  classification,
  severity,
  confidence,
  scoreImpact,
  evidence,
  provenance
}
```

A signal can be **Observed** without being **Scored**. Informational and fingerprinting-surface observations may therefore have `scoreImpact: 0`.

## 4. Current scoring policy

| Finding | Classification | Canonical Impact |
| :--- | :--- | ---: |
| Confirmed private/local WebRTC IP exposure | Privacy Exposure | `-20` |
| Confirmed unmasked WebGL renderer exposure | Fingerprinting Surface | `-3` |
| Canvas rendering signature observed | Fingerprinting Surface | `0` |
| AudioContext signature observed | Fingerprinting Surface | `0` |
| Public ICE candidate without confirmed correlation to origin/public egress | Fingerprinting Surface / Review | `0` |
| GPC inactive | Configuration | `0` |
| DNT inactive | Configuration | `0` |
| Standard User-Agent observed | Informational / Privacy Exposure | `0` |
| Proxy/forwarding metadata observed | Informational | `0` |
| Automation signal observed | Informational | `0` |
| Datacenter/hosting classification | Informational | `0` |
| VPN/Tor classification | Informational | `0` |

These weights are intentionally conservative. The score must not claim more certainty than the underlying evidence supports.

## 5. Privacy score

```text
Privacy Posture Score = clamp(100 + sum(confirmed negative scoreImpact), 0, 100)
```

A partial audit keeps unverified findings out of the score but reports **Evidence Coverage** and **Confidence** alongside the score.

Example:

```text
Privacy Posture Score: 97/100
Evidence Coverage: 67%
Confidence: MEDIUM
```

This does **not** mean “97% anonymous” or “97% safe”.

## 6. Classification model

Findings are separated into:

- `SECURITY`
- `PRIVACY_EXPOSURE`
- `FINGERPRINTING_SURFACE`
- `CONFIGURATION`
- `INFORMATIONAL`

User-Agent, Canvas, WebGL and AudioContext are not automatically security vulnerabilities.

## 7. Network truth

`127.0.0.1` and `::1` are `LOOPBACK / LOCAL_DEVELOPMENT` only. They are not public egress measurements and are not sent to GeoIP/ASN services.

When deployed, public egress is authoritative only when observed by the application server or an explicitly configured trusted proxy chain.

## 8. WebRTC interpretation

WebRTC is split into:

- Private/local IP candidates
- Public ICE candidates
- mDNS candidates
- Correlation with trusted server-observed egress

A public ICE candidate alone is **not** a confirmed public-IP leak.

## 9. Header scoring

HTTP Header analysis exposes two independent scores:

- `Header Privacy Exposure Score`
- `Header Security Score`

GPC/DNT are informational/configuration controls and remain zero-impact unless the scoring policy is explicitly changed and the canonical engine, UI, tests and exports are changed together.
