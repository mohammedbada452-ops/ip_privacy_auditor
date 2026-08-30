import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  }
};

const wranglerText = read('wrangler.jsonc');
const tsconfigText = read('tsconfig.json');
const packageText = read('package.json');
const workerText = read('worker/index.ts');
const routerText = read('src/router/Router.tsx');
const adminText = read('src/routes/AdminDashboard.tsx');
const appText = read('server/app.ts');
const freeIntelligenceText = read('server/services/rdap.ts');
const reverseDnsText = read('server/services/reverseDns.ts');
const headersText = read('public/_headers');

assert(/"main"\s*:\s*"\.\/worker\/index\.ts"/.test(wranglerText), 'wrangler main must point to worker/index.ts');
assert(/"nodejs_compat"/.test(wranglerText), 'nodejs_compat must be explicitly enabled');
assert(/"workers_dev"\s*:\s*true/.test(wranglerText), 'workers_dev must be enabled for the free test hostname');
assert(/"directory"\s*:\s*"\.\/dist"/.test(wranglerText), 'Cloudflare assets directory must be dist');
assert(/"binding"\s*:\s*"ASSETS"/.test(wranglerText), 'assets binding must be ASSETS');
assert(/"not_found_handling"\s*:\s*"single-page-application"/.test(wranglerText), 'SPA fallback must be enabled');
assert(/"run_worker_first"\s*:\s*\[[\s\S]*"\/api\/\*"[\s\S]*\]/.test(wranglerText), 'API routes must run through Worker first');
assert(/"exclude"\s*:\s*\[[\s\S]*worker\/\*\*\/\*\.ts[\s\S]*worker-configuration\.d\.ts/.test(tsconfigText), 'root TS config must isolate Worker generated types');
assert(/"cf:typecheck"\s*:\s*"wrangler types && tsc -p tsconfig.worker.json"/.test(packageText), 'Worker typecheck must regenerate Wrangler types');
assert(workerText.includes('export default { fetch: handleRequestSafely }'), 'Worker must export a native fetch handler');
assert(!workerText.includes("from 'express'") && !workerText.includes("from \"express\""), 'Production Worker must not import Express runtime');
assert(workerText.includes('async function handleRequest(') && workerText.includes('fetch: handleRequestSafely'), 'Worker must dispatch requests through its native fetch handler');
assert(!workerText.includes('handleAsNodeRequest'), 'Worker must not use handleAsNodeRequest');
assert(!workerText.includes('createApiApp('), 'Production Worker must not instantiate the Express application');
assert(appText.includes('export function createApiApp'), 'shared API app factory must exist');
assert(routerText.includes("const normalized = path.replace(/\\/+$/, '')"), 'router must normalize trailing slashes');
assert(adminText.includes("setActiveTab(tab.id === 'securityLogs' ? 'logs' : tab.id)"), 'Admin navigation mapping must be explicit');
assert(!/setActiveTab\(tab\.id as any\)/.test(adminText), 'Admin dashboard must not use an unsafe tab cast');
assert(headersText.includes('Content-Security-Policy:'), 'static assets must retain CSP');
assert(headersText.includes('Strict-Transport-Security:'), 'static assets must retain HSTS');


assert(!/"build"\s*:\s*\{[\s\S]*?"command"\s*:\s*/.test(wranglerText), 'Workers Builds project must not define a custom Wrangler build command that can recurse during dashboard builds');
assert(/"hyperdrive"\s*:\s*\[/.test(wranglerText), 'Hyperdrive binding must remain configured');
assert(packageText.includes('"build:cloudflare"'), 'Cloudflare build script must remain available for Workers Builds');
assert(packageText.includes('"packageManager": "npm@11.16.0"'), 'Release must declare npm package manager for deterministic dependency installation');
assert(freeIntelligenceText.includes('class RdapService'), 'Free RDAP service implementation must remain present.');
assert(reverseDnsText.includes('class ReverseDnsService'), 'Free reverse-DNS service implementation must remain present.');

if (process.exitCode !== 1) console.log('PASS: Cloudflare deployment structure and route guards are consistent.');
