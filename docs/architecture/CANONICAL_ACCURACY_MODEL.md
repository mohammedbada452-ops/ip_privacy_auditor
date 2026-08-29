# Canonical Accuracy Model

## Authority chain

Collector execution -> normalized evidence -> finding classification -> canonical score contribution -> UI/export.

No UI component may invent a penalty, convert UNKNOWN/UNAVAILABLE to SAFE, or re-score a factor.

## Collector status

The public canonical status vocabulary is exactly:

- SUCCESS
- BLOCKED
- UNAVAILABLE
- ERROR
- NOT_RUN

Browser execution may internally distinguish TIMEOUT; the canonical result must map an unverified timeout to UNAVAILABLE or ERROR and score impact 0.

## Network truth

127.0.0.1 and ::1 are LOOPBACK/LOCAL_DEVELOPMENT. They are never sent to GeoIP/ASN and never presented as public egress. Public egress is authoritative only when observed by the server or a configured trusted ingress proxy.

## Score semantics

Observed != Scored. Fingerprinting surfaces may be observed while contributing zero points. A negative `scoreImpact` is legal only for confirmed, evidence-backed findings.

## WebRTC

Private/local candidate exposure is a confirmed privacy exposure. A public ICE candidate alone is a review signal. Correlation with server egress is required before asserting a public leak. mDNS candidates are separately reported.

## Header score

Header Security Score and Header Privacy Exposure Score are independent. Standard identity headers are not security vulnerabilities by themselves.

## GPC/DNT

GPC and DNT are informational/configuration signals in the canonical privacy score unless a future scoring policy explicitly assigns a score contribution and the same contribution is reflected in every output.
