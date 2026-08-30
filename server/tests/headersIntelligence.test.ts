import { HEADER_DEFINITIONS, RECOMMENDED_MISSING_HEADERS } from '../headers/HeaderRegistry';
import { HeaderCollector } from '../headers/HeaderCollector';
import { HeaderClassifier } from '../headers/HeaderClassifier';
import type { Request } from 'express';
import type { HeadersAnalysisResponse } from '@packages/api-contract';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`[PASS] ${message}`);
}

async function runHeadersIntelligenceTests() {
  console.log('==================================================');
  console.log('RUNNING STAGE 9 HTTP HEADERS INTELLIGENCE TESTS');
  console.log('==================================================\n');

  // --- 1. Header Registry Integrity Tests ---
  console.log('--- 1. Header Registry Integrity Tests ---');
  const knownKeys = Object.keys(HEADER_DEFINITIONS);
  assert(knownKeys.length >= 30, `1. Header registry contains comprehensive metadata definitions (${knownKeys.length} >= 30)`);
  assert(HEADER_DEFINITIONS['sec-gpc']?.canonicalName === 'Sec-GPC', '2. Sec-GPC canonical name is accurate');
  assert(HEADER_DEFINITIONS['user-agent']?.category === 'IDENTITY_CLIENT_HINTS', '3. User-Agent is categorized as IDENTITY_CLIENT_HINTS');
  assert(RECOMMENDED_MISSING_HEADERS.some((h) => h.canonicalName === 'Sec-GPC'), '4. Recommended missing headers registry contains Sec-GPC');

  // --- 2. Normalization & Case Insensitivity Tests ---
  console.log('\n--- 2. Normalization & Case Insensitivity Tests ---');
  const mockReq1 = {
    headers: {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      'SEC-GPC': '1',
      'AcCePt-LaNgUaGe': 'en-US,en;q=0.9,ar;q=0.8',
    },
    rawHeaders: [
      'User-Agent',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      'SEC-GPC',
      '1',
      'AcCePt-LaNgUaGe',
      'en-US,en;q=0.9,ar;q=0.8',
    ],
  } as unknown as Request;

  const entries1 = HeaderCollector.collect(mockReq1);
  assert(entries1.length === 3, '5. Correctly collects all 3 headers from request');
  const gpcEntry = entries1.find((e) => e.normalizedKey === 'sec-gpc');
  assert(Boolean(gpcEntry && gpcEntry.value === '1'), '6. Normalized SEC-GPC case to sec-gpc');

  const analysis1 = HeaderClassifier.analyze(entries1);
  assert(analysis1.summary.hasSecGpc === true, '7. Identifies active Sec-GPC signal');
  assert(analysis1.summary.privacyControlsActiveCount >= 1, '8. Increments privacyControlsActiveCount');

  // --- 3. Sensitive Header Redaction & Data Minimization Tests ---
  console.log('\n--- 3. Sensitive Header Redaction & Data Minimization Tests ---');
  const mockReqSensitive = {
    headers: {
      authorization: 'Bearer secret_jwt_token_xyz123abc456',
      'proxy-authorization': 'Basic dXNlcjpwYXNzd29yZA==',
      cookie: 'session_id=abc12345; tracker_id=98765; theme=dark',
      'set-cookie': 'tracking_uuid=xyz; Secure; HttpOnly',
      'x-csrf-token': 'csrf_secret_key_8899',
      host: 'localhost:3000',
    },
    rawHeaders: [
      'Authorization',
      'Bearer secret_jwt_token_xyz123abc456',
      'Proxy-Authorization',
      'Basic dXNlcjpwYXNzd29yZA==',
      'Cookie',
      'session_id=abc12345; tracker_id=98765; theme=dark',
      'Set-Cookie',
      'tracking_uuid=xyz; Secure; HttpOnly',
      'X-CSRF-Token',
      'csrf_secret_key_8899',
      'Host',
      'localhost:3000',
    ],
  } as unknown as Request;

  const sensitiveEntries = HeaderCollector.collect(mockReqSensitive);
  const sensitiveAnalysis = HeaderClassifier.analyze(sensitiveEntries);

  const authItem = sensitiveAnalysis.headers.find((h) => h.canonicalName === 'Authorization');
  assert(Boolean(authItem && authItem.isSensitive === true), '9. Authorization flagged as isSensitive=true');
  assert(Boolean(authItem && !authItem.sanitizedValue.includes('secret_jwt_token')), '10. Authorization token strictly redacted from sanitizedValue');
  assert(Boolean(authItem && authItem.sanitizedValue.includes('[REDACTED')), '11. Authorization value replaced with safe redaction placeholder');

  const cookieItem = sensitiveAnalysis.headers.find((h) => h.canonicalName === 'Cookie');
  assert(Boolean(cookieItem && !cookieItem.sanitizedValue.includes('abc12345')), '12. Cookie secrets not exposed in sanitized value');
  assert(Boolean(cookieItem && cookieItem.sanitizedValue.includes('3 cookie(s) present')), '13. Cookie summarized into safe count descriptor');

  assert(sensitiveAnalysis.summary.sensitiveMaskedCount >= 4, '14. Sensitive headers count accurately recorded');
  assert(!sensitiveAnalysis.rawExport.rawHttp.includes('secret_jwt_token'), '15. Raw HTTP export does not leak sensitive tokens');
  assert(!JSON.stringify(sensitiveAnalysis.rawExport.json).includes('secret_jwt_token'), '16. Raw JSON export does not leak sensitive tokens');

  // --- 4. Client Hints Classification Tests ---
  console.log('\n--- 4. Client Hints Classification Tests ---');
  const mockReqHints = {
    headers: {
      'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-ch-ua-model': '"MacBookPro18,1"',
      'sec-ch-ua-platform-version': '"14.4.1"',
      'device-memory': '16',
    },
    rawHeaders: [
      'Sec-CH-UA',
      '"Chromium";v="124", "Google Chrome";v="124"',
      'Sec-CH-UA-Mobile',
      '?0',
      'Sec-CH-UA-Platform',
      '"macOS"',
      'Sec-CH-UA-Model',
      '"MacBookPro18,1"',
      'Sec-CH-UA-Platform-Version',
      '"14.4.1"',
      'Device-Memory',
      '16',
    ],
  } as unknown as Request;

  const hintsEntries = HeaderCollector.collect(mockReqHints);
  const hintsAnalysis = HeaderClassifier.analyze(hintsEntries);

  assert(hintsAnalysis.summary.clientHintsCount === 6, '17. Detects all 6 Client Hints headers');
  const modelHint = hintsAnalysis.headers.find((h) => h.canonicalName === 'Sec-CH-UA-Model');
  assert(Boolean(modelHint && modelHint.privacyStatus === 'WARNING'), '18. High-entropy model hint classified as WARNING');
  assert(Boolean(modelHint && modelHint.riskPoints > 0), '19. High-entropy model hint carries risk impact points');

  // --- 5. Proxy Forwarding Leak Detection Tests ---
  console.log('\n--- 5. Proxy Forwarding Leak Detection Tests ---');
  const mockReqProxy = {
    headers: {
      'x-forwarded-for': '203.0.113.195, 198.51.100.1',
      via: '1.1 varnish (Varnish/6.0), 1.1 google',
      'x-real-ip': '203.0.113.195',
      host: 'example.com',
    },
    rawHeaders: [
      'X-Forwarded-For',
      '203.0.113.195, 198.51.100.1',
      'Via',
      '1.1 varnish (Varnish/6.0), 1.1 google',
      'X-Real-IP',
      '203.0.113.195',
      'Host',
      'example.com',
    ],
  } as unknown as Request;

  const proxyEntries = HeaderCollector.collect(mockReqProxy);
  const proxyAnalysis = HeaderClassifier.analyze(proxyEntries);

  assert(proxyAnalysis.summary.hasProxyHeaders === true, '20. Flags presence of proxy forwarding headers');
  assert(proxyAnalysis.summary.proxyHeadersCount === 3, '21. Accurately counts 3 proxy headers');
  const xffItem = proxyAnalysis.headers.find((h) => h.canonicalName === 'X-Forwarded-For');
  assert(Boolean(xffItem && xffItem.category === 'PROXY_NETWORK'), '22. X-Forwarded-For classified under PROXY_NETWORK');
  assert(Boolean(xffItem && (xffItem.privacyStatus === 'INFO' || xffItem.privacyStatus === 'SAFE')), '23. X-Forwarded-For is informational and carries no automatic privacy penalty');

  // --- 6. Missing Headers Audit Tests ---
  console.log('\n--- 6. Missing Headers Audit Tests ---');
  const mockReqBare = {
    headers: {
      host: 'example.com',
      'user-agent': 'curl/7.88.1',
    },
    rawHeaders: ['Host', 'example.com', 'User-Agent', 'curl/7.88.1'],
  } as unknown as Request;

  const bareEntries = HeaderCollector.collect(mockReqBare);
  const bareAnalysis = HeaderClassifier.analyze(bareEntries);

  assert(bareAnalysis.missingHeaders.some((m) => m.canonicalName === 'Sec-GPC'), '24. Detects missing Sec-GPC header');
  assert(!bareAnalysis.missingHeaders.some((m) => m.canonicalName === 'DNT'), '25. Deprecated DNT is not treated as a missing remediation header');
  assert(!bareAnalysis.missingHeaders.some((m) => m.canonicalName === 'Upgrade-Insecure-Requests'), '26. Upgrade-Insecure-Requests is not treated as a privacy-control remediation header');
  assert(bareAnalysis.missingHeaders.every((m) => m.recommendation.length > 0), '27. All missing headers provide actionable recommendations');

  // --- 7. Export Formatting Tests ---
  console.log('\n--- 7. Export Formatting Tests ---');
  assert(typeof bareAnalysis.rawExport.rawHttp === 'string' && bareAnalysis.rawExport.rawHttp.includes('Host: example.com'), '28. Raw HTTP export produces valid wire format');
  assert(typeof bareAnalysis.rawExport.json === 'object' && bareAnalysis.rawExport.json['Host'] === 'example.com', '29. JSON export produces valid key-value dictionary');

  console.log('\n==================================================');
  console.log('ALL STAGE 9 HTTP HEADERS INTELLIGENCE TESTS PASSED (29/29)');
  console.log('==================================================');
}

runHeadersIntelligenceTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
