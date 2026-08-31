import assert from 'node:assert';
import { PrivacyEngine } from '../privacy/PrivacyEngine';
import { HeaderClassifier } from '../headers/HeaderClassifier';
import { generateSmartRecommendations } from '../../src/features/home/utils/recommendationEngine';
import { generateRemediationFindings } from '../../src/features/home/utils/remediationEngine';
import { aggregateUnifiedRisks } from '../../src/features/home/utils/problemAggregator';

console.log('--- RUNNING STAGE 2 SEMANTIC/PRESENTATION TESTS ---');

// 1. GPC remains score-neutral and cannot advertise a fake +5 recovery.
{
  const engine = new PrivacyEngine();
  const analysis = engine.evaluate({
    ipCheck: {
      ip: '198.51.100.44',
      isPrivate: false,
      headers: { secGpc: '0', userAgent: 'Chrome/152' } as any,
    } as any,
    fingerprint: {},
  });
  const { risks } = aggregateUnifiedRisks({ privacyAnalysis: analysis });
  const recs = generateSmartRecommendations(risks);
  const gpc = recs.find((r) => r.id === 'rec_gpc');
  if (gpc) {
    assert.strictEqual(gpc.estimatedScoreBoost, 0, 'GPC must remain score-neutral');
    assert.ok(gpc.fixes.every((f) => f.expectedImprovementPts === 0), 'GPC fixes must not claim score recovery');
  }
}

// 2. WebGL recovery remains exactly 3 points and is isolated from informational Canvas/Audio signals.
{
  const engine = new PrivacyEngine();
  const analysis = engine.evaluate({
    ipCheck: { ip: '198.51.100.45', isPrivate: false, headers: { secGpc: '0' } as any } as any,
    fingerprint: {
      canvasHash: 'canvas_hash',
      webgl: { renderer: 'AMD Radeon RX 6800', isUnmasked: true } as any,
      audioHash: 'audio_hash',
    },
  });
  const { risks } = aggregateUnifiedRisks({ privacyAnalysis: analysis });
  const rec = generateSmartRecommendations(risks).find((r) => r.id === 'rec_fingerprint');
  assert.ok(rec, 'Fingerprint recommendation should exist');
  assert.strictEqual(rec?.estimatedScoreBoost, 3, 'Only WebGL should contribute +3 recovery');
  assert.ok(rec?.fixes.some((f) => f.id === 'fix_webgl_mask' && f.expectedImprovementPts === 3));
  assert.ok(rec?.fixes.filter((f) => f.id !== 'fix_webgl_mask').every((f) => f.expectedImprovementPts === 0));
  assert.ok(!rec?.title.includes('Reduce Hardware Canvas, WebGL & Audio Entropy'), 'Title should not imply all three surfaces are scored');
}

// 3. Remediation outcome must be conditional rather than guaranteeing score restoration.
{
  const engine = new PrivacyEngine();
  const analysis = engine.evaluate({
    ipCheck: { ip: '198.51.100.46', isPrivate: false, headers: { secGpc: '0' } as any } as any,
    fingerprint: { webgl: { renderer: 'Intel UHD Graphics 630', isUnmasked: true } as any },
  });
  const { findings } = generateRemediationFindings({ privacyAnalysis: analysis } as any);
  const webgl = findings.find((f) => f.id === 'FP_WEBGL_HARDWARE');
  assert.ok(webgl, 'WebGL remediation finding should exist');
  assert.ok(!/Eliminates deduction|Vulnerability eliminated/i.test(webgl?.expectedOutcome || ''), 'WebGL outcome must not guarantee elimination');
  assert.ok(/re-run the audit|verify/i.test(webgl?.expectedOutcome || ''), 'WebGL outcome should require verification');
}

// 4. Sec-Fetch-Site must describe a signal servers can use, not a protection that the header proves by itself.
{
  const entries = [
    { key: 'sec-fetch-site', normalizedKey: 'sec-fetch-site', value: 'same-origin' },
  ] as any;
  const result = HeaderClassifier.analyze(entries);
  const item = result.headers.find((h) => h.canonicalName === 'Sec-Fetch-Site');
  assert.ok(item);
  assert.ok(/servers can use/i.test(item?.privacyImpact || ''));
  assert.ok(!/^Protects against/i.test(item?.privacyImpact || ''));
}

// 5. Accept wording should not claim q-weights are present unless the observed value contains them.
{
  const entries = [
    { key: 'accept', normalizedKey: 'accept', value: '*/*' },
  ] as any;
  const result = HeaderClassifier.analyze(entries);
  const item = result.headers.find((h) => h.canonicalName === 'Accept');
  assert.ok(item);
  assert.ok(/q-values are actually present/i.test(item?.privacyImpact || ''));
}

console.log('[PASS] Stage 2 semantic/presentation regression tests prepared');
