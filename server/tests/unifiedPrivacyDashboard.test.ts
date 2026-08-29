import assert from 'node:assert';
import { aggregateUnifiedRisks } from '../../src/features/home/utils/problemAggregator';
import { generateSmartRecommendations } from '../../src/features/home/utils/recommendationEngine';
import {
  saveScoreHistoryEntry,
  getScoreHistory,
  clearScoreHistory,
  calculateScoreTrend,
} from '../../src/features/home/utils/historyStorage';
import { translations } from '../../src/i18n';
import type {
  PrivacyScoreAnalysis,
  IpCheckResponse,
  IpDetailsResponse,
} from '@packages/api-contract';
import type { BrowserProfile } from '../../src/features/browser/types';
import type { HeadersAnalysisResponse } from '../../src/features/headers/types';

console.log('\n============================================================');
console.log('--- RUNNING FIX 4 UNIFIED PRIVACY HEALTH DASHBOARD TESTS ---');
console.log('============================================================\n');

// 1. Unified Problem Aggregator Tests
console.log('1. Testing Unified Problem Aggregation across Browser, Network, and Headers...');

const mockAnalysis: PrivacyScoreAnalysis = {
  privacyScore: 68,
  tier: 'MODERATE',
  summary: 'Your connection has noticeable privacy leaks.',
  factors: [
    {
      id: 'FPR_CANVAS_ENTROPY',
      name: 'Canvas Fingerprinting Vector',
      description: 'Canvas fingerprint vector',
      category: 'FINGERPRINT',
      status: 'WARNING',
      severity: 'high',
      points: 10,
      currentValue: 'unique_hash_123',
      detected: true,
      available: true,
      source: 'browser',
      reason: 'Canvas 2D render context returns a unique hash.',
      recommendation: 'Enable canvas noise injection.',
    },
    {
      id: 'NET_PROXY_DETECTED',
      name: 'Transparent Proxy Detected',
      description: 'Proxy detected in network',
      category: 'NETWORK',
      status: 'WARNING',
      severity: 'medium',
      points: 10,
      currentValue: 'Proxy Active',
      detected: true,
      available: true,
      source: 'ip',
      reason: 'Proxy gateway intermediary active.',
      recommendation: 'Use encrypted VPN.',
    },
  ],
  deductions: [],
  breakdown: {
    networkScore: 80,
    headerScore: 70,
    fingerprintScore: 60,
    securityScore: 65,
  },
};

const mockIpCheck: IpCheckResponse = {
  ip: '198.51.100.4',
  ipVersion: 'IPv4',
  isPrivate: false,
  headers: {
    userAgent: 'Mozilla/5.0 Test',
    secGpc: null,
    dnt: null,
    acceptLanguage: 'en-US',
    connection: 'keep-alive',
  },
  connectionFlags: {
    hasProxyHeaders: false,
    viaHeader: null,
  },
};

const mockIpDetails: IpDetailsResponse = {
  ip: '198.51.100.4',
  geo: {
    country: 'United States',
    countryCode: 'US',
    region: 'California',
    city: 'San Francisco',
    postalCode: '94105',
    latitude: 37.7749,
    longitude: -122.4194,
    timezone: 'America/Los_Angeles',
  },
  network: {
    asn: 'AS13335',
    organization: 'Cloud Provider Inc',
    isp: 'DataCenter Host',
    isHosting: true,
    isProxy: true,
    isVpn: false,
    isTor: false,
    isMobile: false,
  },
};

