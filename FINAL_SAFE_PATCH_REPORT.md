# Privasec Privacy Auditor — Safe Patch Report

## Scope
Surgical, non-destructive corrections only. Existing application architecture, providers, public routes, audit features, dark-only design, scoring/UI structure, and Cloudflare deployment configuration were preserved.

## Corrected
- Preserved WebGL `isUnmasked` evidence through browser fingerprint normalization so the canonical scoring engine can receive the same evidence observed by the Browser view.
- Reframed generic reverse-proxy infrastructure wording so generic forwarding headers no longer claim Google Cloud Run.
- Removed DNT, Upgrade-Insecure-Requests, and Sec-CH-UA from the "missing recommended headers" list; Sec-GPC remains the optional privacy preference signal.
- Reclassified trusted reverse-proxy infrastructure as informational rather than "Protected" when no privacy protection is actually demonstrated.
- Added network-geolocation source-conflict presentation using existing provider observations; this distinguishes provider/edge network location from physical location without changing provider values.
- Localized the modified IP/network/admin surfaces across the existing six-language dictionaries while keeping technical identifiers and machine values unchanged.
- Added a standalone, owner-controlled PostgreSQL admin credential reset utility; it does not change public audit behavior, providers, routes, or deployment architecture.
- Added focused regression tests for the corrections above.

## Deliberately not changed
- React + Vite frontend architecture.
- Express/Node backend architecture.
- Cloudflare Worker + Static Assets deployment.
- Hyperdrive/PostgreSQL/Supabase integration.
- Existing IP intelligence providers.
- Existing audit pages and specialist views.
- Existing visual identity and dark theme.
- Existing correct measurements and raw technical values.
- Existing public API contract except where the corrected evidence already flows through it.

## Validation performed
- JavaScript syntax check for the admin reset utility: PASS.
- `package.json` JSON parse: PASS.
- TypeScript/TSX syntax/transpile validation of modified files using the installed TypeScript compiler API: PASS.
- Repository scan for active production Cloud Run hard-code: PASS (none outside tests/backups; backups removed).
- Repository scan confirming `isUnmasked` is preserved in the sanitizer: PASS.
- Repository scan confirming only Sec-GPC remains in the missing-header registry: PASS.

## Test limitation
The project dependencies were not available initially. Attempts to install with `npm ci --no-audit --no-fund` timed out in the execution environment, so the full Jest/tsx test suite and a real production build could not be executed here. This report does not claim those suites passed.

## Admin access recovery
Use `scripts/reset-admin-credentials.mjs` with a valid owner-controlled PostgreSQL `DATABASE_URL`. The utility creates/updates an active admin account using PBKDF2 with a random salt and invalidates existing sessions for the target account. It never prints or stores the plaintext password.
