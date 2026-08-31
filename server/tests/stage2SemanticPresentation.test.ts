import assert from 'node:assert/strict';
import { HEADER_DEFINITIONS } from '../headers/HeaderRegistry';

const gpcMissing = (await import('../headers/HeaderRegistry')).RECOMMENDED_MISSING_HEADERS.find((h) => h.canonicalName === 'Sec-GPC');
assert.ok(gpcMissing, 'Sec-GPC optional recommendation exists');
assert.match(gpcMissing!.recommendation, /support varies by browser/i);
assert.match(gpcMissing!.recommendation, /Sec-GPC: 1/i);

assert.equal(HEADER_DEFINITIONS['sec-fetch-site'].privacyImpact, 'Provides request-context information that servers can use as part of CSRF and cross-site isolation defenses.');
assert.match(HEADER_DEFINITIONS['accept'].privacyImpact, /quality weights apply only when q-values are actually present/i);

console.log('[PASS] Stage 2 semantic presentation corrections verified');
