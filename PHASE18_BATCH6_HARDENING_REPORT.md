# Phase 18 — Batch 6 Release Hygiene & React Effect Hardening

## Scope
Low-risk correctness and release-hygiene fixes only. Cloudflare bindings, Wrangler configuration, database schema, authentication protocol, API routes, and deployment commands were not changed.

## Changes
1. Re-enabled `npm audit` by removing the project-level `.npmrc` `audit=false` setting. Dependency vulnerability checks should not be disabled by default.
2. Fixed the payload validator section numbering from duplicate `5. Screen` to `6. Screen`.
3. Removed the non-standard `direction-reverse` utility from `LoadingState`; the spinner remains an ordinary CSS `animate-spin` indicator.
4. Added `skipToMain` to the shared `Translations.common` TypeScript contract; locale files already provide the key.
5. Fixed stale React effect dependencies in `AdminDashboard`:
   - memoized `refreshAll` with `useCallback`;
   - tracked `refreshAll` from the authentication effect;
   - tracked `scansSearch` and the fetch callbacks in the active-tab effect so changing search/filter state cannot leave stale data visible.
6. Wrapped `refreshAll` cleanup in `try/finally` so loading state is restored even when one fetch rejects.

## Validation
- Source-level assertions: PASS.
- Deployment/release script syntax checks: PASS (`node --check` on `prepare-seo.mjs` and `verify-build-output.mjs`).
- A full dependency-complete Cloudflare build was not executed in this sandbox; acceptance remains the project's normal Cloudflare pipeline.

## Deployment safety
No changes were made to `wrangler.jsonc`, Hyperdrive, database schema/migrations, Cloudflare build command, or deploy command.
