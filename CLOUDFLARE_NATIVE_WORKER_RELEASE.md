# Cloudflare Native Worker Release

Production traffic is handled directly by `worker/index.ts` using the Workers Fetch API.

The production Worker does not import or instantiate the Express application, avoiding the
Express -> body-parser -> raw-body -> iconv-lite dependency chain that caused Worker validation
error 10021 (`require_streams(...) is not a function`).

Express remains available for local Node.js development and tests through `server.ts`.
