# PrivaSec Translation & Result Presentation Policy

## Goal
Provide complete multilingual UI coverage without altering measurement semantics, evidence, raw values, or canonical scoring.

## Translate
- Page titles, subtitles, navigation, buttons, labels, filters, empty/loading/error states.
- Result explanations: what was observed, why it matters, confidence, severity, classification, remediation guidance, coverage, and score impact.
- Status words and categories: Detected, Not detected, Unknown, Unavailable, Blocked, Fingerprinting Surface, Security Vulnerability, Privacy Exposure, Informational, Configuration.
- Accessibility text such as aria-labels, tooltips, and dialog labels.
- Admin and design-system explanatory copy.

## Keep technical values stable
Do not localize or rewrite measured evidence values that have technical meaning:
- IP addresses, IPv4/IPv6 literals, hostnames, ASN identifiers, HTTP header names and raw/sanitized values.
- Protocols and standards such as HTTP, HTTPS, DNS, WebRTC, WebGL, Canvas, STUN, mDNS, DNT, GPC, TLS, HSTS, CSP.
- Browser/OS identifiers, User-Agent strings, renderer names, hashes/digests, telemetry codes, event identifiers, and enum values in exported technical data.
- Raw JSON and wire-format exports.

## Score integrity
Translation must never change:
- collector status
- evidence provenance
- classification
- severity
- confidence
- scoreImpact
- canonical score

The UI may translate the *label* for a scoreImpact, but the numeric value is sourced from the same canonical result object.

## Result wording
Use precise distinctions:
- `UNKNOWN` / `UNAVAILABLE` => not measured or not verifiable; never translate as safe.
- `PUBLIC ICE CANDIDATE` => observable candidate; not a confirmed leak without correlation.
- fingerprinting surfaces => privacy/fingerprinting exposure, not automatically a security vulnerability.
- GPC/DNT => informational/configuration unless explicitly scored by the canonical engine.
