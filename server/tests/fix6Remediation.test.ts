import assert from 'node:assert';
import { PrivacyEngine } from '../privacy/PrivacyEngine';
import { FactorRegistry } from '../privacy/factors/FactorRegistry';
import {
  generateRemediationFindings,
  detectPlatformContext,
} from '../../src/features/home/utils/remediationEngine';
import type { PrivacyScoreAnalysis, IpCheckResponse, IpDetailsResponse } from '../../packages/api-contract/src';

console.log('============================================================');
console.log('--- RUNNING FIX 6 REMEDIATION CENTER COMPREHENSIVE TESTS ---');
console.log('============================================================');

const registry = new FactorRegistry();
const engine = new PrivacyEngine(registry);

// 1. Remediation finding generation from privacy score analysis
console.log('1. Testing remediation finding generation from privacy score analysis...');
{
  const analysis: PrivacyScoreAnalysis = {
    privacyScore: 70,
    tier: 'MODERATE',
    summary: 'Score analysis',
    deductions: [],
    breakdown: { networkScore: 20, headerScore: 25, fingerprintScore: 15, securityScore: 10 },
    factors: [
      {
        id: 'SEC_GPC_DISABLED',
        name: 'Global Privacy Control (Sec-GPC)',
        category: 'HEADERS',
        severity: 'high',
        points: 5,
        detected: true,
        available: true,
        status: 'WARNING',
        currentValue: '0',
        reason: 'Websites track browsing habits without opt-out signal',
        description: 'Websites track browsing habits without opt-out signal',
        source: 'headers',
        confidence: 'HIGH',
      },
      {
        id: 'WEBRTC_LEAK',
        name: 'WebRTC Local IP Leak',
        category: 'NETWORK',
        severity: 'critical',
        points: 20,
        detected: true,
        available: true,
        status: 'DANGER',
        currentValue: '192.168.1.50',
        reason: 'Exposes local internal network address behind VPN/NAT',
        description: 'Exposes local internal network address behind VPN/NAT',
        source: 'browser',
        confidence: 'HIGH',
      },
    ],
  };

  const { findings, summary } = generateRemediationFindings(analysis);
  assert.strictEqual(findings.length, 2, 'Should generate 2 findings');
  assert.strictEqual(summary.total, 2, 'Summary total should be 2');
  assert.strictEqual(summary.actionable, 2, 'Both findings should be actionable');
}

// 2. Actor classification coverage
console.log('2. Testing actor classification for all actor categories...');
{
  const mockAnalysis = (factorId: string): PrivacyScoreAnalysis => ({
    privacyScore: 80,
    tier: 'GOOD',
    summary: 'Score analysis',
    deductions: [],
    breakdown: { networkScore: 20, headerScore: 25, fingerprintScore: 15, securityScore: 20 },
    factors: [
      {
        id: factorId,
        name: factorId,
        category: 'FINGERPRINT',
        severity: 'medium',
        points: 10,
        detected: true,
        available: true,
        status: 'WARNING',
        currentValue: 'true',
        reason: 'Impact test',
        description: 'Impact test',
        source: 'browser',
      },
    ],
  });

  const gpc = generateRemediationFindings(mockAnalysis('SEC_GPC_DISABLED')).findings[0];
  assert.strictEqual(gpc.responsibleActor, 'USER', 'GPC actor should be USER');

  const webrtc = generateRemediationFindings(mockAnalysis('WEBRTC_LEAK')).findings[0];
  assert.strictEqual(webrtc.responsibleActor, 'BROWSER', 'WebRTC actor should be BROWSER');

  const hosting = generateRemediationFindings(mockAnalysis('HOSTING_DATACENTER')).findings[0];
  assert.strictEqual(hosting.responsibleActor, 'HOSTING_PROVIDER', 'Hosting actor should be HOSTING_PROVIDER');

  const unavail = generateRemediationFindings(mockAnalysis('CLIENT_HINTS_UNAVAILABLE')).findings[0];
  assert.strictEqual(unavail.responsibleActor, 'UNAVAILABLE', 'Unavailable actor should be UNAVAILABLE');
}