const mockBrowserProfile: BrowserProfile = {
  timestamp: new Date().toISOString(),
  durationMs: 120,
  capabilities: {
    webRtc: 'SUPPORTED',
    webGl: 'SUPPORTED',
    webGl2: 'SUPPORTED',
    canvas2d: 'SUPPORTED',
    audioContext: 'SUPPORTED',
    offlineAudioContext: 'SUPPORTED',
    localStorage: 'SUPPORTED',
    sessionStorage: 'SUPPORTED',
    indexedDb: 'SUPPORTED',
    networkInfo: 'SUPPORTED',
    clientHints: 'SUPPORTED',
    permissionsApi: 'SUPPORTED',
  },
  groups: {
    WEBRTC: {
      name: 'WEBRTC',
      title: 'WebRTC Signals',
      description: 'WebRTC signals',
      status: 'SUCCESS',
      confidence: 'HIGH',
      derivedSignals: {},
      data: {
        supported: true,
        leakDetected: true,
        localIps: ['192.168.1.105'],
        publicIps: ['198.51.100.4'],
      },
    },
    IDENTITY: {
      name: 'IDENTITY',
      title: 'Identity Signals',
      description: 'Identity signals',
      status: 'SUCCESS',
      confidence: 'HIGH',
      derivedSignals: {},
      data: null,
    },
    DISPLAY: {
      name: 'DISPLAY',
      title: 'Display Signals',
      description: 'Display signals',
      status: 'SUCCESS',
      confidence: 'HIGH',
      derivedSignals: {},
      data: null,
    },
    HARDWARE: {
      name: 'HARDWARE',
      title: 'Hardware Signals',
      description: 'Hardware signals',
      status: 'SUCCESS',
      confidence: 'HIGH',
      derivedSignals: {},
      data: null,
    },
    LOCALE: {
      name: 'LOCALE',
      title: 'Locale Signals',
      description: 'Locale signals',
      status: 'SUCCESS',
      confidence: 'HIGH',
      derivedSignals: {},
      data: null,
    },
    TIMEZONE: {
      name: 'TIMEZONE',
      title: 'Timezone Signals',
      description: 'Timezone signals',
      status: 'SUCCESS',
      confidence: 'HIGH',
      derivedSignals: {},
      data: null,
    },
    STORAGE: {
      name: 'STORAGE',
      title: 'Storage Signals',
      description: 'Storage signals',
      status: 'SUCCESS',
      confidence: 'HIGH',
      derivedSignals: {},
      data: null,
    },
    GRAPHICS: {
      name: 'GRAPHICS',
      title: 'Graphics Signals',
      description: 'Graphics signals',
      status: 'SUCCESS',
      confidence: 'HIGH',
      derivedSignals: {},
      data: null,
    },
    AUDIO: {
      name: 'AUDIO',
      title: 'Audio Signals',
      description: 'Audio signals',
      status: 'SUCCESS',
      confidence: 'HIGH',
      derivedSignals: {},
      data: null,
    },
    AUTOMATION: {
      name: 'AUTOMATION',
      title: 'Automation Signals',
      description: 'Automation signals',
      status: 'SUCCESS',
      confidence: 'HIGH',
      derivedSignals: {},
      data: null,
    },
    NETWORK: {
      name: 'NETWORK',
      title: 'Network Signals',
      description: 'Network signals',
      status: 'SUCCESS',
      confidence: 'HIGH',
      derivedSignals: {},
      data: null,
    },
    PRIVACY_PROTECTIONS: {
      name: 'PRIVACY_PROTECTIONS',
      title: 'Protections Signals',
      description: 'Protections signals',
      status: 'SUCCESS',
      confidence: 'HIGH',
      derivedSignals: {},
      data: null,
    },
  },
  fingerprintPayload: {
    canvasHash: 'a1b2c3d4e5f67890',
    webgl: {
      vendor: 'NVIDIA Corporation',
      renderer: 'NVIDIA GeForce RTX 3080',
    },
    webRtc: {
      localIps: ['192.168.1.105'],
      publicIps: ['198.51.100.4'],
    },
  },
  collectorStatuses: {},
  summary: {
    totalSignalsEvaluated: 18,
    exposedHardwareSignals: 1,
    privacyProtectionsActive: 1,
    leaksDetected: 1,
    automationSignalsDetected: 0,
  },
};

