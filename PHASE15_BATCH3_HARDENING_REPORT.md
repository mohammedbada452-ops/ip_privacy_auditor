# Phase 15 — Batch 3 Production Hardening

## Scope
This batch targets a small set of production correctness, security-policy, database lifecycle, and localization issues that remained after the successfully deployed Phase 14 build.

Deployment configuration, Wrangler settings, Hyperdrive binding, database schema, and build commands were intentionally left unchanged.

## Changes implemented

1. **Production CSP `connect-src` tightened and unified**
   - Express production CSP no longer permits arbitrary `https:` connections.
   - Worker CSP now matches with `connect-src 'self' wss:`.
   - The frontend uses same-origin API requests; the application does not need browser-side arbitrary HTTPS connections for the audited flows.

2. **PostgreSQL initialization failure now cleans up an owned pool**
   - `initializeDatabase()` records whether it created a new pool.
   - If health checks, migrations, or production bootstrap fail, an owned pool is closed before returning.
   - A pool that pre-existed this initialization call is never closed by this cleanup path.
   - This removes a connection/resource leak after failed startup initialization without altering successful startup behavior.

3. **Removed per-request dynamic import from `PrivacyService`**
   - `dbRepository` is now a static module import.
   - Persistence no longer pays a dynamic-module-resolution step for every privacy evaluation.
   - Runtime behavior and the existing request-scoped repository mechanism remain unchanged.

4. **Centralized session-token hashing**
   - `PostgresRepository` now reuses the canonical `hashSessionToken()` exported from `server/db/postgres.ts` instead of maintaining a duplicate implementation.
   - This reduces divergence risk between database authentication paths.

5. **Arabic-aware plural category support**
   - The i18n plural helper now uses `Intl.PluralRules` for the active language.
   - Optional `two`, `few`, and `many` forms are supported while existing `zero`, `one`, and `other` callers remain compatible.
   - Arabic and other languages can now express language-appropriate categories without breaking existing translation objects.

6. **Localized Learn route title moved into translation dictionaries**
   - Added `nav.learn` to all six supported locale dictionaries.
   - Removed the hard-coded per-language label table from route logic.
   - Route titles now consistently flow through the same i18n source as the rest of navigation.

7. **ScoreLabel hardened against non-finite input**
   - `NaN`/infinite values are normalized to `0` before display and color classification.
   - Prevents broken UI output such as `NaN/100`.

8. **Score verification status made explicitly live to assistive technology**
   - Added `aria-live="polite"` and `aria-atomic="true"` to the dynamic status indicators in `PrivacyScoreHero`.

## Validation performed in this environment

- Confirmed the generated patch contains only the intended files/changes.
- Confirmed there is one canonical `hashSessionToken()` implementation after the refactor.
- Confirmed all six locale dictionaries contain `nav.learn`.
- Confirmed production Express and Worker CSP `connect-src` directives are aligned.
- Confirmed the dynamic import in `PrivacyService` was removed.
- Attempted dependency installation for a complete build/typecheck, but the sandbox could not retrieve the uncached `youch-core` package from npm. A complete Cloudflare build therefore was not claimed from this environment.
- Global TypeScript was also unable to run the project's worker typecheck because the extracted tree lacks the generated `worker-configuration.d.ts` and installed `@types/node` package.

## Deployment safety

No Cloudflare deployment settings or build commands were changed. The acceptance path remains the existing:

```text
npm clean-install
npm run build
```

followed by the normal Cloudflare deployment and live smoke checks.

## Recommended live checks after deployment

- Open `/headers` and verify the page loads normally.
- Open `/` and `/learn` in each supported language and confirm the Learn navigation label changes correctly.
- Run the privacy score and browser analysis flows.
- Sign in to the admin area and verify session/CSRF behavior remains unchanged.
- Confirm no browser console errors are introduced by the stricter CSP.