// 3. Actionability classification coverage
console.log('3. Testing actionability classifications...');
{
  const mockAnalysis = (factorId: string, points: number): PrivacyScoreAnalysis => ({
    privacyScore: 80,
    tier: 'GOOD',
    summary: 'Score analysis',
    deductions: [],
    breakdown: { networkScore: 20, headerScore: 25, fingerprintScore: 15, securityScore: 20 },
    factors: [
      {
        id: factorId,
        name: factorId,
        category: 'FINGERPRINT',
        severity: 'medium',
        points,
        detected: true,
        available: true,
        status: 'WARNING',
        currentValue: 'true',
        reason: 'Impact test',
        description: 'Impact test',
        source: 'browser',
      },
    ],
  });

  const actNow = generateRemediationFindings(mockAnalysis('SEC_GPC_DISABLED', 5)).findings[0];
  assert.strictEqual(actNow.actionability, 'ACTIONABLE_NOW');

  const actBrowser = generateRemediationFindings(mockAnalysis('WEBRTC_LEAK', 20)).findings[0];
  assert.strictEqual(actBrowser.actionability, 'ACTIONABLE_BROWSER');

  const actHosting = generateRemediationFindings(mockAnalysis('HOSTING_DATACENTER', 0)).findings[0];
  assert.strictEqual(actHosting.actionability, 'ACTIONABLE_HOSTING');
}

// 4. Fingerprinting remediation must not invent score recovery for informational surfaces
console.log('4. Testing fingerprint remediation score integrity...');
{
  const analysis: PrivacyScoreAnalysis = {
    privacyScore: 97,
    tier: 'EXCELLENT',
    summary: 'Verified privacy score',
    deductions: [],
    breakdown: { networkScore: 100, headerScore: 100, fingerprintScore: 97, securityScore: 100 },
    factors: [
      {
        id: 'FP_CANVAS_UNIQUE', name: 'Canvas Fingerprinting', category: 'FINGERPRINT', severity: 'info',
        points: 0, detected: false, available: true, status: 'INFO', currentValue: 'hash',
        reason: 'Fingerprinting surface observed', description: 'Informational', source: 'browser'
      },
      {
        id: 'FP_AUDIO_SIGNATURE', name: 'AudioContext Signature', category: 'FINGERPRINT', severity: 'info',
        points: 0, detected: false, available: true, status: 'INFO', currentValue: 'hash',
        reason: 'Fingerprinting surface observed', description: 'Informational', source: 'browser'
      },
      {
        id: 'FP_WEBGL_HARDWARE', name: 'WebGL Hardware Exposure', category: 'FINGERPRINT', severity: 'medium',
        points: -3, detected: true, available: true, status: 'WARNING', currentValue: 'GPU',
        reason: 'Unmasked renderer', description: 'Confirmed scored exposure', source: 'browser', evidenceState: 'CONFIRMED'
      },
    ],
  };

  const { findings } = generateRemediationFindings(analysis);
  const composite = findings.find((f) => f.isMultiFactor);
  assert.ok(!composite, 'Informational Canvas/Audio surfaces must not be grouped into fake score recovery');
  const webgl = findings.find((f) => f.affectedFactorIds.includes('FP_WEBGL_HARDWARE'));
  assert.ok(webgl, 'Confirmed scored WebGL exposure should remain actionable');
  assert.strictEqual(webgl?.potentialRecoveryPts, 3, 'WebGL recovery must match canonical -3 score impact');
}

// 5. Potential score recovery calculation
console.log('5. Testing potential score recovery calculation (strictly <= factor points)...');
{
  const analysis: PrivacyScoreAnalysis = {
    privacyScore: 80,
    tier: 'GOOD',
    summary: 'Score analysis',
    deductions: [],
    breakdown: { networkScore: 20, headerScore: 25, fingerprintScore: 15, securityScore: 20 },
    factors: [
      {
        id: 'SEC_GPC_DISABLED',
        name: 'Global Privacy Control',
        category: 'HEADERS',
        severity: 'high',
        points: 5,
        detected: true,
        available: true,
        status: 'WARNING',
        currentValue: '0',
        reason: 'Missing GPC header',
        description: 'Missing GPC header',
        source: 'headers',
      },
    ],
  };

  const { findings } = generateRemediationFindings(analysis);
  assert.strictEqual(findings[0].potentialRecoveryPts, 5, 'Recovery points must equal points deducted');
  assert.ok(findings[0].potentialRecoveryPts <= findings[0].scoreImpact, 'Recovery must not exceed score impact');
}

