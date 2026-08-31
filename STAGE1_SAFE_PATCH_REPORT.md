# Privasec Stage 1 Safe Patch Report

## Scope
This patch applies only Stage 1 trust/evidence corrections to the supplied working production snapshot.

## Changes
1. WebRTC `PROTECTED` presentation now requires explicit positive mDNS protection evidence (`mdnsProtectionConfirmed === true`) in the home protection views.
2. The canonical WebRTC factor keeps the existing score model and records explicit mDNS protection evidence in metadata. No scoring policy was changed.
3. `x-privasec-*` server/worker-derived metadata is separated from browser-originated request headers. It remains available through `serverDerivedMetadata` and no longer inflates browser-header counts or browser-header exports.
4. The home evidence card labels `network.provider` as `Intelligence source` rather than `Network provider`.
5. `Sec-Fetch-Site` wording now describes it as request-context evidence that servers can use as part of defenses, rather than claiming the header itself proves protection.
6. Added focused Stage 1 regression tests in `server/tests/stage1TrustCorrections.test.ts`.

## Intentionally unchanged
- Cloudflare Worker architecture and `wrangler.jsonc`
- Hyperdrive configuration
- PostgreSQL/Supabase integration
- package.json and package-lock.json
- PrivacyEngine scoring architecture
- Existing providers and audit collectors
- Existing pages and visual system
- Existing browser/WebRTC collection logic

## Validation limitations
The supplied snapshot contains only a partial `node_modules` tree. A full `npm ci` could not be completed within the execution environment, so the full project test/build pipeline could not be truthfully reported as passed here. The package/configuration files were restored from the supplied working snapshot after the failed installation attempt. Syntax-oriented inspection and repository invariants were performed on the changed files.
