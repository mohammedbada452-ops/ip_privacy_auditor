# Cloudflare Fixes V6

This is the consolidated deployment-ready revision of the supplied `ip_privacy_auditor_final_v2.zip`.

## Included fixes

1. **Cloudflare Worker adapter**
   - Added `worker/index.ts`.
   - Reuses the existing Express API application rather than duplicating routes.
   - Uses Cloudflare's Node compatibility runtime and `handleAsNodeRequest`.

2. **Wrangler configuration**
   - Added `wrangler.jsonc`.
   - Enables `nodejs_compat`.
   - Enables `workers_dev` for a free test hostname.
   - Uses `dist` as Static Assets.
   - Enables SPA fallback.
   - Routes `/api/*` to the Worker first.

3. **Worker TypeScript isolation**
   - Added `tsconfig.worker.json`.
   - Root `tsconfig.json` excludes Wrangler's generated `worker-configuration.d.ts`.
   - `cf:typecheck` always runs `wrangler types` before TypeScript checking.

4. **Admin dashboard TypeScript fixes**
   - `AdminDashboard.tsx` now uses an explicit union for its navigation tabs.
   - The `securityLogs -> logs` mapping remains explicit and type-safe.
   - Removed the unsafe `as any` cast.
   - Added a defensive switch default so strict TypeScript cannot infer `tab` as undefined.

5. **Trailing-slash route fix**
   - The client router normalizes `/admin/dashboard/` to `/admin/dashboard` and applies the same normalization to browser history and navigation.

6. **SecurityFlagsCard null-safety**
   - `boolean | null` is now supported.
   - A null detection result renders `Unavailable` instead of being incorrectly treated as safe.

7. **Rate limiter TypeScript fix**
   - Test-mode `NODE_ENV` comparison is normalized through a string variable so Wrangler's environment typing cannot produce TS2367.

8. **Wrangler NODE_ENV warning fix**
   - Removed runtime assignment to `process.env.NODE_ENV` from the Worker adapter.
   - This eliminates the Wrangler `assign-to-define` warning seen during the user's dry-run.

9. **Windows child-process warning fix**
   - `resolve-workers-origin.mjs` no longer uses `shell: true`.
   - It selects `.cmd` executables on Windows, removing Node's `DEP0190` warning.

10. **Automatic workers.dev origin**
   - Added `scripts/resolve-workers-origin.mjs`.
   - When `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` exist, it discovers the account workers.dev subdomain and derives `VITE_PUBLIC_ORIGIN` automatically.

11. **Static security headers**
   - Added `public/_headers` containing CSP, HSTS, Referrer-Policy, MIME sniffing protection, Permissions-Policy, and download-related headers.

12. **Shared API architecture**
   - Added `server/app.ts` as the shared Express middleware/API route factory.
   - The native Node server still owns Vite/static serving and process lifecycle.
   - Cloudflare reuses the same API route stack.

## Verified state observed on the user's laptop before this V6 consolidation

- `npm install`: PASS; 230 packages installed; `npm audit`: 0 vulnerabilities.
- `npm run test:cloudflare-guard`: PASS.
- `npm run test:admin-metrics`: PASS.
- `npm run cf:typecheck`: PASS.
- `npm run lint`: PASS.
- `npm run build:cloudflare:auto`: PASS.
- Vite: 1820 modules transformed and production assets generated.
- `npx wrangler deploy --dry-run`: PASS; Wrangler read 44 assets and accepted the Worker/Assets configuration.

## Current production gate

The project does **not** currently contain a production PostgreSQL provider or Hyperdrive binding. The supplied source contains only a localhost PostgreSQL example in `.env.example`.

The next operational task is to provision a real PostgreSQL database (for example a free test project on a supported provider), create a Cloudflare Hyperdrive configuration for it, add the `HYPERDRIVE` binding to `wrangler.jsonc`, and configure Worker secrets.

The code intentionally remains production-strict around PostgreSQL and the security salt/admin credentials.

## Free test deployment

A custom domain is not required. The user's Cloudflare account successfully resolved a `workers.dev` origin during the build. The final project will rediscover the account subdomain automatically rather than hard-code it.

## Credential warning

A real Cloudflare API token was pasted in the troubleshooting conversation. Treat it as compromised. Rotate/revoke that token and replace it with a least-privilege token after setup. Never commit tokens, DB passwords, admin passwords, or other secrets.
