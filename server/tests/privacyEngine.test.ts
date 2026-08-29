import assert from 'node:assert';
import { FactorRegistry } from '../privacy/factors/FactorRegistry';
import { PrivacyEngine } from '../privacy/PrivacyEngine';
import { PrivacyService } from '../services/privacyService';
import type { PrivacyEngineInput } from '../privacy/types';
import type { BrowserFingerprintInput, IpCheckResponse, IpDetailsResponse } from '@packages/api-contract';

console.log('==================================================');
console.log('RUNNING STAGE 7 PRIVACY SCORE ENGINE TESTS');
console.log('==================================================');

const registry = new FactorRegistry();
const engine = new PrivacyEngine(registry);

// 1. Empty/Minimal input
{
  const result = engine.evaluate({});
  assert.strictEqual(result.privacyScore, 100, 'Minimal input should have base score of 100');
  assert.strictEqual(result.tier, 'EXCELLENT', '100 score should map to EXCELLENT tier');
  assert.strictEqual(result.deductions.length, 0, 'No deductions for empty input');
  assert.ok(result.factors.length > 0, 'Factors should be listed even if unavailable');
  assert.ok(result.factors.every((f) => !f.available || !f.detected), 'No factor should trigger false positive');
  console.log('[PASS] 1. Empty/minimal input returns bounded 100 with zero deductions');
}

// 2. All-safe input (Ideal privacy setup)
{
  const safeIpCheck: IpCheckResponse = {
    ip: '8.8.8.8',
    ipVersion: 'IPv4',
    isPrivate: false,
    headers: {
      secGpc: '1',
      dnt: '1',
      userAgent: '',
      acceptLanguage: 'en-US,en;q=0.9',
      connection: 'keep-alive',
    },
    connectionFlags: {
      hasProxyHeaders: false,
      viaHeader: null,
    },
  };

  const safeIpDetails: IpDetailsResponse = {
    ip: '8.8.8.8',
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
      organization: 'Google Public DNS',
      asn: 'AS15169',
      isMobile: false,
      isProxy: false,
      isHosting: false,
      isVpn: false,
      isTor: false,
    },
  };

  const safeFingerprint: BrowserFingerprintInput = {
    webRtc: { localIps: [], publicIps: ['8.8.8.8'] },
    securityFlags: { isAutomation: false, isIncognito: false },
  };

  const result = engine.evaluate({
    ipCheck: safeIpCheck,
    ipDetails: safeIpDetails,
    fingerprint: safeFingerprint,
  });

  assert.strictEqual(result.privacyScore, 100, 'All-safe input should have 100 score');
  assert.strictEqual(result.tier, 'EXCELLENT');
  assert.strictEqual(result.deductions.length, 0);
  console.log('[PASS] 2. All-safe input returns 100 score with EXCELLENT tier');
}

// 3. Single warning factor (Hosting datacenter IP: 0 pts informational)
{
  const hostingIpDetails: IpDetailsResponse = {
    ip: '1.2.3.4',
    geo: {
      country: 'United States',
      countryCode: 'US',
      region: 'VA',
      city: 'Ashburn',
      postalCode: '20147',
      latitude: 39.0438,
      longitude: -77.4874,
      timezone: 'America/New_York',
    },
    network: {
      isp: 'Amazon.com',
      organization: 'AWS EC2',
      asn: 'AS16509',
      isMobile: false,
      isProxy: false,
      isHosting: true,
      isVpn: false,
      isTor: false,
    },
  };

  const result = engine.evaluate({
    ipDetails: hostingIpDetails,
  });

  assert.strictEqual(result.privacyScore, 100, 'Hosting IP deduction is 0 (informational)');
  assert.strictEqual(result.tier, 'EXCELLENT', '100 is EXCELLENT tier');
  const hostingFactor = result.factors.find((f) => f.id === 'NET_HOSTING_DATACENTER');
  assert.ok(hostingFactor);
  assert.strictEqual(hostingFactor?.points, 0);
  assert.strictEqual(hostingFactor?.status, 'INFO');
  console.log('[PASS] 3. Single warning factor (Hosting datacenter) is informational 0 pts');
}

