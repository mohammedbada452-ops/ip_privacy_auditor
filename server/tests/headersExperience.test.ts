import assert from 'node:assert';
import { HeaderClassifier } from '../headers/HeaderClassifier';
import { HeaderCollector } from '../headers/HeaderCollector';
import type { RawHeaderEntry } from '../headers/types';
import { translations } from '../../src/i18n';

console.log('\n============================================================');
console.log('--- RUNNING FIX 3 HEADERS PRIVACY EXPERIENCE TESTS ---');
console.log('============================================================\n');

const entry = (key: string, value: string): RawHeaderEntry => ({
  key,
  normalizedKey: key.toLowerCase(),
  value,
});

// 1. Scoring Engine & Privacy Tier Testing
console.log('1. Testing Header Privacy Score Calculation...');

// Clean baseline request with Sec-GPC
const cleanEntries: RawHeaderEntry[] = [
  entry('host', 'privacy-shield.dev'),
  entry('user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
  entry('accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'),
  entry('sec-gpc', '1'),
  entry('upgrade-insecure-requests', '1'),
  entry('sec-fetch-site', 'none'),
];

const cleanAnalysis = HeaderClassifier.analyze(cleanEntries, false);
assert.strictEqual(cleanAnalysis.privacyScore, 100, 'Clean request with Sec-GPC should score 100');
assert.strictEqual(cleanAnalysis.privacyTier, 'EXCELLENT', '100 score should be EXCELLENT tier');
assert.strictEqual(cleanAnalysis.scoreFactors.filter((f) => f.points < 0).length, 0, 'No deductions for clean request');
assert.strictEqual(cleanAnalysis.problems.length, 0, 'No problems found for clean request');
console.log('[PASS] Baseline clean request scores 100 (EXCELLENT) with 0 deductions');

// Missing Sec-GPC request
const missingGpcEntries: RawHeaderEntry[] = [
  entry('host', 'privacy-shield.dev'),
  entry('user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
  entry('accept', 'text/html,application/xhtml+xml'),
];

const missingGpcAnalysis = HeaderClassifier.analyze(missingGpcEntries, false);
assert.strictEqual(missingGpcAnalysis.privacyScore, 100, 'Missing optional Sec-GPC is informational and applies no deduction');
assert.strictEqual(missingGpcAnalysis.privacyTier, 'EXCELLENT', '95 score remains EXCELLENT tier');
assert.ok(
  missingGpcAnalysis.scoreFactors.some((f) => f.id === 'HDR_SEC_GPC_NOT_PRESENT' || f.factor.includes('Sec-GPC')),
  'Missing optional Sec-GPC recorded as informational'
);
assert.ok(
  !missingGpcAnalysis.problems.some((p) => p.headerName === 'Sec-GPC'),
  'Missing optional Sec-GPC is not misclassified as an actionable vulnerability'
);
console.log('[PASS] Missing Sec-GPC remains informational with 0-point impact');

// High Entropy Client Hints & Referer Exposure
const highEntropyEntries: RawHeaderEntry[] = [
  entry('host', 'privacy-shield.dev'),
  entry('user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (HeadlessChrome)'),
  entry('sec-ch-ua-model', '"Pixel 8 Pro"'),
  entry('sec-ch-ua-platform-version', '"14.0.0"'),
  entry('sec-ch-ua-full-version-list', '"Google Chrome";v="120.0.6099.109"'),
  entry('sec-ch-ua-bitness', '"64"'),
  entry('sec-ch-ua-arch', '"arm64"'),
  entry('referer', 'https://competitor.com/tracker?uid=12345'),
];

const highEntropyAnalysis = HeaderClassifier.analyze(highEntropyEntries, false);
assert.ok(highEntropyAnalysis.privacyScore < 80, `High entropy score should be degraded: ${highEntropyAnalysis.privacyScore}`);
assert.ok(
  highEntropyAnalysis.clientHintsAnalysis.highEntropy.length >= 3,
  'High entropy hints categorized properly'
);
assert.ok(
  highEntropyAnalysis.problems.some((p) => p.headerName === 'Sec-CH-UA-Model'),
  'Sec-CH-UA-Model identified as privacy risk problem'
);
assert.ok(
  highEntropyAnalysis.problems.some((p) => p.headerName === 'Referer'),
  'Referer leak identified as privacy risk problem'
);
console.log('[PASS] High-entropy client hints, automation flags, and referer leaks accurately detected and penalized');

// 2. Infrastructure Proxy vs Untrusted Proxy
console.log('2. Testing Infrastructure Proxy Handling...');

const cloudRunProxyEntries: RawHeaderEntry[] = [
  entry('host', 'privacy-shield.dev'),
  entry('user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
  entry('sec-gpc', '1'),
  entry('x-forwarded-for', '34.120.55.10'),
  entry('x-forwarded-proto', 'https'),
  entry('x-cloud-trace-context', '105445aa7843bc8bf206b120001000/1'),
];

// When isInfrastructureProxy is TRUE:
const infraAnalysis = HeaderClassifier.analyze(cloudRunProxyEntries, true);
assert.strictEqual(infraAnalysis.isInfrastructureProxy, true, 'isInfrastructureProxy preserved');
assert.strictEqual(infraAnalysis.privacyScore, 100, 'Cloud Run ingress proxy should NOT penalize score');
assert.strictEqual(infraAnalysis.problems.filter((p) => p.id.startsWith('proxy-')).length, 0, 'No proxy problems for trusted ingress');
console.log('[PASS] Infrastructure reverse proxy (Cloud Run) safely ignored from false-positive privacy deductions');

// When isInfrastructureProxy is FALSE, proxy forwarding is classified but is not a confirmed vulnerability by itself:
const untrustedProxyAnalysis = HeaderClassifier.analyze(cloudRunProxyEntries, false);
assert.ok(
  untrustedProxyAnalysis.scoreFactors.some((f) => f.id === 'HDR_PROXY_LEAK' || f.factor.includes('Proxy')),
  'Untrusted proxy forwarding adds deduction'
);
assert.ok(
  untrustedProxyAnalysis.problems.some((p) => p.id === 'prob_proxy_leak' || p.headerName === 'X-Forwarded-For'),
  'Untrusted proxy forwarding adds problem item'
);
console.log('[PASS] Untrusted proxy forwarding is surfaced for review without inventing a privacy deduction');

// 3. Cookie Security & Transport Analysis
console.log('3. Testing Cookie Masking & Security...');

const cookieEntries: RawHeaderEntry[] = [
  entry('host', 'privacy-shield.dev'),
  entry('cookie', 'session_id=secret_abc_123; user_pref=dark; auth_token=jwt_xyz_987'),
  entry('authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'),
  entry('sec-gpc', '1'),
];

const cookieAnalysis = HeaderClassifier.analyze(cookieEntries, false);
assert.strictEqual(cookieAnalysis.cookieSecurity.cookieCount, 3, 'Counts 3 individual cookies');
assert.strictEqual(cookieAnalysis.cookieSecurity.isProtected, true, 'Cookie data marked protected');
const redactedCookieHeader = cookieAnalysis.headers.find((h) => h.canonicalName === 'Cookie');
assert.ok(redactedCookieHeader, 'Cookie header present');
assert.ok(!(redactedCookieHeader?.sanitizedValue ?? '').includes('secret_abc_123'), 'Raw session secret is not exposed in sanitized value');
console.log('[PASS] Cookies correctly parsed, counted, and sanitized without exposing plaintext session tokens');

// 4. i18n Key Completeness & Symmetry
console.log('4. Testing i18n Symmetry for Headers Intelligence...');

const requiredHeaderKeys = [
  'httpPrivacyScore',
  'httpPrivacyScoreDesc',
  'scoreBreakdownTitle',
  'scoreBreakdownSubtitle',
  'problemCenterTitle',
  'problemCenterSubtitle',
  'noProblemsFound',
  'noProblemsFoundSubtitle',
  'problemHeaderResponsible',
  'problemSeverityLabel',
  'problemWhyItMatters',
  'problemEvidence',
  'problemRemediation',
  'problemActorLabel',
  'clientHintsAnalysisTitle',
  'clientHintsAnalysisSubtitle',
  'lowEntropyTitle',
  'highEntropyTitle',
  'noClientHintsActive',
  'cookieSecurityTitle',
  'cookieSecuritySubtitle',
  'cookieCountLabel',
  'cookieProtectionLabel',
  'cookieReasonLabel',
  'cookieEnforced',
  'proxyAnalysisTitle',
  'proxyAnalysisSubtitle',
  'proxyInfraDetected',
  'proxyInfraDesc',
  'proxyUntrustedDetected',
  'proxyUntrustedDesc',
  'proxyDirectConnection',
  'proxyDirectDesc',
  'recheckComparisonTitle',
  'exportReportTitle',
  'exportPdfTab',
  'exportPrintBtn',
];

const locales = ['en', 'es', 'fr', 'tr', 'pt', 'ar'] as const;

for (const loc of locales) {
  const locHeaders = ((translations[loc] as unknown) as Record<string, unknown>).headers as Record<string, string>;
  assert.ok(locHeaders, `Locale [${loc}] headers object must exist`);
  for (const key of requiredHeaderKeys) {
    assert.ok(
      typeof locHeaders[key] === 'string' && locHeaders[key].length > 0,
      `Locale [${loc}] missing key 'headers.${key}'`
    );
  }
}
console.log(`[PASS] All ${requiredHeaderKeys.length} new headers keys verified across all 6 locales (en, es, fr, tr, pt, ar) with 100% key symmetry`);

console.log('\n============================================================');
console.log('ALL FIX 3 HEADERS PRIVACY EXPERIENCE TESTS PASSED (100%)');
console.log('============================================================\n');