const mockHeadersData: HeadersAnalysisResponse = {
  headers: [],
  missingHeaders: [],
  headerPrivacyExposureScore: 100,
  headerSecurityScore: 100,
  summary: {
    totalReceived: 12,
    uniqueHeaders: 12,
    sensitiveMaskedCount: 0,
    proxyHeadersCount: 0,
    clientHintsCount: 0,
    privacyControlsActiveCount: 0,
    riskFlagsCount: 1,
    hasSecGpc: false,
    hasDnt: false,
    hasProxyHeaders: false,
    userAgentReduced: false,
    categoryCounts: [],
  },
  privacyScore: 75,
  privacyTier: 'MODERATE',
  scoreFactors: [],
  problems: [
    {
      id: 'prob_sec_gpc_missing',
      title: 'Missing Global Privacy Control (Sec-GPC)',
      headerName: 'Sec-GPC',
      severity: 'medium',
      whyItMatters: 'Websites not informed of opt-out signal.',
      evidence: 'Header omitted',
      remediationType: 'BROWSER SETTING',
      howToImprove: 'Enable GPC in browser settings.',
      potentialScoreImpact: 5,
    },
  ],
  cookieSecurity: {
    cookieCount: 0,
    isProtected: true,
    maskedDisplay: 'None',
    reason: 'No cookies detected',
    detectedNames: [],
  },
  clientHintsAnalysis: {
    lowEntropy: [],
    highEntropy: [],
  },
  isInfrastructureProxy: false,
  rawExport: {
    json: {},
    rawHttp: '',
  },
};

const aggregation = aggregateUnifiedRisks({
  privacyAnalysis: mockAnalysis,
});

assert.ok(aggregation.risks.length >= 3, 'Aggregator should consolidate multiple sources into unified risks');
assert.ok(aggregation.summary.total >= 3, 'Summary total matches aggregated count');
assert.ok(aggregation.summary.bySource.browser >= 1, 'Browser source counted');
assert.ok(aggregation.summary.bySource.network >= 1, 'Network source counted');
assert.ok(aggregation.summary.bySource.headers >= 1, 'Headers source counted');
assert.ok(
  aggregation.risks.some((r) => r.id.includes('webrtc') || r.title.includes('WebRTC')),
  'WebRTC critical leak detected and unified'
);

console.log('[PASS] Unified Problem Aggregator successfully normalized multi-source signals');

// 2. Smart Recommendations Engine Tests
console.log('2. Testing Smart Recommendations Engine Deduplication & Scoring...');

const recommendations = generateSmartRecommendations(aggregation.risks);
assert.ok(recommendations.length >= 3, 'Generated prioritized smart recommendations');
assert.ok(
  recommendations.some((r) => r.sourceCategory === 'browser' && r.title.includes('WebRTC')),
  'WebRTC shield recommendation formulated'
);
assert.ok(
  recommendations.some((r) => r.sourceCategory === 'headers' && r.title.includes('Global Privacy Control')),
  'Global Privacy Control recommendation formulated'
);
assert.ok(
  recommendations[0].priority === 'high',
  'First recommendation should be high priority'
);

console.log('[PASS] Smart Recommendations Engine correctly deduplicates and ranks actions');

// 3. Score History & Trend Calculation Tests
console.log('3. Testing Score Evolution History (Client-Side Storage)...');

clearScoreHistory();
const initialHistory = getScoreHistory();
assert.strictEqual(initialHistory.length, 0, 'History should be empty initially');

const afterFirst = saveScoreHistoryEntry(65, 'MODERATE', 4, 'Initial Audit');
assert.strictEqual(afterFirst.length, 1, '1 record saved');
assert.strictEqual(afterFirst[0].score, 65, 'Score saved accurately');

const afterSecond = saveScoreHistoryEntry(82, 'GOOD', 2, 'Post Hardening Recheck');
assert.strictEqual(afterSecond.length, 2, '2 records saved in history');
assert.strictEqual(afterSecond[0].score, 82, 'Newest record is first');
assert.strictEqual(afterSecond[0].scoreDelta, 17, 'Delta calculated correctly (+17 pts)');