// 4. Proxy connection is contextual/informational (no privacy deduction)
{
  const proxyDetails: IpDetailsResponse = {
    ip: '5.6.7.8',
    geo: {
      country: 'Germany',
      countryCode: 'DE',
      region: 'HE',
      city: 'Frankfurt',
      postalCode: '60311',
      latitude: 50.1109,
      longitude: 8.6821,
      timezone: 'Europe/Berlin',
    },
    network: {
      isp: 'Transparent Proxy Ltd',
      organization: 'Proxy Network',
      asn: 'AS12345',
      isMobile: false,
      isProxy: true,
      isHosting: false,
      isVpn: false,
      isTor: false,
    },
  };

  const result = engine.evaluate({
    ipDetails: proxyDetails,
  });

  assert.strictEqual(result.privacyScore, 100, 'Proxy classification is contextual and has no privacy deduction');
  assert.strictEqual(result.tier, 'EXCELLENT', '100 is EXCELLENT tier');
  assert.strictEqual(result.deductions.length, 0);
  console.log('[PASS] 4. Proxy classification does not create a privacy deduction');
}

// 5. Multiple factors combined
{
  const input: PrivacyEngineInput = {
    ipCheck: {
      ip: '1.2.3.4',
      ipVersion: 'IPv4',
      isPrivate: false,
      headers: {
        secGpc: '0', // informational only; 0 pts
        dnt: '0',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', // informational only; 0 pts
        acceptLanguage: 'en-US,en;q=0.9',
        connection: 'keep-alive',
      },
      connectionFlags: {
        hasProxyHeaders: true, // informational/contextual only; 0 pts
        viaHeader: '1.1 squid',
      },
    },
    ipDetails: {
      ip: '1.2.3.4',
      geo: {
        country: 'US',
        countryCode: 'US',
        region: 'CA',
        city: 'San Jose',
        postalCode: '95101',
        latitude: 37.3382,
        longitude: -121.8863,
        timezone: 'America/Los_Angeles',
      },
      network: {
        isp: 'Cloud Datacenter',
        organization: 'Hosting Corp',
        asn: 'AS99999',
        isMobile: false,
        isProxy: true, // informational/contextual only; 0 pts
        isHosting: true, // 0 pts (informational)
        isVpn: false,
        isTor: false,
      },
    },
  };

  // Proxy/network/header presence is contextual and informational; no deductions apply.
  const result = engine.evaluate(input);
  assert.strictEqual(result.privacyScore, 75);
  assert.strictEqual(result.tier, 'MODERATE', 'Score 68 is MODERATE tier (40-69)');
  assert.strictEqual(result.deductions.length, 2);
  assert.strictEqual(result.breakdown.networkScore, 85); // 100 - 15
  assert.strictEqual(result.breakdown.headerScore, 90); // 100 - 10
  console.log('[PASS] 5. Multiple factors combine correctly with breakdown and MODERATE tier');
}

// 6. VPN detected (Informational factor - no penalty)
{
  const vpnDetails: IpDetailsResponse = {
    ip: '104.28.1.1',
    geo: {
      country: 'Netherlands',
      countryCode: 'NL',
      region: 'NH',
      city: 'Amsterdam',
      postalCode: '1012',
      latitude: 52.3676,
      longitude: 4.9041,
      timezone: 'Europe/Amsterdam',
    },
    network: {
      isp: 'Mullvad VPN',
      organization: 'Mullvad',
      asn: 'AS209854',
      isMobile: false,
      isProxy: false,
      isHosting: false,
      isVpn: true,
      isTor: false,
    },
  };

  const result = engine.evaluate({
    ipDetails: vpnDetails,
  });

  assert.strictEqual(result.privacyScore, 100, 'VPN should not penalize score');
  const vpnFactor = result.factors.find((f) => f.id === 'NET_VPN_DETECTED');
  assert.ok(vpnFactor);
  assert.strictEqual(vpnFactor?.status, 'INFO');
  assert.strictEqual(vpnFactor?.points, 0);
  console.log('[PASS] 6. VPN detection treated as non-penalizing informational cloak');
}

