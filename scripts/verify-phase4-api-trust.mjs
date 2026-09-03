import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const worker = fs.readFileSync(path.join(root, 'worker/index.ts'), 'utf8');
const geoip = fs.readFileSync(path.join(root, 'server/services/geoip.ts'), 'utf8');

const checks = [
  ['Worker validates browser fingerprint payloads', /validateBrowserFingerprintPayload/.test(worker) && /PayloadValidationError/.test(worker)],
  ['Network intelligence is rate limited', /rateLimit\(req, "network-intelligence"/.test(worker)],
  ['IP details are rate limited', /rateLimit\(req, "ip-details"/.test(worker)],
  ['Privacy score is rate limited', /rateLimit\(req, "privacy-score"/.test(worker)],
  ['Population insights are rate limited', /rateLimit\(req, "population-insights"/.test(worker)],
  ['IP endpoint is rate limited', /rateLimit\(req, "ip"/.test(worker)],
  ['Headers endpoint is rate limited', /rateLimit\(req, "headers"/.test(worker)],
  ['Raw headers endpoint is rate limited', /rateLimit\(req, "headers-raw"/.test(worker)],
  ['Population score is bounded to 0-100', /score < 0 \|\| score > 100/.test(worker)],
  ['Unvalidated browser payload path is absent', !/const fingerprint = \(body as any\)\?\.fingerprint \?\? null;/.test(worker)],
  ['ip-api production use is blocked', /The ip-api GeoIP provider is not enabled for production/.test(geoip)],
];

const failures = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`);
if (failures.length) process.exit(1);
console.log('PHASE 4 API TRUST HARDENING: PASS');
