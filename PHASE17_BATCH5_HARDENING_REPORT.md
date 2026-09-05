# Phase 17 — Batch 5 API input-boundary hardening

## Scope
This batch focuses on request-boundary hardening for admin pagination/search and the in-memory degraded API rate-limit fallback. Cloudflare bindings, Wrangler configuration, database schema/migrations, authentication flow, and frontend behavior were not changed.

## Changes

1. **Worker admin pagination is bounded**
   - Added shared parsing for positive integer query parameters.
   - `page` is capped at 100,000 and `limit` at 100.
   - Prevents hostile values such as negative, NaN, or extremely large pagination inputs from reaching database pagination calculations.

2. **Worker admin search is bounded**
   - Search terms are trimmed and capped at 200 characters.
   - Applies to scans, security logs, and audit-log queries.
   - Preserves normal search behavior while bounding attacker-controlled input size.

3. **Express admin pagination/search matches Worker bounds**
   - The Node/Express implementation now uses the same page/limit/search bounds.
   - Prevents environment-specific differences where a request is safe on Worker but unbounded on Express.

4. **Degraded API rate-limit fallback purges stale buckets before the hard cap**
   - When the in-memory fallback reaches high cardinality, expired buckets are purged before LRU eviction.
   - Active clients therefore retain their rate-limit history during high-cardinality bursts instead of being displaced by unrelated stale entries.

## Validation

- Static source sanity checks: PASS
- JavaScript syntax checks for release/deployment scripts: PASS
- Added `server/tests/phase17Batch5Hardening.test.ts` covering presence of the new bounds and fallback purge logic.

## Cloudflare build

A dependency-complete Cloudflare `npm run build` was not executed in this sandbox. The repository's existing `build:cloudflare` pipeline and Wrangler configuration were intentionally left unchanged. Final acceptance remains the normal Cloudflare build/deployment pipeline.
