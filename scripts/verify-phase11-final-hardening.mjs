import fs from 'node:fs';
import path from 'node:path';

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
assert(typeof pkg.scripts?.test === 'string' && pkg.scripts.test.includes('privacyEngine.test.ts'), 'Canonical npm test command missing privacyEngine.test.ts');
assert(fs.existsSync('.github/workflows/ci.yml'), 'CI workflow is missing');

const privacyTest = fs.readFileSync('server/tests/privacyEngine.test.ts', 'utf8');
assert(privacyTest.includes("providerStatus: 'VERIFIED'"), 'Hosting evaluator fixture must include verified providerStatus');

const networkCard = fs.readFileSync('src/features/ip/components/NetworkIntelligenceCard.tsx', 'utf8');
const technical = fs.readFileSync('src/features/home/components/TechnicalSummarySection.tsx', 'utf8');
const storage = fs.readFileSync('src/features/browser/components/StorageNetworkCard.tsx', 'utf8');
assert(!networkCard.includes('>Reputation</div>'), 'Hardcoded Reputation label remains in NetworkIntelligenceCard');
assert(!technical.includes('>Evidence</span>'), 'Hardcoded Evidence label remains in TechnicalSummarySection');
assert(!technical.includes(": 'Unavailable'"), 'Hardcoded Unavailable fallback remains in TechnicalSummarySection');
assert(!storage.includes("'Available'"), 'Hardcoded Available label remains in StorageNetworkCard');
assert(!storage.includes("'Restricted'"), 'Hardcoded Restricted label remains in StorageNetworkCard');

const csp = fs.readFileSync('server/middleware/security.ts', 'utf8');
assert(csp.includes("script-src 'self'"), 'Production CSP script-src self missing');

if (failures.length) {
  console.error('PHASE11 FINAL HARDENING: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('PHASE11 FINAL HARDENING: PASS');
