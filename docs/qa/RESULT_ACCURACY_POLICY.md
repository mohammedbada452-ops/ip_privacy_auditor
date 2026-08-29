# Result Accuracy Policy

## Objective
All user-facing findings must distinguish observed facts, inferred signals, and unavailable evidence. A signal is never promoted to a confirmed security/privacy vulnerability without evidence that directly supports that claim.

## Scoring rules
- Missing optional privacy preferences such as Sec-GPC or DNT are informational, not vulnerabilities.
- A normal User-Agent is evidence of client identification metadata, not by itself a security defect.
- Canvas and Audio signatures demonstrate fingerprinting surface exposure; uniqueness requires comparison against a population dataset and is therefore not scored as a confirmed uniqueness finding by the current engine.
- WebGL unmasked renderer is an exposure signal and receives a modest evidence-weighted deduction.
- WebRTC private/local candidate exposure is reported as local-network address exposure. It is not described as a public-IP leak or VPN bypass unless a separate public-IP comparison proves that claim.
- Automation detection is a session/integrity finding, not a privacy-score penalty.
- Hosting, mobile, VPN, Tor and proxy classifications must come from explicit provider signals; string-based guesses must not be presented as high-confidence facts.
- Provider failures result in `Unavailable/Unknown`, never fabricated geographic/network values.
- Geographic coordinates must be syntactically valid and within legal latitude/longitude bounds before presentation.

## Confidence
Every scored factor carries an evidence confidence. High confidence is reserved for direct, deterministic observations or explicit authoritative provider fields. Medium/low confidence findings must be described accordingly.

## Repeat-visit product behavior
Repeat visits should reveal meaningful changes rather than manufacture risk: users should be able to compare score deltas, newly detected exposure, newly protected signals, and changes in provider/network/browser conditions.
