import assert from 'node:assert';
import { PrivacyEngine } from '../privacy/PrivacyEngine';

console.log('--- RUNNING FIX 9 TRUST LAYER TESTS ---');
const engine = new PrivacyEngine();

// The score remains independently derived from deductions; evidence completeness must not rewrite it.
{
  const analysis = engine.evaluate({
    ipCheck: { ip: '198.51.100.10', isPrivate: false, headers: {} } as any,
    fingerprint: { webgl: { status: 'EXPOSED', renderer: 'Test GPU' } } as any,
  });
  assert.equal(analysis.privacyScore, 97, 'Example WebGL deduction should keep the raw score at 97');
  assert.equal(analysis.tier, 'EXCELLENT', '97 must remain EXCELLENT');
}

// Partial evidence must never be described as a verified score.
{
  const analysis = engine.evaluate({});
  assert.equal(analysis.verificationStatus, 'PARTIAL');
  assert.ok(!analysis.summary.toLowerCase().includes('verified privacy score'), 'Partial summary must not claim a verified score');
  assert.ok(analysis.scoreDisclaimer?.toLowerCase().includes('not be interpreted as proof'), 'Partial score must carry a safety disclaimer');
}

// Contextual proxy detection must not change the numeric score.
{
  const direct = engine.evaluate({
    ipCheck: { ip: '198.51.100.20', isPrivate: false, headers: {} } as any,
    ipDetails: { network: { providerStatus: 'VERIFIED', isProxy: false } } as any,
  });
  const proxied = engine.evaluate({
    ipCheck: { ip: '198.51.100.20', isPrivate: false, headers: {} } as any,
    ipDetails: { network: { providerStatus: 'VERIFIED', isProxy: true } } as any,
  });
  assert.equal(proxied.privacyScore, direct.privacyScore, 'Proxy detection must remain score-neutral');
  const proxyFactor = proxied.factors.find((factor) => factor.id === 'NET_PROXY_DETECTED');
  assert.equal(proxyFactor?.points, 0, 'Proxy factor must carry zero score impact');
  assert.equal(proxyFactor?.severity, 'info', 'Proxy factor must remain informational');
}

// Complete high-confidence evidence remains valid without the word "Verified" in the tier/summary wording.
{
  const analysis = engine.evaluate({
    ipCheck: { ip: '8.8.8.8', isPrivate: false, headers: { secGpc: '1' } } as any,
    fingerprint: { webRtc: { localIps: [], publicIps: [], mdnsCandidates: [] } } as any,
  });
  assert.equal(analysis.tier, 'EXCELLENT');
  assert.ok(!analysis.summary.toLowerCase().includes('verified privacy score'), 'Completed score summary must not use Verified as the score label');
}

console.log('[PASS] Trust layer invariants verified');
