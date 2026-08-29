import assert from 'node:assert/strict';
import { HeaderClassifier } from '../headers/HeaderClassifier';
import type { RawHeaderEntry } from '../headers/HeaderCollector';

const entries: RawHeaderEntry[] = [
  { key: 'Sec-GPC', normalizedKey: 'sec-gpc', value: '0' },
  { key: 'DNT', normalizedKey: 'dnt', value: '0' },
  { key: 'User-Agent', normalizedKey: 'user-agent', value: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/125 Safari/537.36' },
  { key: 'Accept-Language', normalizedKey: 'accept-language', value: 'en-US,en;q=0.9' },
  { key: 'Content-Security-Policy', normalizedKey: 'content-security-policy', value: "default-src 'self'" },
  { key: 'Strict-Transport-Security', normalizedKey: 'strict-transport-security', value: 'max-age=31536000' },
];

const result = HeaderClassifier.analyze(entries, false);

assert.equal(result.headerPrivacyExposureScore, 100);
assert.equal(result.headerSecurityScore, 100);
assert.equal(result.privacyScore, 100);

const gpc = result.scoreFactors.find((f) => f.id === 'HDR_SEC_GPC_NOT_PRESENT');
assert.equal(gpc?.points, 0);
assert.equal(gpc?.scoreScope, 'INFORMATIONAL');

const ua = result.scoreFactors.find((f) => f.id === 'HDR_UA_STANDARD');
assert.equal(ua?.points, 0);
assert.equal(ua?.scoreScope, 'PRIVACY_EXPOSURE');

for (const factor of result.scoreFactors) {
  if (factor.points < 0) {
    assert.notEqual(factor.scoreScope, 'INFORMATIONAL', `${factor.id} cannot deduct while informational`);
  }
}

console.log('[PASS] headerScoreScope separation');