// 6. Platform-aware guidance detection
console.log('6. Testing platform-aware guidance detection and step customization...');
{
  const macFirefoxUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/119.0';
  const platform = detectPlatformContext(macFirefoxUA, null);
  assert.strictEqual(platform.browserFamily, 'FIREFOX', 'Detected Firefox');
  assert.strictEqual(platform.osFamily, 'MACOS', 'Detected macOS');

  const analysis: PrivacyScoreAnalysis = {
    privacyScore: 70,
    tier: 'MODERATE',
    summary: 'Score analysis',
    deductions: [],
    breakdown: { networkScore: 20, headerScore: 25, fingerprintScore: 15, securityScore: 10 },
    factors: [
      {
        id: 'WEBRTC_LEAK',
        name: 'WebRTC Leak',
        category: 'NETWORK',
        severity: 'critical',
        points: 20,
        detected: true,
        available: true,
        status: 'DANGER',
        currentValue: '192.168.1.1',
        reason: 'WebRTC leaks IP',
        description: 'WebRTC leaks IP',
        source: 'browser',
      },
    ],
  };

  const { findings } = generateRemediationFindings(analysis, null, null, null, macFirefoxUA);
  assert.ok(findings[0].steps[0].instruction.includes('about:config'), 'Firefox steps should reference about:config');
}

// 7. Step-by-step instructions and code snippets
console.log('7. Testing step-by-step instructions formatting and snippets...');
{
  const chromeWindowsUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  const analysis: PrivacyScoreAnalysis = {
    privacyScore: 85,
    tier: 'GOOD',
    summary: 'Score analysis',
    deductions: [],
    breakdown: { networkScore: 20, headerScore: 25, fingerprintScore: 20, securityScore: 20 },
    factors: [
      {
        id: 'SEC_GPC_DISABLED',
        name: 'Global Privacy Control',
        category: 'HEADERS',
        severity: 'high',
        points: 5,
        detected: true,
        available: true,
        status: 'WARNING',
        currentValue: '0',
        reason: 'Missing GPC header',
        description: 'Missing GPC header',
        source: 'headers',
      },
    ],
  };

  const { findings } = generateRemediationFindings(analysis, null, null, null, chromeWindowsUA);
  assert.ok(findings[0].steps.length >= 2, 'Should provide at least 2 steps');
  assert.strictEqual(findings[0].steps[0].stepNumber, 1, 'First step should be numbered 1');
}

// 8. Expected outcome formulation
console.log('8. Testing expected outcome string generation...');
{
  const analysis: PrivacyScoreAnalysis = {
    privacyScore: 85,
    tier: 'GOOD',
    summary: 'Score analysis',
    deductions: [],
    breakdown: { networkScore: 20, headerScore: 25, fingerprintScore: 20, securityScore: 20 },
    factors: [
      {
        id: 'SEC_GPC_DISABLED',
        name: 'Global Privacy Control',
        category: 'HEADERS',
        severity: 'high',
        points: 5,
        detected: true,
        available: true,
        status: 'WARNING',
        currentValue: '0',
        reason: 'Missing GPC',
        description: 'Missing GPC',
        source: 'headers',
      },
    ],
  };

  const { findings } = generateRemediationFindings(analysis);
  assert.ok(findings[0].expectedOutcome.length > 10, 'Expected outcome string must be meaningful');
}

