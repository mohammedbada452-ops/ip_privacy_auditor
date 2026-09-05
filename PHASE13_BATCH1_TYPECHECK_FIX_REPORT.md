# Phase 13 Batch 1 — Cloudflare Typecheck Follow-up Fix

## Deployment feedback
Cloudflare completed dependency installation, Vite production build, and the Cloudflare output verification successfully. The deployment stopped only at `npm run cf:typecheck` with two TypeScript errors:

1. `server/middleware/security.ts(81,7): TS2532 Object is possibly 'undefined'`
2. `worker/index.ts(429,17): TS2339 Property 'timingSafeEqual' does not exist on type 'Crypto'`

## Fixes applied

### 1. CORS environment value narrowing
`getRequestEnv('CORS_ALLOWED_ORIGINS')` was called twice inside a ternary. TypeScript correctly treated the second call as potentially `undefined` because the function is not assumed to be stable between calls.

The code now stores the value in a local constant first and then calls `.split()` only after narrowing that local constant.

### 2. Worker CSRF token comparison
Cloudflare Worker's Web Crypto `Crypto` type does not expose Node's `crypto.timingSafeEqual()` method. The Worker code now uses `TextEncoder` to compare equal-length byte arrays with an XOR accumulator and no early-exit mismatch branch.

This preserves the intended equal-length, non-short-circuit comparison semantics while remaining compatible with the Worker runtime/type definitions.

## Deployment safety
No changes were made to:
- `wrangler.jsonc`
- Hyperdrive binding
- Worker entrypoint
- Vite build configuration
- SEO preparation flow
- Cloudflare deployment command

The changes are limited to the two typecheck failures reported by the deployment.

## Validation
- Manual source inspection of both fixes: PASS
- The fixes directly address the two reported `cf:typecheck` errors.
- Full dependency installation/build/deploy cannot be executed from this offline workspace because `node_modules` is not present here.

## Expected Cloudflare result
The existing pipeline should progress past the two reported TypeScript errors:

`npm run build`
→ `build:cloudflare`
→ `vite build`
→ `verify-build-output`
→ `cf:typecheck`
→ PASS

After that, the project can proceed to the existing Cloudflare deployment step.
