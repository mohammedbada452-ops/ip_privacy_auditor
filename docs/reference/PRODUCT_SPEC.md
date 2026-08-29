# Product Specification: Privacy & Browser Intelligence Auditor

## 1. Executive Summary
The **Privacy & Browser Intelligence Auditor** is a comprehensive, full-stack web application designed to evaluate a user's online anonymity, browser fingerprint uniqueness, network exposure, and HTTP header privacy posture. It acts as an authoritative diagnostic suite that tests and visualizes how websites, trackers, and ad networks perceive a visitor's browser and network environment.

By combining real-time server-side IP/header analysis with client-side browser API extraction, the platform generates a normalized **Privacy Score (0–100)**, details explicit privacy vulnerabilities, and provides actionable recommendations to reduce digital footprint.

---

## 2. Target Audience & Personas
1. **Privacy-Conscious Individuals & Security Researchers**: Users seeking to verify if their VPN, proxy, Tor browser, or anti-fingerprinting extensions are functioning correctly and preventing IP/identity leaks.
2. **Developers & QA Engineers**: Web professionals auditing HTTP headers, client hints, CORS headers, user-agent parsing, and client API disclosures.
3. **General Web Users**: Individuals who want an accessible, visual, and localized (English/Arabic) overview of what information their web browser leaks to visited websites.

---

## 3. End-to-End User Journeys

### Journey 1: Automated Privacy & IP Scan (Public Visitor)
1. **Landing & Initialization**: The user accesses the application. On page load, the backend immediately inspects the incoming TCP connection and HTTP headers to detect client IP, proxy indicators, location, and header health.
2. **Client-Side Data Collection**: The browser asynchronously executes non-blocking client intelligence gatherers (Canvas rendering, WebGL renderer extraction, WebRTC leak test, AudioContext sampling, screen/hardware metrics).
3. **Engine Evaluation**: Collected browser signals are posted to `/api/analyze/browser`. The Privacy Engine cross-references network facts with browser fingerprint uniqueness and calculates the overall **Privacy Score**.
4. **Visual Diagnostic Dashboard**: The user views an interactive, high-contrast dashboard featuring:
   - Animated **Privacy Score Gauge** (0–100 with color-coded risk tiering).
   - **IP & Network Profile** (IP address, ISP, Country/City, ASN, VPN/Proxy/Hosting flag).
   - **Browser Fingerprint Uniqueness Card** (Canvas hash, WebGL hardware model, Audio hash, Screen geometry).
   - **HTTP Header Inspector** (Inspected headers, missing security/privacy headers like Sec-GPC or DNT).
   - **Actionable Recommendations** (Prioritized list of fixes to improve privacy).

### Journey 2: Detailed Header & Risk Audit
1. User clicks the **HTTP Headers** tab.
2. Views raw and parsed request headers grouped into functional categories:
   - *Identity & User Agent*: `User-Agent`, `Sec-CH-UA`, `Sec-CH-UA-Platform`.
   - *Privacy & Tracking Controls*: `Sec-GPC` (Global Privacy Control), `DNT` (Do Not Track).
   - *Network & Proxy Headers*: `X-Forwarded-For`, `Via`, `CF-Connecting-IP`, `X-Real-IP`.
   - *Security & Connection*: `Accept-Language`, `Accept-Encoding`, `Upgrade-Insecure-Requests`.
3. Each header displays a privacy assessment tag (e.g., "Leaks OS details", "Privacy control active", "Proxy detected").

### Journey 3: Language & RTL Switching (Arabic / English)
1. The user clicks the language toggle in the header navigation (English `EN` <-> Arabic `AR`).
2. The UI instantly transforms:
   - Direction flips to `rtl` for Arabic, mirroring layout containers, sidebars, and grid alignments.
   - Typography shifts to localized Arabic typography supporting proper line heights and glyph rendering.
   - All text strings, risk severity badges, score descriptions, and metric labels update dynamically without page refresh.

### Journey 4: Administrator Audit & Analytics
1. The admin navigates to `/admin` or opens the Admin panel.
2. Enters credentials (authenticated against secure backend handler).
3. Views aggregate usage statistics: total scans performed, breakdown of detected VPN/Proxy usage, average privacy score, top visitor regions, and recent security logs.

---

## 4. Information Architecture

| Category | Source | Stored in DB | Computed Where | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Client IP Address** | Server (TCP/Headers) | Anonymized / Hashed | Server | GeoIP lookup, Proxy/VPN detection |
| **GeoIP Location** | External Provider | No | Server | Display country, city, ISP, ASN, coordinates |
| **HTTP Request Headers** | Server (`req.headers`) | No | Server | Header privacy audit, Client Hint analysis |
| **Canvas Fingerprint** | Client (HTML5 Canvas API) | Session Hash Only | Client & Server | Measure browser render uniqueness |
| **WebGL Renderer Info** | Client (WebGL Extension) | No | Client | Hardware GPU identification |
| **AudioContext Fingerprint**| Client (Web Audio API) | Session Hash Only | Client & Server | Audio hardware DSP signature |
| **Hardware & Display** | Client (`navigator`, `screen`) | No | Client | CPU cores, RAM, screen geometry |
| **WebRTC Local IPs** | Client (`RTCPeerConnection`)| No | Client | Detect VPN bypass / local IP leak |
| **Privacy Score** | Calculation Engine | Optional Aggregate | Server | Overall security metric (0–100) |

---

## 5. Core Operational Concepts

### A. Privacy Score (0–100)
- **100**: Maximum privacy. Cloaked IP (privacy-focused VPN/Tor), no WebRTC leak, active Sec-GPC, anti-fingerprinting protection enabled.
- **70–99**: Good privacy. Minor fingerprint disclosure or default header leaks.
- **40–69**: Moderate exposure. Direct residential/cellular IP exposed, WebGL GPU disclosed, standard trackable Canvas fingerprint.
- **0–39**: Severe privacy risk. WebRTC local IP leak detected, active automation flags, public hosting IP, explicit header leaks.

### B. Anonymity Index
Measures the difficulty for ad networks or trackers to correlate cross-site activity back to a single device based on network level cloak + browser fingerprint obfuscation.

### C. Browser Fingerprint Uniqueness
The statistical probability that the combined tuple `(Canvas Hash, WebGL Renderer, Audio Hash, Screen Res, Timezone, Installed Fonts)` identifies a single device among millions.

---

## 6. Internationalization & RTL Specifications
- **Supported Languages**: English (`en`, LTR), Arabic (`ar`, RTL).
- **Direction Handling**: Toggling language sets `dir="rtl"` on `<html>` or main root wrapper, applying CSS layout flips (`flex-row-reverse`, localized text alignment, icon mirroring where applicable).
- **Formatters**: Localized date, time, and numerical formatting according to selected locale.