// 9. Remediation confidence rating
console.log('9. Testing remediation confidence rating values...');
{
  const analysis: PrivacyScoreAnalysis = {
    privacyScore: 85,
    tier: 'GOOD',
    summary: 'Score analysis',
    deductions: [],
    breakdown: { networkScore: 20, headerScore: 25, fingerprintScore: 20, securityScore: 20 },
    factors: [
      {
        id: 'SEC_GPC_DISABLED',
        name: 'Global Privacy Control',
        category: 'HEADERS',
        severity: 'high',
        points: 5,
        detected: true,
        available: true,
        status: 'WARNING',
        currentValue: '0',
        reason: 'Missing GPC',
        description: 'Missing GPC',
        source: 'headers',
      },
    ],
  };

  const { findings } = generateRemediationFindings(analysis);
  assert.ok(['HIGH', 'MEDIUM', 'LOW'].includes(findings[0].remediationConfidence));
}

// 10. Detection confidence inheritance
console.log('10. Testing detection confidence inheritance...');
{
  const analysis: PrivacyScoreAnalysis = {
    privacyScore: 85,
    tier: 'GOOD',
    summary: 'Score analysis',
    deductions: [],
    breakdown: { networkScore: 20, headerScore: 25, fingerprintScore: 20, securityScore: 20 },
    factors: [
      {
        id: 'SEC_GPC_DISABLED',
        name: 'Global Privacy Control',
        category: 'HEADERS',
        severity: 'high',
        points: 5,
        detected: true,
        available: true,
        status: 'WARNING',
        currentValue: '0',
        reason: 'Missing GPC',
        description: 'Missing GPC',
        source: 'headers',
        confidence: 'HIGH',
      },
    ],
  };

  const { findings } = generateRemediationFindings(analysis);
  assert.strictEqual(findings[0].confidence, 'HIGH', 'Confidence rating should match factor');
  assert.strictEqual(findings[0].detectionConfidence, 'HIGH', 'Detection confidence should match factor');
}

// 11. Environmental timezone consistency check
console.log('11. Testing environmental timezone consistency check...');
{
  const mockIpDetails: IpDetailsResponse = {
    ip: '8.8.8.8',
    geo: {
      country: 'United States',
      countryCode: 'US',
      region: 'California',
      city: 'Mountain View',
      postalCode: '94043',
      latitude: 37.4,
      longitude: -122.0,
      timezone: 'America/Los_Angeles',
    },
    network: {
      isp: 'Google LLC',
      organization: 'Google',
      asn: 'AS15169',
      isMobile: false,
      isProxy: false,
      isVpn: false,
      isTor: false,
      isHosting: true,
    },
  };

  const mockBrowserProfile = {
    timezone: 'Europe/London',
  };

  const { consistencyObservations } = generateRemediationFindings({
    privacyAnalysis: null,
    ipDetails: mockIpDetails,
    browserProfile: mockBrowserProfile as any,
  });

  const tzObs = consistencyObservations.find((o) => o.type === 'TIMEZONE');
  assert.ok(tzObs, 'Timezone observation should exist');
  assert.strictEqual(tzObs?.status, 'MISMATCH', 'Should detect timezone mismatch between America/Los_Angeles and Europe/London');
}

// 12. Environmental language consistency check
console.log('12. Testing environmental language/locale consistency check...');
{
  const mockIpDetails: IpDetailsResponse = {
    ip: '8.8.8.8',
    geo: {
      country: 'Germany',
      countryCode: 'DE',
      region: 'Hesse',
      city: 'Frankfurt',
      postalCode: '60313',
      latitude: 50.1,
      longitude: 8.6,
      timezone: 'Europe/Berlin',
    },
    network: {
      isp: 'Deutsche Telekom',
      organization: 'Telekom',
      asn: 'AS3320',
      isMobile: false,
      isProxy: false,
      isVpn: false,
      isTor: false,
      isHosting: false,
    },
  };

  const mockBrowserProfile = {
    languages: ['de-DE', 'de', 'en'],
  };

  const { consistencyObservations } = generateRemediationFindings({
    privacyAnalysis: null,
    ipDetails: mockIpDetails,
    browserProfile: mockBrowserProfile as any,
  });

  const langObs = consistencyObservations.find((o) => o.type === 'LANGUAGE');
  assert.ok(langObs, 'Language observation should exist');
  assert.strictEqual(langObs?.status, 'MATCH', 'Should detect language match');
}

