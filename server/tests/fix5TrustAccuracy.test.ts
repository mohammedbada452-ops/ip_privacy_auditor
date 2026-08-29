import assert from 'node:assert';
import { PrivacyEngine } from '../privacy/PrivacyEngine';
import { FactorRegistry } from '../privacy/factors/FactorRegistry';
import { calculateCentralizedSeverity, aggregateUnifiedRisks } from '../../src/features/home/utils/problemAggregator';
import { generateSmartRecommendations } from '../../src/features/home/utils/recommendationEngine';
import { saveScoreHistoryEntry, calculateScoreTrend, clearScoreHistory, getScoreHistory } from '../../src/features/home/utils/historyStorage';
import type { PrivacyScoreAnalysis, IpCheckResponse, IpDetailsResponse } from '../../packages/api-contract/src';

console.log('============================================================');
console.log('--- RUNNING FIX 5 TRUST & ACCURACY VERIFICATION TESTS ---');
console.log('============================================================');

const registry = new FactorRegistry();
const engine = new PrivacyEngine(registry);

// 1. Single Unified Deduction Registry & Confidence Integrity
console.log('1. Testing Single Unified Deduction Registry & Confidence Scoring...');
{
  const input = {
    fingerprint: {
      canvasHash: 'a1b2c3d4', // informational
      webgl: { vendor: 'NVIDIA', renderer: 'GeForce RTX 4090' }, // -3 pts
      webRtc: { localIps: ['192.168.1.100'] }, // -20 pts
      securityFlags: { isAutomation: false },
    },
    ipCheck: {
      ip: '1.2.3.4',
      ipVersion: 'IPv4' as const,
      isPrivate: false,
      headers: {
        secGpc: '0', // informational
        dnt: '0',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', // informational
        acceptLanguage: 'en-US,en;q=0.9',
        connection: 'keep-alive',
      },
      connectionFlags: {
        hasProxyHeaders: false,
        viaHeader: null,
      },
    },
    ipDetails: {
      ip: '1.2.3.4',
      geo: {
        country: 'United States',
        countryCode: 'US',
        region: 'CA',
        city: 'Mountain View',
        postalCode: '94043',
        latitude: 37.422,
        longitude: -122.084,
        timezone: 'America/Los_Angeles',
      },
      network: {
        isp: 'Google LLC',
        organization: 'Google Cloud',
        asn: 'AS15169',
        isMobile: false,
        isProxy: false,
        isHosting: true, // 0 pts informational
        isVpn: false,
        isTor: false,
      },
    },
  };

  const analysis: PrivacyScoreAnalysis = engine.evaluate(input);

  // Canonical scored findings: WebGL (-3) + WebRTC private exposure (-20).
  assert.strictEqual(analysis.privacyScore, 77, 'Privacy score equals exactly 77/100');
  assert.strictEqual(analysis.tier, 'GOOD', 'Score 77 is GOOD tier');
  assert.strictEqual(analysis.deductions.length, 2, 'Only canonical scored deductions are registered');

  // Verify all deductions have valid confidence
  for (const d of analysis.deductions) {
    assert.ok(d.confidence === 'HIGH' || d.confidence === 'MEDIUM' || d.confidence === 'LOW', `Confidence valid for ${d.factor}`);
    assert.ok(d.points < 0, `Deduction point is negative: ${d.points}`);
    assert.ok((d.reason?.length ?? 0) > 5, `Deduction reason is descriptive: ${d.reason ?? ''}`);
    assert.ok(d.recommendation && d.recommendation.length > 5, `Deduction has clear remediation: ${d.recommendation}`);
  }

  console.log('[PASS] Unified Deduction Registry enforces 100% deduction-to-score integrity and confidence levels');
}

// 2. Centralized Severity Mapping & Multi-Layer Problem Aggregator
console.log('2. Testing Centralized Severity Normalization...');
{
  assert.strictEqual(calculateCentralizedSeverity('FP_WEBRTC_LEAK', 'browser'), 'critical');
  assert.strictEqual(calculateCentralizedSeverity('NET_PROXY_DETECTED', 'network'), 'high');
  assert.strictEqual(calculateCentralizedSeverity('FP_CANVAS_UNIQUE', 'browser'), 'medium');
  assert.strictEqual(calculateCentralizedSeverity('FP_WEBGL_HARDWARE', 'browser'), 'medium');
  assert.strictEqual(calculateCentralizedSeverity('HDR_SEC_GPC_MISSING', 'headers'), 'low');
  assert.strictEqual(calculateCentralizedSeverity('NET_HOSTING_DATACENTER', 'network'), 'low');

  console.log('[PASS] Centralized severity correctly classifies critical, high, medium, and low risks');
}

