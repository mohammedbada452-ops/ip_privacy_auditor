# Phase 16 — Batch 4 UI reliability and accessibility hardening

## Scope
This batch is intentionally limited to low-risk client correctness/accessibility fixes. Cloudflare deployment settings, Worker routing, database bindings, CSP, migrations, API contracts, and build commands were not changed.

## Changes

1. **Admin Security Logs tab refresh bug fixed**
   - The tab id is `securityLogs`, while the data refresh effect previously checked `logs`.
   - Filter/page changes while viewing Security Logs could therefore fail to trigger a refresh.
   - The condition now matches the actual tab id.

2. **Admin raw selects made accessible**
   - Added localized accessible labels to the scan-tier and security-event filters.
   - Existing visible labels and behavior are unchanged.

3. **Unified Problem Center search input labeled**
   - Added an explicit `aria-label` so the input remains understandable to assistive technology even though it uses placeholder-driven UI.

4. **CopyValue timer lifecycle fixed**
   - The copy feedback timeout is tracked and cleared before replacement and on component unmount.
   - Prevents delayed state updates after a component has left the page and avoids stacked timers from repeated clicks.

5. **Design System demo timers cleaned up**
   - Demo refresh and feedback timers are tracked in refs and cleared on unmount/retrigger.
   - No production application behavior is changed; this hardens the development/showcase route.

## Validation

- Source-level regression checks: PASS
- Confirmed the Security Logs tab uses its real tab identifier.
- Confirmed both admin filter label keys exist in the locale dictionaries.
- Confirmed timer refs and cleanup paths are present.
- Confirmed Problem Center search has an accessible label.

## Not claimed here

A dependency-backed `npm run build` / Cloudflare deployment was not executed in this sandbox. The existing Cloudflare build commands and deployment configuration were left untouched, so the required acceptance step remains the normal Cloudflare build/deploy pipeline.