// 13. State transitions: OPEN on initial detection
console.log('13. Testing state transitions: OPEN on initial detection...');
{
  const analysis: PrivacyScoreAnalysis = {
    privacyScore: 85,
    tier: 'GOOD',
    summary: 'Score analysis',
    deductions: [],
    breakdown: { networkScore: 20, headerScore: 25, fingerprintScore: 20, securityScore: 20 },
    factors: [
      {
        id: 'SEC_GPC_DISABLED',
        name: 'Global Privacy Control',
        category: 'HEADERS',
        severity: 'high',
        points: 5,
        detected: true,
        available: true,
        status: 'WARNING',
        currentValue: '0',
        reason: 'Missing GPC',
        description: 'Missing GPC',
        source: 'headers',
      },
    ],
  };

  const { findings } = generateRemediationFindings(analysis);
  assert.strictEqual(findings[0].status, 'OPEN', 'Initial state without prior scan must be OPEN');
}

// 14. State transitions: RESOLVED on fix verification
console.log('14. Testing state transitions: RESOLVED on fix verification...');
{
  const prevAnalysis: PrivacyScoreAnalysis = {
    privacyScore: 80,
    tier: 'GOOD',
    summary: 'Score analysis',
    deductions: [],
    breakdown: { networkScore: 20, headerScore: 20, fingerprintScore: 20, securityScore: 20 },
    factors: [
      {
        id: 'SEC_GPC_DISABLED',
        name: 'Global Privacy Control',
        category: 'HEADERS',
        severity: 'high',
        points: 5,
        detected: true,
        available: true,
        status: 'WARNING',
        currentValue: '0',
        reason: 'Missing GPC',
        description: 'Missing GPC',
        source: 'headers',
      },
    ],
  };

  const currentAnalysis: PrivacyScoreAnalysis = {
    privacyScore: 90,
    tier: 'EXCELLENT',
    summary: 'Score analysis',
    deductions: [],
    breakdown: { networkScore: 20, headerScore: 25, fingerprintScore: 25, securityScore: 20 },
    factors: [
      {
        id: 'SEC_GPC_DISABLED',
        name: 'Global Privacy Control',
        category: 'HEADERS',
        severity: 'low',
        points: 0,
        detected: false,
        available: true,
        status: 'SAFE',
        currentValue: '1',
        reason: 'GPC Active',
        description: 'GPC Active',
        source: 'headers',
      },
    ],
  };

  const { findings } = generateRemediationFindings(currentAnalysis, prevAnalysis);
  const gpc = findings.find((f) => f.id === 'SEC_GPC_DISABLED');
  assert.strictEqual(gpc?.status, 'RESOLVED', 'Resolved issue should transition to RESOLVED');
}

// 15. State transitions: IMPROVED when penalty decreases
console.log('15. Testing state transitions: IMPROVED when penalty decreases...');
{
  const prevAnalysis: PrivacyScoreAnalysis = {
    privacyScore: 60,
    tier: 'MODERATE',
    summary: 'Score analysis',
    deductions: [],
    breakdown: { networkScore: 10, headerScore: 20, fingerprintScore: 15, securityScore: 15 },
    factors: [
      {
        id: 'WEBRTC_LEAK',
        name: 'WebRTC Leak',
        category: 'NETWORK',
        severity: 'critical',
        points: 20,
        detected: true,
        available: true,
        status: 'DANGER',
        currentValue: '192.168.1.1',
        reason: 'Leaking multiple IPs',
        description: 'Leaking multiple IPs',
        source: 'browser',
      },
    ],
  };

  const currentAnalysis: PrivacyScoreAnalysis = {
    privacyScore: 70,
    tier: 'MODERATE',
    summary: 'Score analysis',
    deductions: [],
    breakdown: { networkScore: 20, headerScore: 20, fingerprintScore: 15, securityScore: 15 },
    factors: [
      {
        id: 'WEBRTC_LEAK',
        name: 'WebRTC Leak',
        category: 'NETWORK',
        severity: 'high',
        points: 10,
        detected: true,
        available: true,
        status: 'WARNING',
        currentValue: 'mdns',
        reason: 'Reduced leak footprint',
        description: 'Reduced leak footprint',
        source: 'browser',
      },
    ],
  };

  const { findings } = generateRemediationFindings(currentAnalysis, prevAnalysis);
  assert.strictEqual(findings[0].status, 'IMPROVED', 'Decreased penalty should transition to IMPROVED');
}