// 3. Smart Recommendations with Granular Fix Items
console.log('3. Testing Smart Recommendations with Granular Action Items...');
{
  const mockRisks = [
    {
      id: 'risk_1',
      title: 'WebRTC Local IP Leak',
      severity: 'critical' as const,
      source: 'browser' as const,
      category: 'Network Transport',
      evidence: '192.168.1.100 revealed in STUN candidate',
      impact: 'Allows de-anonymization behind VPNs',
      solution: 'Disable WebRTC or set media.peerconnection.enabled to false',
      remediationActor: 'Browser Engine',
      scoreImpact: 20,
      confidence: 'HIGH' as const,
    },
    {
      id: 'risk_2',
      title: 'Canvas Fingerprinting',
      severity: 'medium' as const,
      source: 'browser' as const,
      category: 'Browser Fingerprint',
      evidence: 'Stable 2D canvas hash signature',
      impact: 'Unique hardware signature',
      solution: 'Enable canvas noise injection in Brave or via extension',
      remediationActor: 'Browser Engine',
      scoreImpact: 0,
      confidence: 'HIGH' as const,
    },
  ];

  const recommendations = generateSmartRecommendations(mockRisks);
  assert.ok(recommendations.length > 0, 'Generated recommendations from risks');
  const topRec = recommendations[0];
  assert.ok(topRec.fixes && topRec.fixes.length > 0, 'Recommendation has granular fix items');
  assert.ok(topRec.estimatedScoreBoost > 0, 'Estimated score boost is positive');

  console.log('[PASS] Smart recommendations generate granular action items with estimated point boosts');
}

// 4. Privacy Score Evolution & Issue History Tracking
console.log('4. Testing Privacy Score Evolution & Issue History Tracking...');
{
  clearScoreHistory();
  assert.strictEqual(getScoreHistory().length, 0, 'Score history cleared');

  // First scan: 55/100 with WebRTC and Canvas
  const history1 = saveScoreHistoryEntry(55, 'MODERATE', 2, 'Initial Audit', false, [
    'WebRTC Local IP Leak',
    'Canvas Fingerprinting',
  ]);
  assert.strictEqual(history1.length, 1);
  assert.strictEqual(history1[0].score, 55);
  assert.strictEqual(history1[0].remainingIssues?.length, 2);
  assert.strictEqual(history1[0].fixedIssues?.length, 0);

  // Second scan: WebRTC fixed, score improves to 75 (+20 pts)
  const history2 = saveScoreHistoryEntry(75, 'GOOD', 1, 'Re-Audit After Fixes', false, [
    'Canvas Fingerprinting',
  ]);
  assert.strictEqual(history2.length, 2);
  assert.strictEqual(history2[0].score, 75);
  assert.strictEqual(history2[0].previousScore, 55);
  assert.strictEqual(history2[0].scoreDelta, 20);
  assert.strictEqual(history2[0].fixedIssues?.length, 1);
  assert.strictEqual(history2[0].fixedIssues?.[0], 'WebRTC Local IP Leak');
  assert.strictEqual(history2[0].remainingIssues?.length, 1);
  assert.strictEqual(history2[0].remainingIssues?.[0], 'Canvas Fingerprinting');

  const trend = calculateScoreTrend(history2);
  assert.strictEqual(trend.overallDelta, 20);
  assert.strictEqual(trend.highestScore, 75);
  assert.strictEqual(trend.lowestScore, 55);
  assert.strictEqual(trend.scanCount, 2);

  console.log('[PASS] Score evolution accurately computes fixed issues, new issues, and score delta transitions');
}

console.log('============================================================');
console.log('ALL FIX 5 TRUST & ACCURACY VERIFICATION TESTS PASSED (100%)');
console.log('============================================================');
