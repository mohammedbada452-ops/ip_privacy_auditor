# QuickDrop-derived Cloudflare deployment decision

QuickDrop is the proven reference project supplied with this task. Its important deployment characteristics are:
- Worker-native `main` entrypoint.
- `assets.directory: ./dist`.
- `nodejs_compat` with Wrangler 4.125.x in its package configuration.
- Express is retained for its Node development/test server, not used as the Worker entrypoint.

For PrivaSec, existing Express routes and business logic are intentionally preserved to avoid feature regression. The Worker entry remains `worker/index.ts` and uses a native Cloudflare Worker `fetch` handler; Express remains isolated from the production Worker. The deploy command is pinned to Wrangler 4.125.0 because Cloudflare's public Workers SDK issue #9309 documents the exact `require_streams(...) is not a function` failure in Wrangler 4.16.0 and reports 4.15.2 as working. This is a targeted deployment workaround; no application features are removed.
