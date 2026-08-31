# PrivaSec SEO Preview Release

## Indexing architecture

The public application has a hostname-independent SEO layer. The Worker serves `/robots.txt` and `/sitemap.xml` dynamically from the current request origin, so the first Cloudflare deployment does not require a guessed production hostname.

The sitemap contains only the public indexable routes that exist in the application:
- /
- /browser
- /headers
- /site-audit
- /privacy
- /learn

## Page metadata

The SPA updates the document title, meta description, canonical URL, Open Graph metadata, Twitter metadata, and JSON-LD after route changes. The default language remains English; the application localization continues to control UI strings independently.

## Cloudflare deployment contract

Workers Builds:
- Root directory: `/`
- Build command: `npm run build:cloudflare`
- Deploy command: `npx wrangler deploy`
- Preview deploy command: `npx wrangler versions upload`

Do not add a custom `build` section to `wrangler.jsonc`; Workers Builds owns the build stage.

## Safety

Admin and API paths are excluded from crawling. SEO pages contain explanatory content only; live audit results remain generated from runtime evidence. No mock result is used as production evidence.