// 16. State transitions: WORSENED when penalty increases
console.log('16. Testing state transitions: WORSENED when penalty increases...');
{
  const prevAnalysis: PrivacyScoreAnalysis = {
    privacyScore: 80,
    tier: 'GOOD',
    summary: 'Score analysis',
    deductions: [],
    breakdown: { networkScore: 20, headerScore: 20, fingerprintScore: 20, securityScore: 20 },
    factors: [
      {
        id: 'WEBRTC_LEAK',
        name: 'WebRTC Leak',
        category: 'NETWORK',
        severity: 'high',
        points: 5,
        detected: true,
        available: true,
        status: 'WARNING',
        currentValue: 'mdns',
        reason: 'Minor leak',
        description: 'Minor leak',
        source: 'browser',
      },
    ],
  };

  const currentAnalysis: PrivacyScoreAnalysis = {
    privacyScore: 65,
    tier: 'MODERATE',
    summary: 'Score analysis',
    deductions: [],
    breakdown: { networkScore: 10, headerScore: 20, fingerprintScore: 20, securityScore: 15 },
    factors: [
      {
        id: 'WEBRTC_LEAK',
        name: 'WebRTC Leak',
        category: 'NETWORK',
        severity: 'critical',
        points: 20,
        detected: true,
        available: true,
        status: 'DANGER',
        currentValue: '192.168.1.5',
        reason: 'Full local IP exposed',
        description: 'Full local IP exposed',
        source: 'browser',
      },
    ],
  };

  const { findings } = generateRemediationFindings(currentAnalysis, prevAnalysis);
  assert.strictEqual(findings[0].status, 'WORSENED', 'Increased penalty should transition to WORSENED');
}

// 17. State transitions: UNCHANGED when penalty remains identical
console.log('17. Testing state transitions: UNCHANGED when points remain identical...');
{
  const prevAnalysis: PrivacyScoreAnalysis = {
    privacyScore: 70,
    tier: 'MODERATE',
    summary: 'Score analysis',
    deductions: [],
    breakdown: { networkScore: 20, headerScore: 15, fingerprintScore: 20, securityScore: 15 },
    factors: [
      {
        id: 'SEC_GPC_DISABLED',
        name: 'Global Privacy Control',
        category: 'HEADERS',
        severity: 'high',
        points: 5,
        detected: true,
        available: true,
        status: 'WARNING',
        currentValue: '0',
        reason: 'Missing GPC',
        description: 'Missing GPC',
        source: 'headers',
      },
    ],
  };

  const currentAnalysis: PrivacyScoreAnalysis = {
    privacyScore: 70,
    tier: 'MODERATE',
    summary: 'Score analysis',
    deductions: [],
    breakdown: { networkScore: 20, headerScore: 15, fingerprintScore: 20, securityScore: 15 },
    factors: [
      {
        id: 'SEC_GPC_DISABLED',
        name: 'Global Privacy Control',
        category: 'HEADERS',
        severity: 'high',
        points: 5,
        detected: true,
        available: true,
        status: 'WARNING',
        currentValue: '0',
        reason: 'Missing GPC',
        description: 'Missing GPC',
        source: 'headers',
      },
    ],
  };

  const { findings } = generateRemediationFindings(currentAnalysis, prevAnalysis);
  assert.strictEqual(findings[0].status, 'UNCHANGED', 'Identical penalty should transition to UNCHANGED');
}

