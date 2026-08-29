# Design System Documentation: Privacy & Browser Intelligence Auditor

## 1. Overview & Philosophy
The **Privacy & Browser Intelligence Auditor** design system provides a cohesive, high-contrast Dark Canvas UI tailored for cybersecurity tools, network diagnostic apps, and privacy signal inspection.

- **Theme**: High-Contrast Dark Canvas (`#0B0F17`)
- **Card Containers**: Deep Slate (`#0F172A` / `#1E293B`) with 1px border (`#334155`)
- **Primary Accent**: Electric Cyan (`#06B6D4` / `#38BDF8`)
- **Status Colors**:
  - Emerald (`#10B981` / `#34D399`) for Safe / Passed Tiers
  - Amber (`#F59E0B` / `#FBBF24`) for Warning / Medium Risk
  - Crimson (`#EF4444` / `#F87171`) for Danger / High Risk
  - Cyan (`#06B6D4` / `#38BDF8`) for Info / Neutral

---

## 2. Design Tokens (`/src/tokens/index.ts`)

### Color System
- `background.main`: `#0B0F17` (Deep Canvas)
- `background.alt`: `#0F172A` (Secondary Background)
- `surface.card`: `#1E293B` (Standard Surface)
- `border.default`: `#334155` (Subtle 1px divider)
- `text.primary`: `#F8FAFC` (900 Contrast Headings)
- `text.secondary`: `#94A3B8` (Body Text)
- `text.muted`: `#64748B` (Subtext & Muted Labels)

### Radii & Spacing
- Standard Card Radius: `12px` (`rounded-xl`)
- Button / Input Radius: `8px` (`rounded-lg`)
- Badge Radius: `6px` (`rounded-md`)

---

## 3. Typography Hierarchy
1. **Headings**: Primary Sans-serif (`font-sans` - Inter/System)
2. **Technical Values**: Monospace (`font-mono` - JetBrains Mono / Fira Code) for IP addresses, HTTP headers, hashes, fingerprints, and ASN numbers.
3. **Labels**: Upper-case monospace captions with tracking (`text-[10px] font-mono tracking-widest text-slate-400`).

---

## 4. Reusable UI Components Index (`/src/components/ui.ts`)

### Layout
- `PageContainer`: Constrained grid wrapper (`sm`, `md`, `lg`, `xl`, `2xl`, `7xl`, `full`).
- `Section`: Section container with optional title, subtitle, and action slots.
- `Stack`: Flex container supporting gap, direction, align, and justify.
- `Grid`: Responsive CSS grid supporting mobile to desktop columns.
- `Divider`: Horizontal or vertical rule with optional labeled center text.

### Surfaces
- `Card`: Primary surface component.
  - Variants: `standard`, `compact`, `highlighted`, `warning`, `success`, `danger`, `data`.
  - Subcomponents: `CardHeader`, `CardBody`, `CardFooter`.

### Status & Feedback
- `Badge`: Semantic badge (`neutral`, `success`, `warning`, `danger`, `info`, `unknown`, `unavailable`, `detected`, `not-detected`).
- `StatusBadge`: Specialized badge with semantic indicator dot and text fallback.
- `StatusIndicator`: Animated pulsing LED status light.
- `SeverityBadge`: Risk level badge (`critical`, `high`, `medium`, `low`, `info`).
- `Skeleton`: Content loading wireframe element.
- `LoadingState`: Spinner or skeleton loading feedback wrapper.
- `ErrorState`: Full card or compact inline error feedback view.
- `EmptyState`: Dotted container with icon and call-to-action button for empty data.
- `InlineError`: Micro validation error label.

### Actions & Form Controls
- `Button`: Standard button (`primary`, `secondary`, `outline`, `ghost`, `danger`) with loading spinner and icon support.
- `IconButton`: Accessible icon button.
- `RefreshButton`: Specialized scan refresh button with spinner state.
- `Input`: Text/number/mono input with error feedback and icon slots.
- `Select`: Dropdown selection box with label and error state.
- `Checkbox`: Checkbox control with title and description.
- `Toggle`: Accessible toggle switch component.

### Data & Technical Display
- `CodeValue`: Scrollable inline or block code badge.
- `MonoValue`: Color-coded monospace text wrapper.
- `CopyValue`: Interactive copy-to-clipboard widget with checkmark feedback.

### Privacy-Specific Primitives
- `ScoreGauge`: Radial score arc/meter (0–100) with color transitions (80-100 green, 50-79 amber, 0-49 crimson) and tier classification.
- `ScoreLabel`: Inline numeric score badge.
- `FactorStatus`: Signal factor item (`pass`, `warn`, `fail`, `info`) with score deduction pill.
- `RiskIndicator`: Combined risk severity badge and deduction label.
- `Recommendation`: Remediation action item card.

---

## 5. Responsive Design Rules
- Mobile (`< 640px`): Single column layout, touch-friendly min button height (`40px`), scrollable horizontal navigation bar.
- Tablet (`640px - 1024px`): 2-column grid system.
- Desktop (`> 1024px`): 3-column Bento grid with sticky navigation bar.

---

## 6. Accessibility Baseline
- High text contrast passing WCAG AA on dark canvas.
- Keyboard navigation focus rings (`outline: 2px solid #06b6d4`).
- All icon-only buttons include mandatory `aria-label` and `title` attributes.
- Score gauge includes explicit `aria-label` with fallback text.
