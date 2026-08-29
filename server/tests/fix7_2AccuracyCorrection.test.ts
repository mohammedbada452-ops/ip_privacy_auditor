import { HeaderClassifier } from '../headers/HeaderClassifier';
import { HeaderCollector } from '../headers/HeaderCollector';
import { HEADER_DEFINITIONS, RECOMMENDED_MISSING_HEADERS } from '../headers/HeaderRegistry';
import { FactorRegistry } from '../privacy/factors/FactorRegistry';
import { PrivacyEngine } from '../privacy/PrivacyEngine';
import type { Request } from 'express';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  [PASS] ${message}`);
}

async function runFix7_2AccuracyCorrectionTests() {
  console.log('============================================================');
  console.log('--- RUNNING FIX 7.2 ACCURACY & EVIDENCE CORRECTION TESTS ---');
  console.log('============================================================\n');

  // --- 1. Testing Empty & Null Client Hints Handling (Issues 1 & 2) ---
  console.log('1. Testing Empty & Populated Client Hints Handling...');
  const mockReqEmptyHints = {
    headers: {
      'host': 'localhost:3000',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      'sec-ch-ua-model': '""',
      'sec-ch-ua-platform-version': '',
      'sec-ch-ua-arch': 'null',
    },
    rawHeaders: [
      'Host', 'localhost:3000',
      'User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      'Sec-CH-UA-Model', '""',
      'Sec-CH-UA-Platform-Version', '',
      'Sec-CH-UA-Arch', 'null',
    ],
  } as unknown as Request;

  const emptyEntries = HeaderCollector.collect(mockReqEmptyHints);
  const emptyAnalysis = HeaderClassifier.analyze(emptyEntries);

  assert(emptyAnalysis.clientHintsAnalysis.highEntropy.length === 0, 'Empty client hints must not be classified as High Entropy');
  assert(emptyAnalysis.clientHintsAnalysis.lowEntropy.length === 3, 'Empty client hints placed safely in low-entropy / unpopulated list');
  const emptyModelHint = emptyAnalysis.headers.find((h) => h.canonicalName === 'Sec-CH-UA-Model');
  assert(emptyModelHint !== undefined && emptyModelHint.riskPoints === 0, 'Empty model hint has 0 risk points');
  assert(emptyModelHint !== undefined && emptyModelHint.privacyStatus === 'INFO', 'Empty model hint status is INFO (not WARNING)');

  // Now test populated high-entropy client hint
  const mockReqPopulatedHints = {
    headers: {
      'host': 'localhost:3000',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      'sec-ch-ua-model': '"MacBookPro18,1"',
    },
    rawHeaders: [
      'Host', 'localhost:3000',
      'User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      'Sec-CH-UA-Model', '"MacBookPro18,1"',
    ],
  } as unknown as Request;

  const populatedEntries = HeaderCollector.collect(mockReqPopulatedHints);
  const populatedAnalysis = HeaderClassifier.analyze(populatedEntries);
  assert(populatedAnalysis.clientHintsAnalysis.highEntropy.length === 1, 'Populated model hint classified as High Entropy');
  assert(populatedAnalysis.clientHintsAnalysis.highEntropy[0].pointsDeduction === 6, 'Populated model hint carries 6 pts deduction');
  const populatedModel = populatedAnalysis.headers.find((h) => h.canonicalName === 'Sec-CH-UA-Model');
  assert(populatedModel !== undefined && populatedModel.privacyStatus === 'WARNING', 'Populated model hint status is WARNING');

  // --- 2. Testing Referer Same-Origin vs Cross-Origin Handling (Issue 3) ---
  console.log('\n2. Testing Referer Same-Origin vs Cross-Origin Handling...');
  const mockReqSameOriginReferer = {
    headers: {
      'host': 'localhost:3000',
      'referer': 'http://localhost:3000/browser',
    },
    rawHeaders: [
      'Host', 'localhost:3000',
      'Referer', 'http://localhost:3000/browser',
    ],
  } as unknown as Request;

  const sameOriginEntries = HeaderCollector.collect(mockReqSameOriginReferer);
  const sameOriginAnalysis = HeaderClassifier.analyze(sameOriginEntries);
  const sameOriginFactor = sameOriginAnalysis.scoreFactors.find((f) => f.id === 'HDR_REFERER_SAME_ORIGIN');
  assert(sameOriginFactor !== undefined && sameOriginFactor.points === 0, 'Same-origin Referer carries 0 pts deduction');
  assert(sameOriginAnalysis.problems.every((p) => p.headerName !== 'Referer'), 'Same-origin Referer creates no problem warning');

  const mockReqCrossOriginReferer = {
    headers: {
      'host': 'localhost:3000',
      'referer': 'https://external-search-engine.com/query?q=confidential',
    },
    rawHeaders: [
      'Host', 'localhost:3000',
      'Referer', 'https://external-search-engine.com/query?q=confidential',
    ],
  } as unknown as Request;

  const crossOriginEntries = HeaderCollector.collect(mockReqCrossOriginReferer);
  const crossOriginAnalysis = HeaderClassifier.analyze(crossOriginEntries);
  const crossOriginFactor = crossOriginAnalysis.scoreFactors.find((f) => f.id === 'HDR_REFERER_CROSS_ORIGIN_EXPOSURE');
  assert(crossOriginFactor !== undefined && crossOriginFactor.points === -4, 'Cross-origin Referer applies -4 pts deduction');
  const crossOriginProblem = crossOriginAnalysis.problems.find((p) => p.headerName === 'Referer');
  assert(crossOriginProblem !== undefined, 'Cross-origin Referer flags problem entry');

  // --- 3. Testing Referrer-Policy Remediation Actor & Phrasing (Issue 4) ---
  console.log('\n3. Testing Referrer-Policy Remediation Actor & Phrasing...');
  assert(crossOriginProblem !== undefined && crossOriginProblem.remediationType.includes('WEBSITE'), 'Remediation indicates website / server configuration actor');
  assert(crossOriginProblem !== undefined && !crossOriginProblem.howToImprove.includes('guarantee'), 'Remediation does not claim absolute guarantee');

  // --- 4. Testing Cookie Evidence & Data Redaction Language (Issues 5 & 6) ---
  console.log('\n4. Testing Cookie Evidence & Data Redaction Language...');
  const mockReqCookies = {
    headers: {
      'host': 'localhost:3000',
      'cookie': 'session_token=secret_val_123; user_pref=dark',
    },
    rawHeaders: [
      'Host', 'localhost:3000',
      'Cookie', 'session_token=secret_val_123; user_pref=dark',
    ],
  } as unknown as Request;

  const cookieEntries = HeaderCollector.collect(mockReqCookies);
  const cookieAnalysis = HeaderClassifier.analyze(cookieEntries);
  assert(cookieAnalysis.cookieSecurity.cookieCount === 2, 'Cookie count accurately detected');
  assert(!cookieAnalysis.cookieSecurity.maskedDisplay.includes('secret_val_123'), 'Cookie values safely masked');
  assert(cookieAnalysis.cookieSecurity.reason.includes('Set-Cookie'), 'Cookie security clarifies Set-Cookie server directives');

  // --- 5. Testing GPC Signal Language & Regulatory Accuracy (Issue 8) ---
  console.log('\n5. Testing GPC Signal Language & Regulatory Accuracy...');
  const gpcDef = HEADER_DEFINITIONS['sec-gpc'];
  assert(gpcDef !== undefined, 'Sec-GPC header definition exists');
  assert(!gpcDef.description.includes('legally prohibits all'), 'Sec-GPC avoids overreaching absolute claims');

  const gpcMissing = RECOMMENDED_MISSING_HEADERS.find((h) => h.canonicalName === 'Sec-GPC');
  assert(gpcMissing !== undefined, 'Sec-GPC recommended missing header definition exists');
  assert(!(gpcMissing?.description ?? '').includes('universal opt-out from data selling and cross-site tracking'), 'Sec-GPC missing header avoids uncalibrated universal claim');

  const factorRegistry = new FactorRegistry();
  const privacyEngine = new PrivacyEngine(factorRegistry);
  const gpcFactor = factorRegistry.evaluateAll({
    ipCheck: {
      ip: '127.0.0.1',
      ipVersion: 'IPv4',
      isPrivate: false,
      headers: {
        userAgent: 'Mozilla/5.0',
        dnt: '0',
        secGpc: '1',
        acceptLanguage: 'en-US',
        connection: 'keep-alive',
      } as any,
      connectionFlags: {} as any,
    } as any,
  }).find((f) => f.id === 'HDR_SEC_GPC_SIGNAL');
  assert(gpcFactor !== undefined && gpcFactor.detected === false, 'Sec-GPC active is recognized as protected');
  assert(gpcFactor !== undefined && !gpcFactor.reason.includes('legally prohibiting data sale'), 'Sec-GPC factor reason avoids absolute legal claim');

  // --- 6. Testing Subsystem Score Separation (Issue 7) ---
  console.log('\n6. Testing Subsystem Score Separation...');
  assert(typeof emptyAnalysis.privacyScore === 'number', 'Header subsystem score is calculated');
  assert(emptyAnalysis.privacyScore >= 0 && emptyAnalysis.privacyScore <= 100, 'Header subsystem score bounded [0, 100]');

  console.log('\n============================================================');
  console.log('ALL FIX 7.2 ACCURACY & EVIDENCE CORRECTION TESTS PASSED (100%)');
  console.log('============================================================\n');
}

runFix7_2AccuracyCorrectionTests().catch((err) => {
  console.error('[FATAL FIX 7.2 TEST ERROR]', err);
  process.exit(1);
});
