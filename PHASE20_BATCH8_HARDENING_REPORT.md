# Phase 20 — Batch 8 Correctness & Release Configuration Hardening

## Scope
This batch targets a small set of verified remaining issues with low deployment risk. Cloudflare bindings, Wrangler configuration, database schema/migrations, authentication protocol, and deployment commands were not changed.

## Changes

1. **Remediation actor/category correctness**
   - Fixed `HTTP_HEADERS` from incorrectly mapping to `BROWSER` to the existing `HEADERS` actor/category used by the remediation UI.
   - This aligns classification with the rest of the remediation engine and the `FindingCategory` model.

2. **INP observer accuracy**
   - The maximum interaction duration is now retained across PerformanceObserver callback batches.
   - Previously, the local maximum was reset for every callback while `reportMetric()` only accepted the first report, which could permanently under-report INP when a later callback contained the true maximum interaction.

3. **README runtime prerequisite corrected**
   - Updated documentation from Node.js 20+ to the package's actual supported range: Node.js 22.x–24.x.

4. **Added `.env.example`**
   - Added a safe development configuration template covering the environment keys used by the server/runtime.
   - No real secrets are included.

5. **Regression test**
   - Added `server/tests/phase20Batch8Hardening.test.ts` and registered it in the existing `npm test` chain.

## Intentionally not changed

- HSTS `preload` was not added. The current application uses a `workers.dev` hostname; adding a preload directive without a domain/preload-list strategy would be misleading rather than a meaningful security improvement.
- The source `index.html` retains the current production hostname because `prepare-seo.mjs` already rewrites crawler metadata from `VITE_PUBLIC_ORIGIN` during the authoritative Cloudflare build. Changing the source without changing that workflow would add unnecessary release risk.
- The unused `packages/database` stub remains because path aliases and project documentation still reference it; deleting it requires a wider package-architecture cleanup.

## Validation

- `node --check` passed for release scripts.
- `package.json` JSON validation passed.
- Static source assertions for the Phase 20 targets passed.
- A standalone TypeScript invocation outside the project's configured compiler setup was not used as an acceptance gate because this extracted environment lacks the project's complete generated/node type environment.

## Deployment safety

No Cloudflare deployment settings or commands were modified. The normal acceptance path remains:

`npm clean-install` → `npm run build` → Cloudflare deployment.