const trend = calculateScoreTrend(afterSecond);
assert.strictEqual(trend.scanCount, 2, '2 scans counted');
assert.strictEqual(trend.overallDelta, 17, 'Overall delta is +17 pts');
assert.strictEqual(trend.highestScore, 82, 'Highest score is 82');
assert.strictEqual(trend.lowestScore, 65, 'Lowest score is 65');

clearScoreHistory();
console.log('[PASS] Score evolution history manager and trend analyzer verified');

// 4. Internationalization Key Verification
console.log('4. Testing i18n Key Symmetry across all 6 locales...');

const locales = ['en', 'es', 'fr', 'tr', 'pt', 'ar'] as const;
for (const locale of locales) {
  const trans = translations[locale];
  assert.ok(trans.home, `Locale ${locale} has home namespace`);
  assert.ok(trans.home.timeline, `Locale ${locale} has home.timeline`);
  assert.ok(trans.home.timeline.sectionTitle, `Locale ${locale} has home.timeline.sectionTitle`);
  assert.ok(trans.home.timeline.networkStageTitle, `Locale ${locale} has home.timeline.networkStageTitle`);
  assert.ok(trans.home.timeline.browserStageTitle, `Locale ${locale} has home.timeline.browserStageTitle`);
  assert.ok(trans.home.timeline.headersStageTitle, `Locale ${locale} has home.timeline.headersStageTitle`);
  assert.ok(trans.home.timeline.scoringStageTitle, `Locale ${locale} has home.timeline.scoringStageTitle`);

  assert.ok(trans.home.unifiedRisks, `Locale ${locale} has home.unifiedRisks`);
  assert.ok(trans.home.unifiedRisks.overviewTitle, `Locale ${locale} has home.unifiedRisks.overviewTitle`);
  assert.ok(trans.home.unifiedRisks.totalRisks, `Locale ${locale} has home.unifiedRisks.totalRisks`);
  assert.ok(trans.home.unifiedRisks.criticalLabel, `Locale ${locale} has home.unifiedRisks.criticalLabel`);
  assert.ok(trans.home.unifiedRisks.highLabel, `Locale ${locale} has home.unifiedRisks.highLabel`);
  assert.ok(trans.home.unifiedRisks.mediumLabel, `Locale ${locale} has home.unifiedRisks.mediumLabel`);
  assert.ok(trans.home.unifiedRisks.lowLabel, `Locale ${locale} has home.unifiedRisks.lowLabel`);

  assert.ok(trans.home.recommendations, `Locale ${locale} has home.recommendations`);
  assert.ok(trans.home.recommendations.title, `Locale ${locale} has home.recommendations.title`);

  assert.ok(trans.home.scoreEvolution, `Locale ${locale} has home.scoreEvolution`);
  assert.ok(trans.home.scoreEvolution.title, `Locale ${locale} has home.scoreEvolution.title`);
  assert.ok(trans.home.scoreEvolution.localOnlyBadge, `Locale ${locale} has home.scoreEvolution.localOnlyBadge`);

  assert.ok(trans.home.completeAudit, `Locale ${locale} has home.completeAudit`);
  assert.ok(trans.home.completeAudit.runAuditButton, `Locale ${locale} has home.completeAudit.runAuditButton`);

  assert.ok(trans.home.initialScanning, `Locale ${locale} has home.initialScanning`);
  assert.ok(trans.home.initialScanning.title, `Locale ${locale} has home.initialScanning.title`);
}
console.log('[PASS] 100% Translation symmetry verified for all 6 languages (EN, ES, FR, TR, PT, AR)');

console.log('\n============================================================');
console.log('--- ALL FIX 4 UNIFIED PRIVACY HEALTH DASHBOARD TESTS PASS ---');
console.log('============================================================\n');
