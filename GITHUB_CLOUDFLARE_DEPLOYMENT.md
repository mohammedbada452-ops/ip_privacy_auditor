# GitHub -> Cloudflare Workers release

## Cloudflare Workers Builds
- Root directory: `/`
- Build command: `npm run build:cloudflare`
- Deploy command: `npx --yes wrangler@4.125.0 deploy`
- Non-production deploy command: `npx wrangler versions upload`

This repository intentionally uses `package-lock.json` and does not include `bun.lock`. The dependency install must therefore use npm. Do not configure a custom Bun install command.

## Required runtime binding
The Worker keeps the existing PostgreSQL/Hyperdrive integration. Configure the `HYPERDRIVE` binding in Cloudflare to the database/Hyperdrive resource belonging to this project. Do not put database credentials in GitHub.

## First deployment
1. Push the contents of this directory to the connected GitHub branch.
2. In Cloudflare Workers > Settings > Build, verify the three commands above.
3. Trigger a new build.
4. Confirm dependency installation no longer says `bun install --frozen-lockfile`.
5. After a successful deploy, test `/api/healthz`, then the application routes.
