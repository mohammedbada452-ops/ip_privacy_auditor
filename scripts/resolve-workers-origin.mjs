import { request } from 'node:https';
import { spawnSync } from 'node:child_process';

const accountId = (process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
const token = (process.env.CLOUDFLARE_API_TOKEN || '').trim();
const workerName = (process.env.CLOUDFLARE_WORKER_NAME || 'privasec-privacy-auditor').trim();

function fail(message) {
  console.error(`[Cloudflare Origin] ${message}`);
  process.exit(1);
}

if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(workerName)) {
  fail('CLOUDFLARE_WORKER_NAME must be a valid workers.dev DNS label.');
}

async function getAccountSubdomain() {
  if (!accountId || !token) return null;
  return new Promise((resolve, reject) => {
    const req = request({
      hostname: 'api.cloudflare.com',
      path: `/client/v4/accounts/${encodeURIComponent(accountId)}/workers/subdomain`,
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          const payload = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300 && payload?.success && payload?.result?.subdomain) {
            resolve(String(payload.result.subdomain));
            return;
          }
          reject(new Error(`Cloudflare API returned ${res.statusCode}: ${payload?.errors?.[0]?.message || 'Unable to read workers.dev subdomain.'}`));
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

let origin = (process.env.VITE_PUBLIC_ORIGIN || '').trim().replace(/\/$/, '');

if (!origin || origin.includes('YOUR_PRODUCTION_DOMAIN')) {
  try {
    const subdomain = await getAccountSubdomain();
    if (subdomain) {
      origin = `https://${workerName}.${subdomain}.workers.dev`;
      console.log(`[Cloudflare Origin] Using workers.dev origin: ${origin}`);
    }
  } catch (error) {
    console.warn(`[Cloudflare Origin] Could not resolve workers.dev subdomain: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (!/^https:\/\/[^\s/]+(?:\/[^\s]*)?$/.test(origin) || origin.includes('YOUR_PRODUCTION_DOMAIN')) {
  fail('Set VITE_PUBLIC_ORIGIN to a real HTTPS URL, or provide CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN so the workers.dev origin can be discovered automatically.');
}

process.env.VITE_PUBLIC_ORIGIN = origin;
process.env.NODE_ENV = 'production';

function run(command, args) {
  const executable = process.platform === 'win32' ? `${command}.cmd` : command;
  const result = spawnSync(executable, args, { stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run('node', ['scripts/prepare-seo.mjs']);
run('vite', ['build']);
run('npm', ['run', 'cf:typecheck']);
