# Cloudflare Workers Builds — Final settings

Use the repository root as the Root directory.

Build command:
`npm run build:cloudflare`

Deploy command:
`npx --yes wrangler@4.125.0 deploy`

Non-production branch deploy command:
`npx wrangler versions upload`

The repository is intentionally deployable without setting `VITE_PUBLIC_ORIGIN` on the first deployment. SEO files remain at their committed values until a real production origin is supplied as a build variable.

PostgreSQL/Hyperdrive remains configured in `wrangler.jsonc` and is not removed by this release.


## Required Cloudflare Workers Builds settings (do not swap these)

Build command:
`npm run build`

Deploy command:
`npx --yes wrangler@4.125.0 deploy`

The `build:cloudflare` script remains a repository validation script and is not the dashboard deploy command.
