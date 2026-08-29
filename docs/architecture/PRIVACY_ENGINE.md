# Privacy Score Engine Architecture

**Project Name:** Privacy & Browser Intelligence Auditor  
**Module:** Privacy Score Engine (`server/privacy/`)  
**Stage:** Stage 7 (Privacy Score Engine)  
**Status:** Implemented & Verified  

---

## 1. Purpose

The Privacy Score Engine is a deterministic, explainable, and decoupled evaluation engine that computes a unified Privacy & Security Score bounded strictly between **0 and 100**.

It translates incoming network connection facts (Stage 5), HTTP header telemetry (Stage 9), and browser fingerprint signals (Stage 8) into an auditable assessment comprising:
- An overall numerical score (`privacyScore`: 0–100)
- A categorized classification tier (`tier`: `EXCELLENT`, `GOOD`, `MODERATE`, `CRITICAL`)
- An explainable human-readable summary
- Itemized active deductions with specific actionable recommendations
- Categorical score breakdown (`networkScore`, `headerScore`, `fingerprintScore`, `securityScore`)
- Full evaluation details for all registered privacy factors

---

## 2. Architecture & Pipeline

The engine enforces a strict pipeline separation:

```
INPUT (IP / Network / Headers / Fingerprint)
  ↓
FACTOR EVALUATORS (FactorRegistry)
  ↓
DETECTION & CLASSIFICATION (Severity / Status / Available)
  ↓
DEDUCTION ACCUMULATION (Bounded 0..100)
  ↓
TIER & CATEGORY BREAKDOWN COMPUTATION
  ↓
EXPLAINABILITY (Summary Generation & Actionable Recommendations)
  ↓
OUTPUT (PrivacyScoreAnalysis Contract)
```

### Core Architecture Principles
1. **Purity & Determinism**: Pure function evaluation with no hidden side effects, no `Math.random()`, no reliance on current time, and no live network calls inside the scoring core.
2. **Decoupling from Ingestion**: Network facts are fetched upstream via Stage 5 services (`geoIPService`, `ipExtractor`), and browser fingerprint signals are collected upstream via client collectors. The engine only evaluates normalized data models.
3. **Extensibility**: Factored into a modular `FactorRegistry` allowing new factors to be registered without refactoring the scoring engine.
4. **Safety with Unavailable Factors**: Future or uncollected factors are marked `UNAVAILABLE` and produce **zero deductions** (`points: 0`). An unavailable factor is never treated as a false positive penalty or silent bonus.

---

## 3. Input Model (`PrivacyEngineInput`)

The engine accepts a structured domain input object:

```typescript
export interface PrivacyEngineInput {
  ipCheck?: IpCheckResponse | null;
  ipDetails?: IpDetailsResponse | null;
  fingerprint?: BrowserFingerprintInput | null;
  customHeaders?: Record<string, string | string[] | undefined> | null;
}
```

---

## 4. Factor Model (`PrivacyFactor`)

Each evaluated factor follows a standardized schema:

| Property | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique identifier (e.g. `NET_PROXY_DETECTED`) |
| `category` | `PrivacyScoreCategory` | `NETWORK` \| `HEADERS` \| `FINGERPRINT` \| `SECURITY` \| `AUTOMATION` |
| `name` | `string` | Human-readable factor name |
| `description` | `string` | Detailed factor description |
| `status` | `PrivacyFactorStatus` | `SAFE` \| `INFO` \| `WARNING` \| `DANGER` \| `UNKNOWN` \| `UNAVAILABLE` \| `DETECTED` \| `NOT_DETECTED` |
| `severity` | `PrivacyFactorSeverity` | `info` \| `low` \| `medium` \| `high` \| `critical` |
| `points` | `number` | Score deduction (negative integer or 0) |
| `currentValue` | `primitive` | Evaluated value |
| `expectedValue` | `primitive` | Optional optimal privacy target value |
| `reason` | `string` | Clear textual explanation of the evaluated state |
| `recommendation` | `string` (opt) | Actionable advice to resolve the risk |
| `detected` | `boolean` | Whether the privacy concern was detected |
| `available` | `boolean` | Whether input data was present for this factor |
| `source` | `string` | Data origin (`ip`, `headers`, `browser`, `system`) |

---

## 5. Registered Factors & Scoring Rules

The following factors are registered in the default `FactorRegistry`:

| Factor ID | Category | Name | Condition | Points | Severity | Status when Triggered | Rule Origin |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `NET_PROXY_DETECTED` | `NETWORK` | Proxy Server Connection | `network.isProxy === true` | `-15` | `high` | `DANGER` | **REFERENCE RULE** |
| `NET_HOSTING_DATACENTER` | `NETWORK` | Public Datacenter IP | `network.isHosting === true` | `-10` | `medium` | `WARNING` | **REFERENCE RULE** |
| `NET_VPN_DETECTED` | `NETWORK` | VPN Network Cloak | `network.isVpn === true` | `0` | `info` | `INFO` | **REFERENCE RULE** |
| `NET_TOR_DETECTED` | `NETWORK` | Tor Anonymization Network | `network.isTor === true` | `0` | `info` | `SAFE` | **REFERENCE RULE** |
| `NET_MOBILE_CARRIER` | `NETWORK` | Mobile Network Carrier | `network.isMobile === true` | `0` | `info` | `INFO` | **REFERENCE RULE** |
| `NET_PRIVATE_RANGE` | `NETWORK` | Private Network Range | `ipCheck.isPrivate === true` | `0` | `info` | `INFO` | **REFERENCE RULE** |
| `HDR_PROXY_FLAGS` | `HEADERS` | Proxy Connection Headers | `hasProxyHeaders \|\| viaHeader` | `-10` | `medium` | `WARNING` | **REFERENCE RULE** |
| `HDR_SEC_GPC_SIGNAL` | `HEADERS` | Global Privacy Control | `headers.secGpc !== '1'` | `0` | `info` | `CONFIGURATION` | **INFORMATIONAL ONLY** |
| `HDR_DNT_SIGNAL` | `HEADERS` | Do Not Track | `headers.dnt !== '1'` | `0` | `info` | `INFO` | **REFERENCE RULE** |
| `HDR_USER_AGENT_DISCLOSURE` | `HEADERS` | User-Agent Exposure | `userAgent` present | `0` | `info` | `INFORMATIONAL` | **CURRENT RULE** |
| `FP_WEBRTC_LEAK` | `FINGERPRINT` | WebRTC Local IP Leak | `webRtc.localIps.length > 0` | `-20` | `critical` | `DANGER` | **REFERENCE RULE** |
| `FP_WEBGL_HARDWARE` | `FINGERPRINT` | WebGL Hardware Exposure | `webgl.renderer` unmasked | `-10` | `medium` | `WARNING` | **REFERENCE RULE** |
| `FP_CANVAS_UNIQUE` | `FINGERPRINT` | Canvas Fingerprint Unique | `canvasHash` detected | `-8` | `medium` | `WARNING` | **NEW ARCHITECTURAL DECISION** |
| `FP_AUDIO_SIGNATURE` | `FINGERPRINT` | AudioContext Signature | `audioHash` detected | `0` | `info` | `FINGERPRINTING_SURFACE` | **OBSERVED ONLY** |
| `SEC_AUTOMATION_FLAG` | `SECURITY` | Automation Driver Flag | `isAutomation === true` | `-15` | `high` | `DANGER` | **REFERENCE RULE** |

---

## 6. Score Normalization & Classification

### 6.1 Score Bounds
- Starting baseline score: `100`
- Minimum bounded score: `0`
- Maximum bounded score: `100`
- Calculation: `privacyScore = Math.max(0, Math.min(100, 100 + sum(activeDeductions)))`

### 6.2 Classification Tiers

| Score Range | Tier | Label Meaning |
| :--- | :--- | :--- |
| **85 – 100** | `EXCELLENT` | High privacy posture, minimal identifiable leakage |
| **70 – 84** | `GOOD` | Solid privacy configuration with minor informational exposure |
| **40 – 69** | `MODERATE` | Moderate tracking exposure or proxy forwarding indicators |
| **0 – 39** | `CRITICAL` | Severe privacy vulnerability (e.g. WebRTC bypass leak, automation detection) |

*Rule Origin: **REFERENCE RULE** (`PRODUCT_SPEC.md` and `DATA_SPEC.md`)*.

---

## 7. Explainability & Recommendation Generation

1. **Top Impact Explanation**: Summaries highlight the single largest point deduction factor and its magnitude, giving users an immediate root cause for their score tier.
2. **Actionable Recommendations**: Every negative factor with a deduction provides a concrete mitigation step (e.g. *"Disable WebRTC or install a WebRTC block extension"*, *"Enable Global Privacy Control (GPC) in your browser settings"*).
3. **Category Breakdowns**: Independent sub-scores (`networkScore`, `headerScore`, `fingerprintScore`, `securityScore`) allow UI consumers to visualize privacy posture across functional domains.

---

## 8. API Endpoints

### `POST /api/analyze/browser`
- **Request Body**: `AnalyzeBrowserInput` (`{ fingerprint?: BrowserFingerprintInput }`)
- **Response**: `ApiResponse<PrivacyScoreAnalysis>`
- **Behavior**: Evaluates HTTP request connection metadata + GeoIP lookup from Stage 5 + incoming browser fingerprint payload.

### `GET /api/privacy/score`
- **Response**: `ApiResponse<PrivacyScoreAnalysis>`
- **Behavior**: Fast server-side only evaluation of current connection privacy.

---

## 9. Stage 8 & 9 Integration Strategy

- **Stage 8 (Browser Intelligence)**: Client-side collectors (WebRTC, Canvas, WebGL, AudioContext, automation indicators) will serialize into `BrowserFingerprintInput` and POST to `/api/analyze/browser`. The Privacy Score Engine is already fully configured to process these factors without changes to its core.
- **Stage 9 (HTTP Header Analysis)**: Header inspection rules will populate `ipCheck.headers` and `customHeaders`.

---

## 10. Distinctions

### Reference Rules Preserved
- Base 100 deduction model.
- Tier boundaries: 85 (EXCELLENT), 70 (GOOD), 40 (MODERATE), <40 (CRITICAL).
- WebRTC Local IP Leak critical penalty (-20).
- Proxy Connection penalty (-15).
- Automation Driver detection penalty (-15).
- Datacenter/Hosting IP penalty (-10).
- WebGL GPU Disclosure penalty (-10).
- Proxy forwarding headers penalty (-10).
- Sec-GPC absence is informational and has no score impact.
- VPN, Tor, and Mobile CGNAT non-penalizing classification.

### New Architectural Decisions
- Factor registry evaluator pattern (`IFactorEvaluator` & `FactorRegistry`) to enable decoupled, modular testing and future factor registration.
- Sub-category breakdown calculations (`networkScore`, `headerScore`, `fingerprintScore`, `securityScore`).
- Standard User-Agent and Canvas/Audio fingerprinting surfaces are observed separately and do not receive a score deduction unless a confirmed, explicitly scored risk exists.

### Assumptions
- In the absence of client-supplied browser fingerprinting during Stage 7, all browser fingerprint factors evaluate safely to `available: false` with 0 deductions.