// 7. Tor detected (Informational / Safe - no penalty)
{
  const torDetails: IpDetailsResponse = {
    ip: '185.220.101.5',
    geo: {
      country: 'Germany',
      countryCode: 'DE',
      region: 'SN',
      city: 'Dresden',
      postalCode: '01067',
      latitude: 51.0504,
      longitude: 13.7373,
      timezone: 'Europe/Berlin',
    },
    network: {
      isp: 'Zwiebelfreunde',
      organization: 'Tor Exit Node',
      asn: 'AS200651',
      isMobile: false,
      isProxy: false,
      isHosting: false,
      isVpn: false,
      isTor: true,
    },
  };

  const result = engine.evaluate({
    ipDetails: torDetails,
  });

  assert.strictEqual(result.privacyScore, 100, 'Tor exit node should not penalize score');
  const torFactor = result.factors.find((f) => f.id === 'NET_TOR_DETECTED');
  assert.strictEqual(torFactor?.status, 'SAFE');
  console.log('[PASS] 7. Tor exit node detected without false score penalty');
}

// 8. Mobile carrier CGNAT state (Informational - no penalty)
{
  const mobileDetails: IpDetailsResponse = {
    ip: '172.56.21.89',
    geo: {
      country: 'United States',
      countryCode: 'US',
      region: 'WA',
      city: 'Seattle',
      postalCode: '98101',
      latitude: 47.6062,
      longitude: -122.3321,
      timezone: 'America/Los_Angeles',
    },
    network: {
      isp: 'T-Mobile USA',
      organization: 'T-Mobile',
      asn: 'AS21928',
      isMobile: true,
      isProxy: false,
      isHosting: false,
      isVpn: false,
      isTor: false,
    },
  };

  const result = engine.evaluate({
    ipDetails: mobileDetails,
  });

  assert.strictEqual(result.privacyScore, 100);
  const mobileFactor = result.factors.find((f) => f.id === 'NET_MOBILE_CARRIER');
  assert.strictEqual(mobileFactor?.status, 'INFO');
  assert.strictEqual(mobileFactor?.points, 0);
  console.log('[PASS] 8. Mobile CGNAT connection handled as informational');
}

// 9. Unavailable future factors (Stage 8 browser factors) do not cause false penalties
{
  const result = engine.evaluate({
    ipCheck: {
      ip: '8.8.8.8',
      ipVersion: 'IPv4',
      isPrivate: false,
      headers: { secGpc: '1', dnt: '1', userAgent: '', acceptLanguage: 'en', connection: 'keep-alive' },
      connectionFlags: { hasProxyHeaders: false, viaHeader: null },
    },
    fingerprint: null, // No browser collectors yet in Stage 7
  });

  assert.strictEqual(result.privacyScore, 100);
  const webrtcFactor = result.factors.find((f) => f.id === 'FP_WEBRTC_LEAK');
  assert.strictEqual(webrtcFactor?.status, 'UNAVAILABLE');
  assert.strictEqual(webrtcFactor?.available, false);
  assert.strictEqual(webrtcFactor?.points, 0);
  console.log('[PASS] 9. Unavailable future factors marked UNAVAILABLE with 0 deductions');
}

// 10. WebRTC leak when fingerprint is supplied (Stage 8 readiness test)
{
  const result = engine.evaluate({
    fingerprint: {
      webRtc: {
        localIps: ['192.168.1.150'],
        publicIps: ['8.8.8.8'],
      },
    },
  });

  assert.strictEqual(result.privacyScore, 80, 'WebRTC leak deducts 20 pts');
  const webrtcFactor = result.factors.find((f) => f.id === 'FP_WEBRTC_LEAK');
  assert.strictEqual(webrtcFactor?.status, 'DANGER');
  assert.strictEqual(webrtcFactor?.severity, 'critical');
  assert.strictEqual(webrtcFactor?.detected, true);
  console.log('[PASS] 10. WebRTC leak detected when fingerprint provided (-20 pts)');
}

