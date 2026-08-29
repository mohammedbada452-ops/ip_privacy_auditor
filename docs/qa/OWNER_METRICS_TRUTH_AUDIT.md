# PrivaSec Owner Console — Metrics Truth Audit

Date: 2026-08-27
Scope: Owner/Admin dashboard metrics and presentation

## Decision

Internal integrity checks: PASS.

This audit does not claim a 100% production guarantee because the supplied archive does not contain installed dependencies or a live production PostgreSQL environment. It does establish that the dashboard code paths inspected use explicit, consistent metric definitions and do not intentionally substitute unknown/partial evidence with safe/clean values.

## Canonical metric rules

- Average Privacy Score: COMPLETE verification records only.
- Average Evidence Coverage: COMPLETE verification records only.
- Score-tier distribution: COMPLETE verification records only.
- VPN detection count: network intelligence VERIFIED + COMPLETE + is_vpn=true.
- VPN detection rate: VPN detection count / VERIFIED network checks.
- Confirmed WebRTC leak count: CONFIRMED WebRTC evidence + COMPLETE + is_webrtc_leak=true.
- WebRTC leak rate: confirmed leak count / VERIFIED WebRTC checks.
- Network verified rate: VERIFIED network checks / all stored audits.
- WebRTC verified rate: CONFIRMED or NOT_DETECTED / all stored audits.
- Unique visitors label: replaced with Unique Anonymized IPs, because HMAC IP cardinality is not a user identity metric.
- Incomplete scan rows are never shown as CLEAN; they are marked PARTIAL/UNVERIFIED.
- Event endpoints use canonical counts rather than reconstructing counts from rounded rates.
- Page-view API arrays are normalized before being consumed by the dashboard.
- Dashboard does not claim service health from audit completion percentage; the overview card is explicitly Audit Data Quality.

## Checks executed

`node scripts/verify-admin-metrics.mjs` => PASS

Modified TypeScript files passed structural delimiter validation.

## Remaining external gate

Production validation still requires the application dependencies, real PostgreSQL, and a live deployed instance. The remaining gate is environmental/runtime validation, not an intentional fallback in the metrics logic.
