import assert from 'node:assert/strict';
import { HeaderClassifier } from '../headers/HeaderClassifier';

const result = HeaderClassifier.analyze([
  { key: 'content-security-policy', normalizedKey: 'content-security-policy', value: "default-src 'self'" },
  { key: 'dnt', normalizedKey: 'dnt', value: '1' },
]);

assert.equal(result.items.length, 2);
const csp = result.items.find((item) => item.name === 'content-security-policy');
const dnt = result.items.find((item) => item.name === 'dnt');
assert.ok(csp);
assert.ok(dnt);
assert.equal(csp.classification, 'SECURITY');
assert.equal(csp.scoreScope, 'SECURITY');
assert.equal(dnt.classification, 'CONFIGURATION');
assert.equal(dnt.scoreScope, 'INFORMATIONAL');

console.log('PASS: Phase 19 batch 7 header classification regression');