// 18. Clean slate when score is 100 with zero deductions
console.log('18. Testing clean slate when score is 100 with zero deductions...');
{
  const perfectAnalysis: PrivacyScoreAnalysis = {
    privacyScore: 100,
    tier: 'EXCELLENT',
    summary: 'Score analysis',
    deductions: [],
    breakdown: { networkScore: 25, headerScore: 25, fingerprintScore: 25, securityScore: 25 },
    factors: [
      {
        id: 'SEC_GPC_SIGNAL',
        name: 'Sec-GPC Active',
        category: 'HEADERS',
        severity: 'low',
        points: 0,
        detected: false,
        available: true,
        status: 'SAFE',
        currentValue: '1',
        reason: 'Opt-out active',
        description: 'Opt-out active',
        source: 'headers',
      },
      {
        id: 'WEBRTC_SHIELD',
        name: 'WebRTC Shielded',
        category: 'NETWORK',
        severity: 'low',
        points: 0,
        detected: false,
        available: true,
        status: 'SAFE',
        currentValue: 'shielded',
        reason: 'No leaks',
        description: 'No leaks',
        source: 'browser',
      },
    ],
  };

  const { findings, summary } = generateRemediationFindings(perfectAnalysis);
  assert.strictEqual(findings.length, 0, 'Should have 0 active remediation findings');
  assert.strictEqual(summary.actionable, 0, 'Actionable count should be 0');
}

// 19. Multi-factor grouping flags
console.log('19. Testing multi-factor grouping integrity...');
{
  const analysis: PrivacyScoreAnalysis = {
    privacyScore: 60,
    tier: 'MODERATE',
    summary: 'Score analysis',
    deductions: [],
    breakdown: { networkScore: 20, headerScore: 20, fingerprintScore: 10, securityScore: 10 },
    factors: [
      {
        id: 'CANVAS_FINGERPRINT',
        name: 'Canvas',
        category: 'FINGERPRINT',
        severity: 'medium',
        points: 5,
        detected: true,
        available: true,
        status: 'WARNING',
        currentValue: 'unique',
        reason: 'Canvas entropy exposed',
        description: 'Canvas entropy exposed',
        source: 'browser',
      },
      {
        id: 'WEBGL_FINGERPRINT',
        name: 'WebGL',
        category: 'FINGERPRINT',
        severity: 'medium',
        points: 5,
        detected: true,
        available: true,
        status: 'WARNING',
        currentValue: 'unique',
        reason: 'WebGL parameters unmasked',
        description: 'WebGL parameters unmasked',
        source: 'browser',
      },
    ],
  };

  const { findings } = generateRemediationFindings(analysis);
  const composite = findings.find((f) => f.isMultiFactor);
  assert.ok(composite?.isMultiFactor === true, 'Composite must set isMultiFactor: true');
  assert.ok(composite?.affectedFactorIds.includes('CANVAS_FINGERPRINT'), 'Must list CANVAS_FINGERPRINT in affectedFactorIds');
  assert.ok(composite?.affectedFactorIds.includes('WEBGL_FINGERPRINT'), 'Must list WEBGL_FINGERPRINT in affectedFactorIds');
}

// 20. Deep dive anchor routes
console.log('20. Testing deep dive anchor routes...');
{
  const analysis: PrivacyScoreAnalysis = {
    privacyScore: 70,
    tier: 'MODERATE',
    summary: 'Score analysis',
    deductions: [],
    breakdown: { networkScore: 20, headerScore: 20, fingerprintScore: 15, securityScore: 15 },
    factors: [
      {
        id: 'WEBRTC_LEAK',
        name: 'WebRTC Leak',
        category: 'FINGERPRINT',
        severity: 'critical',
        points: 20,
        detected: true,
        available: true,
        status: 'DANGER',
        currentValue: '192.168.1.1',
        reason: 'Local IP exposed',
        description: 'Local IP exposed',
        source: 'browser',
      },
      {
        id: 'SEC_GPC_DISABLED',
        name: 'Sec-GPC Disabled',
        category: 'HEADERS',
        severity: 'high',
        points: 5,
        detected: true,
        available: true,
        status: 'WARNING',
        currentValue: '0',
        reason: 'GPC missing',
        description: 'GPC missing',
        source: 'headers',
      },
    ],
  };

  const { findings } = generateRemediationFindings(analysis);
  const webrtc = findings.find((f) => f.id === 'WEBRTC_LEAK');
  assert.strictEqual(webrtc?.anchorRoute, '/browser', 'Browser findings route to /browser');

  const gpc = findings.find((f) => f.id === 'SEC_GPC_DISABLED');
  assert.strictEqual(gpc?.anchorRoute, '/headers', 'Headers findings route to /headers');
}