// 11. Automation driver detected (Stage 8 readiness test)
{
  const result = engine.evaluate({
    fingerprint: {
      securityFlags: {
        isAutomation: true,
      },
    },
  });

  assert.strictEqual(result.privacyScore, 100, 'Automation is informational and does not deduct privacy points');
  const autoFactor = result.factors.find((f) => f.id === 'SEC_AUTOMATION_FLAG');
  assert.strictEqual(autoFactor?.status, 'DANGER');
  assert.strictEqual(autoFactor?.detected, true);
  console.log('[PASS] 11. Automation driver flags detected as informational (0 pts)');
}

// 12. Score lower boundary (0 minimum boundary test)
{
  // Create an engine with custom evaluators that produce huge deductions
  const testRegistry = new FactorRegistry();
  testRegistry.register({
    id: 'MASSIVE_LEAK_1',
    evaluate: () => ({
      id: 'MASSIVE_LEAK_1',
      category: 'SECURITY',
      name: 'Catastrophic Leak 1',
      description: 'Test',
      status: 'DANGER',
      severity: 'critical',
      points: -80,
      currentValue: true,
      reason: 'Test',
      detected: true,
      available: true,
      source: 'system',
    }),
  });
  testRegistry.register({
    id: 'MASSIVE_LEAK_2',
    evaluate: () => ({
      id: 'MASSIVE_LEAK_2',
      category: 'SECURITY',
      name: 'Catastrophic Leak 2',
      description: 'Test',
      status: 'DANGER',
      severity: 'critical',
      points: -60,
      currentValue: true,
      reason: 'Test',
      detected: true,
      available: true,
      source: 'system',
    }),
  });

  const heavyEngine = new PrivacyEngine(testRegistry);
  const result = heavyEngine.evaluate({});

  assert.strictEqual(result.privacyScore, 0, 'Score should clamp to minimum 0');
  assert.strictEqual(result.tier, 'CRITICAL', '0 score is CRITICAL tier');
  assert.ok(result.privacyScore >= 0, 'Score is not negative');
  console.log('[PASS] 12. Score clamped to lower boundary 0 with CRITICAL tier');
}

// 13. Score upper boundary (100 maximum boundary test)
{
  const result = engine.evaluate({});
  assert.strictEqual(result.privacyScore, 100, 'Score should not exceed 100');
  assert.ok(result.privacyScore <= 100);
  console.log('[PASS] 13. Score clamped to upper boundary 100');
}

// 14. Exact tier thresholds
{
  const makeEngineWithScore = (targetScore: number) => {
    const r = new FactorRegistry();
    const penalty = 100 - targetScore;
    r.register({
      id: 'TEST_PENALTY',
      evaluate: () => ({
        id: 'TEST_PENALTY',
        category: 'SECURITY',
        name: 'Test Penalty',
        description: 'Test',
        status: 'DANGER',
        severity: 'high',
        points: -penalty,
        currentValue: true,
        reason: 'Test',
        detected: true,
        available: true,
        source: 'system',
      }),
    });
    return new PrivacyEngine(r);
  };

  assert.strictEqual(makeEngineWithScore(85).evaluate({}).tier, 'EXCELLENT');
  assert.strictEqual(makeEngineWithScore(84).evaluate({}).tier, 'GOOD');
  assert.strictEqual(makeEngineWithScore(70).evaluate({}).tier, 'GOOD');
  assert.strictEqual(makeEngineWithScore(69).evaluate({}).tier, 'MODERATE');
  assert.strictEqual(makeEngineWithScore(40).evaluate({}).tier, 'MODERATE');
  assert.strictEqual(makeEngineWithScore(39).evaluate({}).tier, 'CRITICAL');
  assert.strictEqual(makeEngineWithScore(0).evaluate({}).tier, 'CRITICAL');
  console.log('[PASS] 14. Exact tier threshold boundaries (85, 70, 40) strictly verified');
}

