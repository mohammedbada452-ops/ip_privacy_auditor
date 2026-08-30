import assert from 'node:assert/strict';
import { sanitizeFingerprintPayload } from '../../src/features/browser/normalize/normalizer';
import { HeaderClassifier } from '../headers/HeaderClassifier';
import { HeaderCollector } from '../headers/HeaderCollector';
import { RECOMMENDED_MISSING_HEADERS, HEADER_DEFINITIONS } from '../headers/HeaderRegistry';
import { en, es, fr, tr, pt, ar } from '../../src/i18n';

// WebGL evidence must survive client-side normalization.
const sanitized = sanitizeFingerprintPayload({
  webgl: {
    vendor: 'Google Inc.',
    renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630)',
    isUnmasked: true,
  },
});
assert.equal(sanitized.webgl?.isUnmasked, true);
assert.equal(sanitized.webgl?.renderer?.includes('Intel UHD Graphics'), true);

// Only actual score-eligible/more relevant optional missing signals belong in this registry.
assert.equal(RECOMMENDED_MISSING_HEADERS.some((h) => h.canonicalName === 'DNT'), false);
assert.equal(RECOMMENDED_MISSING_HEADERS.some((h) => h.canonicalName === 'Upgrade-Insecure-Requests'), false);
assert.equal(RECOMMENDED_MISSING_HEADERS.some((h) => h.canonicalName === 'Sec-CH-UA'), false);
assert.ok(RECOMMENDED_MISSING_HEADERS.some((h) => h.canonicalName === 'Sec-GPC'));
assert.equal(HEADER_DEFINITIONS['upgrade-insecure-requests']?.category, 'SECURITY_TRANSPORT');

// Infrastructure proxy metadata is informational and must not be presented as a privacy protection.
const request = {
  headers: {
    host: 'example.com',
    'x-forwarded-for': '203.0.113.10',
    'x-forwarded-proto': 'https',
  },
  rawHeaders: ['Host', 'example.com', 'X-Forwarded-For', '203.0.113.10', 'X-Forwarded-Proto', 'https'],
} as any;
const entries = HeaderCollector.collect(request);
const headerAnalysis = HeaderClassifier.analyze(entries, true);
const infraFactor = headerAnalysis.scoreFactors.find((f) => f.id === 'HDR_INFRA_PROXY_TRUSTED');
assert.equal(infraFactor?.points, 0);
assert.notEqual(infraFactor?.impact, 'Protected (+0 pts)');

// Six locale dictionaries must expose the newly localized labels.
for (const locale of [en, es, fr, tr, pt, ar]) {
  assert.equal(typeof locale.ip.geoSourceConflict, 'string');
  assert.equal(typeof locale.ip.extendedNetworkIntelligence, 'string');
  assert.equal(typeof locale.admin.retryInSeconds, 'string');
}

console.log('[PASS] Final signal correction invariants verified.');