// 21. Summary metrics calculation
console.log('21. Testing summary metric calculation accuracy...');
{
  const analysis: PrivacyScoreAnalysis = {
    privacyScore: 65,
    tier: 'MODERATE',
    summary: 'Score analysis',
    deductions: [],
    breakdown: { networkScore: 15, headerScore: 20, fingerprintScore: 15, securityScore: 15 },
    factors: [
      {
        id: 'WEBRTC_LEAK',
        name: 'WebRTC Leak',
        category: 'NETWORK',
        severity: 'critical',
        points: 20,
        detected: true,
        available: true,
        status: 'DANGER',
        currentValue: '192.168.1.1',
        reason: 'IP leaked',
        description: 'IP leaked',
        source: 'browser',
      },
      {
        id: 'SEC_GPC_DISABLED',
        name: 'Sec-GPC Disabled',
        category: 'HEADERS',
        severity: 'high',
        points: 5,
        detected: true,
        available: true,
        status: 'WARNING',
        currentValue: '0',
        reason: 'GPC disabled',
        description: 'GPC disabled',
        source: 'headers',
      },
      {
        id: 'HOSTING_DATACENTER',
        name: 'Cloud Datacenter Ingress',
        category: 'NETWORK',
        severity: 'low',
        points: 0,
        detected: true,
        available: true,
        status: 'INFO',
        currentValue: 'Google Cloud',
        reason: 'Infrastructure routing',
        description: 'Infrastructure routing',
        source: 'ip',
      },
    ],
  };

  const { summary } = generateRemediationFindings(analysis);
  assert.strictEqual(summary.total, 3, 'Total findings count should be 3');
  assert.strictEqual(summary.actionable, 2, 'Actionable findings count should be 2');
  assert.strictEqual(summary.infrastructureControlled, 1, 'Infrastructure controlled count should be 1');
  assert.strictEqual(summary.byCategory.network, 2, 'Network findings count should be 2');
  assert.strictEqual(summary.byCategory.headers, 1, 'Headers findings count should be 1');
}

// 22. Invariant: Authoritative score consumption (No competing scoring)
console.log('22. Testing invariant: Remediation center strictly consumes authoritative PrivacyScoreAnalysis...');
{
  const ipDetails = {
    ip: '127.0.0.1',
    geo: { country: 'Local', countryCode: 'LO', region: 'Local', city: 'Local', postalCode: '00000', latitude: 0, longitude: 0, timezone: 'UTC' },
    network: { isp: 'Local Loopback', organization: 'Local', asn: 'AS0', isMobile: false, isProxy: false, isVpn: false, isTor: false, isHosting: false },
  };

  const authoritativeScore = engine.evaluate({ ipDetails: ipDetails as any, customHeaders: null, fingerprint: null });
  assert.ok(authoritativeScore.factors.length > 0, 'Factor registry produces authoritative factors');
  const { findings } = generateRemediationFindings(authoritativeScore);

  // Assert that each finding's potential recovery strictly matches deductions from authoritative engine
  for (const finding of findings) {
    if (finding.status !== 'RESOLVED') {
      const originalFactor = authoritativeScore.factors.find((f) => f.id === finding.id);
      if (originalFactor) {
        assert.strictEqual(
          finding.scoreImpact,
          Math.abs(originalFactor.points),
          'Finding score impact must match authoritative factor points exactly'
        );
      }
    }
  }
}

console.log('============================================================');
console.log('ALL 22 FIX 6 REMEDIATION CENTER TESTS PASSED SUCCESSFULLY!');
console.log('============================================================');
