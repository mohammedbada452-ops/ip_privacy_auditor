# PrivaSec Privacy & Browser Intelligence Auditor

PrivaSec is a privacy-auditing web application for IP intelligence, browser fingerprinting signals, HTTP header analysis, privacy scoring, and remediation guidance.

## Local development

**Prerequisites:** Node.js 20+ and npm.

1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env` and configure development values as needed.
3. Start the application:
   `npm run dev`

## Production

Production requires a reachable PostgreSQL database, a strong `SERVER_SECRET_SALT` (32+ characters), and administrator credentials configured through the deployment secret manager. Reverse-proxy headers are trusted only when the proxy network is explicitly configured with `TRUSTED_PROXY_CIDRS` or `TRUSTED_PROXIES`.

Build and start:

`npm run build`

`npm start`

## Validation

The repository includes unit/integration tests under `server/tests/`. In the source bundle used for this audit, dependencies were not preinstalled; therefore the final audit could perform static/runtime source checks but could not honestly claim a full `npm test`, `npm run lint`, or production build pass without installing the dependency tree.

## Final Cloudflare handoff

Read `AI_HANDOFF_REPORT.md` first when continuing this project in another environment or with another coding assistant. It records the exact deployment state, known limitations, fixes already applied, and the next safe steps.

`CLOUDFLARE_FIXES_V6.md` is the concise list of the consolidated Cloudflare repairs in the final package.
