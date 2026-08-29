# UI Specification: Privacy & Browser Intelligence Auditor

## 1. Visual System & Design Rules

### A. Theme Philosophy
The UI follows a modern **High-Contrast Dark Canvas** visual theme, reflecting a professional cybersecurity tool aesthetic (inspired by modern developer tooling, security scanners, and network diagnostics).

- **Primary Canvas Background**: Deep Charcoal / Slate `#0B0F17` / `#0F172A`.
- **Surface / Card Container**: `#1E293B` with subtle 1px border (`#334155`).
- **Primary Accent / Brand Color**: Electric Cyan `#06B6D4` / `#38BDF8`.
- **Success / Safe Tiers**: Emerald Green `#10B981` / `#34D399`.
- **Warning / Medium Risk**: Amber `#F59E0B` / `#FBBF24`.
- **Danger / High Risk**: Crimson `#EF4444` / `#F87171`.
- **Neutral Text**:
  - Primary Headlines: `#F8FAFC` (900/50).
  - Body Text: `#94A3B8` (400).
  - Muted Labels / Captions: `#64748B` (500).

### B. Typography & Font Pairing
- **Primary Sans Font**: Inter or System Sans-serif (`font-sans`).
- **Monospace Code/Data Font**: JetBrains Mono or Fira Code (`font-mono`) for IP addresses, HTTP header keys/values, hashes, and ASN numbers.
- **Arabic Font**: Cairo or Tajawal (`font-arabic` / Noto Sans Arabic) to ensure crisp legibility for Arabic text.

---

## 2. Component Hierarchy & Layout Structure

### Header & Navigation Bar
- **App Logo & Title**: "Privacy & Browser Intelligence Auditor" with security shield icon.
- **Live Status Pill**: Displays user's detected IP address and country flag icon in real time.
- **Navigation Tabs**:
  1. `Overview` (Main Dashboard with Score, IP, & Quick Alerts)
  2. `Network & IP` (Detailed GeoIP, ISP, ASN, Proxy/VPN checks)
  3. `Browser Signals` (Fingerprints, WebGL, Canvas, Audio, Hardware)
  4. `HTTP Headers` (Header inspector & security health)
  5. `Admin` (System analytics & access logs)
- **Language Switcher**: Toggle button (`EN` / `العربية`).

---

## 3. Core Component Specifications

### A. Animated Privacy Score Gauge
- **Type**: Circular Radial Progress Ring or Arc Meter with central numeric display (0 to 100).
- **Color Transitions**:
  - `80 - 100`: Emerald Green (`#10B981`)
  - `50 - 79`: Amber / Yellow (`#F59E0B`)
  - `0 - 49`: Red / Crimson (`#EF4444`)
- **Center Details**: Big bold score number, tier classification badge (e.g., "Excellent Verified Posture", "Moderate Exposure", "Severe Exposure"), and subtext indicating total deductions.

### B. Metric & Signal Cards
- **Structure**:
  - Card Header: Icon + Title + Status Pill (e.g., `[PROTECTED]`, `[EXPOSED]`, `[WARNING]`).
  - Card Body: Key-Value pairs with monospace values, copy-to-clipboard buttons, and explanatory tooltip popovers.
- **Border Radius**: 12px (`rounded-xl`).
- **Padding**: 20px (`p-5`).

### C. Risk Level Badges
- **Success Badge**: `bg-emerald-500/10 text-emerald-400 border border-emerald-500/20`
- **Warning Badge**: `bg-amber-500/10 text-amber-400 border border-amber-500/20`
- **Danger Badge**: `bg-red-500/10 text-red-400 border border-red-500/20`
- **Info / Neutral Badge**: `bg-cyan-500/10 text-cyan-400 border border-cyan-500/20`

### D. Header Inspector Table
- **Columns**: Header Name | Received Value | Privacy Assessment | Impact (-pts)
- **Interactive Feature**: Filter by category (Identity, Security, Proxy, All).
- **Copy Action**: One-click copy of header dump as JSON or HTTP request format.

---

## 4. Responsive Breakpoints & Adaptability
- **Mobile (`< 640px`)**: Single-column vertical layout. Navigation converts to horizontal scrolling pills or compact menu. Gauge resizes gracefully to fit 280px width.
- **Tablet (`640px - 1024px`)**: 2-column grid for metrics cards.
- **Desktop (`> 1024px`)**: 3-column / Bento-grid dashboard layout with fixed sidebar or top nav.

---

## 5. RTL (Arabic) Styling Rules
- Container elements use `dir="rtl"`.
- Text alignments shift from `text-left` to `text-right` (or `text-start`/`text-end`).
- Flex direction for icon-text pairs aligns icons to the right side of the label.
- Numeric values (IPs, Port numbers, Score metrics, Hashes) remain left-to-right (`dir="ltr" inline`) for global technical clarity.
### Accuracy display rule

The UI must display the canonical engine result without recalculating it locally. The primary label is **Privacy Posture Score**, accompanied by **Evidence Coverage** and **Confidence**.

Do not use “High Anonymity”, “97% anonymous”, or equivalent language that implies the score is a probability or complete anonymity guarantee.

For every finding, the UI should distinguish:

- Observed
- Scored
- Informational
- Unverified / unavailable

A displayed negative point value must match the factor's canonical `scoreImpact` and the final score calculation.