// 15. Deterministic repeated calculation
{
  const input: PrivacyEngineInput = {
    ipCheck: {
      ip: '198.51.100.22',
      ipVersion: 'IPv4',
      isPrivate: false,
      headers: { secGpc: '0', dnt: '0', userAgent: 'Chrome/120', acceptLanguage: 'en', connection: 'close' },
      connectionFlags: { hasProxyHeaders: false, viaHeader: null },
    },
  };

  const run1 = engine.evaluate(input);
  const run2 = engine.evaluate(input);
  const run3 = engine.evaluate(input);

  assert.strictEqual(run1.privacyScore, run2.privacyScore);
  assert.strictEqual(run2.privacyScore, run3.privacyScore);
  assert.strictEqual(JSON.stringify(run1), JSON.stringify(run2));
  assert.strictEqual(JSON.stringify(run2), JSON.stringify(run3));
  console.log('[PASS] 15. Identical inputs produce exact bit-for-bit identical outputs');
}

// 16. Explanation generation
{
  const result = engine.evaluate({
    ipDetails: {
      ip: '1.2.3.4',
      geo: {
        country: 'US',
        countryCode: 'US',
        region: 'VA',
        city: 'Ashburn',
        postalCode: '20147',
        latitude: 39,
        longitude: -77,
        timezone: 'America/New_York',
      },
      network: {
        isp: 'Proxy Provider',
        organization: 'Proxy Corp',
        asn: 'AS16509',
        isMobile: false,
        isProxy: true,
        isHosting: false,
        isVpn: false,
        isTor: false,
      },
    },
  });

  assert.ok(result.summary.includes('Transparent Proxy Connection'), 'Summary references primary deduction factor');
  assert.ok(result.summary.includes('85/100'), 'Summary includes formatted score');
  console.log('[PASS] 16. Explainable summary generation includes score and specific factor name');
}

// 17. Recommendation generation
{
  const result = engine.evaluate({
    ipCheck: {
      ip: '1.1.1.1',
      ipVersion: 'IPv4',
      isPrivate: false,
      headers: { secGpc: '0', dnt: '0', userAgent: null, acceptLanguage: null, connection: null },
      connectionFlags: { hasProxyHeaders: false, viaHeader: null },
    },
  });

  const gpcDeduction = result.deductions.find((d) => d.factor.includes('Global Privacy Control'));
  assert.ok(gpcDeduction);
  assert.ok(gpcDeduction?.recommendation?.includes('Enable Global Privacy Control'));
  console.log('[PASS] 17. Recommendations provide actionable mitigation steps');
}

// 18. Invalid and malformed input safety
{
  const malformedInput = {
    ipCheck: { ip: undefined as unknown as string, headers: null as unknown as any },
    ipDetails: { network: null as unknown as any },
    fingerprint: { webRtc: { localIps: null as unknown as string[] } },
  } as unknown as PrivacyEngineInput;

  const result = engine.evaluate(malformedInput);
  assert.ok(typeof result.privacyScore === 'number');
  assert.ok(result.privacyScore >= 0 && result.privacyScore <= 100);
  console.log('[PASS] 18. Malformed/undefined nested input handled safely without throwing');
}

// 19. Factor IDs uniqueness
{
  const factors = engine.evaluate({}).factors;
  const ids = factors.map((f) => f.id);
  const uniqueIds = new Set(ids);
  assert.strictEqual(ids.length, uniqueIds.size, 'All factor IDs in registry must be unique');
  console.log('[PASS] 19. Factor ID uniqueness verified across registry');
}

// 20. Privacy Service integration test
{
  const service = new PrivacyService();
  const mockReq = {
    headers: {
      'x-forwarded-for': '8.8.8.8',
      'sec-gpc': '1',
      'user-agent': 'PrivacyBrowser/1.0',
    },
    socket: {
      remoteAddress: '127.0.0.1',
    },
  } as unknown as any;

  const analysis = await service.evaluateRequest(mockReq, null);
  assert.ok(analysis.privacyScore >= 0 && analysis.privacyScore <= 100);
  assert.ok(analysis.factors.length >= 10);
  assert.ok(analysis.breakdown);
  console.log('[PASS] 20. PrivacyService integrates Express request and GeoIP details seamlessly');
}

console.log('==================================================');
console.log('ALL STAGE 7 PRIVACY SCORE ENGINE TESTS PASSED (20/20)');
console.log('==================================================');
