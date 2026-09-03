import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'package.json', 'package-lock.json', 'wrangler.jsonc', 'worker/index.ts',
  'index.html', 'e2e/privacy-audit.spec.ts', 'scripts/verify-build-output.mjs'
];
const missing = required.filter((p) => !fs.existsSync(path.join(root, p)));
if (missing.length) {
  console.error('PHASE 10 FINAL STRUCTURE: FAIL');
  for (const p of missing) console.error(`- Missing ${p}`);
  process.exit(1);
}
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const requiredScripts = ['build:cloudflare', 'test:e2e', 'cf:typecheck', 'test:release'];
const missingScripts = requiredScripts.filter((s) => !pkg.scripts?.[s]);
if (missingScripts.length) {
  console.error('PHASE 10 FINAL STRUCTURE: FAIL');
  for (const s of missingScripts) console.error(`- Missing npm script ${s}`);
  process.exit(1);
}
const playwright = fs.readFileSync(path.join(root, 'e2e/privacy-audit.spec.ts'), 'utf8');
for (const marker of ['#main-content', '/browser', '/headers']) {
  if (!playwright.includes(marker)) {
    console.error(`PHASE 10 FINAL STRUCTURE: FAIL — E2E marker missing: ${marker}`);
    process.exit(1);
  }
}
console.log('PHASE 10 FINAL STRUCTURE: PASS');
console.log('Build/E2E dependencies are environment-dependent and must be executed after npm ci.');
