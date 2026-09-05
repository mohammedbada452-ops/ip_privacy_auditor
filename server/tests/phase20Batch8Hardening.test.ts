import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const remediation = await readFile('src/features/home/utils/remediationEngine.ts', 'utf8');
const performance = await readFile('src/lib/performance.ts', 'utf8');
const readme = await readFile('README.md', 'utf8');
const envExample = await readFile('.env.example', 'utf8');

assert.match(remediation, /if \(category === 'HTTP_HEADERS'\) return 'HEADERS';/);
assert.match(performance, /let maxInteractionDuration = 0/);
assert.match(performance, /maxInteractionDuration = Math\.max\(maxInteractionDuration, duration\)/);
assert.match(readme, /Node\.js 22\+/);
for (const key of ['DATABASE_URL', 'SERVER_SECRET_SALT', 'ADMIN_USERNAME', 'ADMIN_PASSWORD', 'ADMIN_SECRET_KEY']) {
  assert.ok(envExample.includes(`${key}=`), `.env.example missing ${key}`);
}

console.log('PHASE20 BATCH8 HARDENING: PASS');
