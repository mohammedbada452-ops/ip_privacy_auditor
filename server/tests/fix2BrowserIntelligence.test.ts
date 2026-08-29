/**
 * FIX 2 — Browser Intelligence Interactive Experience Test Suite
 */

import { en } from '../../src/i18n/locales/en';
import { es } from '../../src/i18n/locales/es';
import { fr } from '../../src/i18n/locales/fr';
import { tr } from '../../src/i18n/locales/tr';
import { pt } from '../../src/i18n/locales/pt';
import { ar } from '../../src/i18n/locales/ar';
import {
  extractBrowserProblems,
  detectSignalTransitions,
} from '../../src/features/browser/utils/problemExtractor';
import type { BrowserProfile } from '../../src/features/browser/types';
import type { PrivacyScoreAnalysis } from '@packages/api-contract';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`[PASS] ${message}`);
}

console.log('============================================================');
console.log('--- RUNNING FIX 2 BROWSER INTELLIGENCE EXPERIENCE TESTS ---');
console.log('============================================================');

// 1. Test Problem Extraction from Browser Profile
const mockProfile1 = {
  version: '1.0.0',
  schemaVersion: '1.0.0',
  timestamp: new Date().toISOString(),
  groups: {
    GRAPHICS: {
      status: 'SUCCESS',
      confidence: 'HIGH',
      name: 'GRAPHICS',
      title: 'Graphics',
      derivedSignals: [],
      description: 'Graphics details',
      data: {
        hash: 'abc123canvas',
        isRandomized: false,
        isStable: true,
        unmaskedRenderer: 'ANGLE (Apple, Apple M2 Pro, OpenGL 4.1)',
        unmaskedVendor: 'Apple',
        hardwareHash: 'apple-m2-gpu-hash',
        isUnmasked: true,
        webglSupported: true,
        vendor: 'WebKit',
        renderer: 'WebKit WebGL',
      },
    },
    WEBRTC: {
      status: 'SUCCESS',
      confidence: 'HIGH',
      name: 'WEBRTC',
      title: 'WebRTC',
      derivedSignals: [],
      description: 'WebRTC details',
      data: {
        status: 'EXPOSED',
        leakDetected: true,
        localIps: ['192.168.1.45'],
        publicIps: ['203.0.113.195'],
        mdnsCandidates: [],
      },
    },
    AUDIO: {
      status: 'SUCCESS',
      confidence: 'HIGH',
      name: 'AUDIO',
      title: 'Audio',
      derivedSignals: [],
      description: 'Audio details',
      data: {
        hash: 'audio998877',
        sampleSum: 124.8726,
        sampleLength: 4096,
      },
    },
    PRIVACY_PROTECTIONS: {
      status: 'SUCCESS',
      confidence: 'HIGH',
      name: 'PRIVACY_PROTECTIONS',
      title: 'Privacy Protections',
      derivedSignals: [],
      description: 'Privacy Protections details',
      data: {
        globalPrivacyControl: false,
        doNotTrack: false,
        incognitoSuspected: false,
        adBlockDetected: false,
      },
    },
    AUTOMATION: {
      status: 'SUCCESS',
      confidence: 'HIGH',
      name: 'AUTOMATION',
      title: 'Automation',
      derivedSignals: [],
      description: 'Automation details',
      data: {
        isAutomation: false,
        isWebDriver: false,
        automationSignals: [],
      },
    },
    HARDWARE: {
      status: 'SUCCESS',
      confidence: 'HIGH',
      name: 'HARDWARE',
      title: 'Hardware',
      derivedSignals: [],
      description: 'Hardware details',
      data: {
        cpuCores: 10,
        deviceMemory: 16,
        hardwareConcurrency: 10,
        maxTouchPoints: 0,
      },
    },
    DISPLAY: {
      status: 'SUCCESS',
      confidence: 'HIGH',
      name: 'DISPLAY',
      title: 'Display',
      derivedSignals: [],
      description: 'Display details',
      data: {
        width: 2560,
        height: 1440,
        availWidth: 2560,
        availHeight: 1400,
        colorDepth: 24,
        devicePixelRatio: 2,
      },
    },
  },
  summary: {
    totalSignalsEvaluated: 48,
    exposedHardwareSignals: 4,
    privacyProtectionsActive: 0,
    leaksDetected: 1,
  },
} as unknown as BrowserProfile;

const mockAnalysis1 = {
  privacyScore: 55,
  overallAssessment: 'FAIR',
  ipScore: 20,
  headersScore: 15,
  browserScore: 20,
  breakdown: [
    { factor: 'WEBRTC_LEAKS', score: 0, maxScore: 10, pointsDeducted: 10, weight: 1.0, impact: 'CRITICAL', status: 'FAIL', reason: 'WebRTC exposes local IP', value: '192.168.1.45' },
    { factor: 'WEBGL_GPU_LEAK', score: 0, maxScore: 5, pointsDeducted: 5, weight: 1.0, impact: 'HIGH', status: 'FAIL', reason: 'Unmasked GPU Driver', value: 'Apple M2 Pro' },
    { factor: 'CANVAS_FINGERPRINT', score: 0, maxScore: 5, pointsDeducted: 5, weight: 1.0, impact: 'MEDIUM', status: 'FAIL', reason: 'Canvas is deterministic', value: 'Deterministic' },
  ],
  recommendations: [],
  metadata: {
    evaluatedAt: new Date().toISOString(),
    factorsEvaluated: 14,
    engineVersion: '1.0.0',
    executionTimeMs: 4,
  },
} as unknown as PrivacyScoreAnalysis;

const problems = extractBrowserProblems(mockProfile1, mockAnalysis1);

assert(problems.length >= 4, `Extracted ${problems.length} problems correctly from mock profile`);

const webrtcProb = problems.find((p) => p.id === 'webrtc-ip-leak');
assert(!!webrtcProb, 'WebRTC leak problem successfully detected');
assert(webrtcProb?.severity === 'critical', 'WebRTC leak severity is critical');
assert(typeof webrtcProb?.howToImprove === 'string' && webrtcProb.howToImprove.length > 0, 'WebRTC remediation explanation provided');
assert(webrtcProb?.targetSectionId === 'webrtc', 'WebRTC problem links to correct DOM anchor');

const webglProb = problems.find((p) => p.id === 'webgl-hardware-unmasked');
assert(!!webglProb, 'WebGL unmasked GPU problem detected');
assert(webglProb?.targetSectionId === 'webgl', 'WebGL problem links to correct DOM anchor');

const canvasProb = problems.find((p) => p.id === 'canvas-fingerprint-unique');
assert(!!canvasProb, 'Canvas entropy exposure detected');
assert(canvasProb?.targetSectionId === 'canvas', 'Canvas problem links to correct DOM anchor');

// 2. Test Signal Transition Detection (Before vs After)
const mockProfile2 = {
  ...mockProfile1,
  groups: {
    ...mockProfile1.groups,
    WEBRTC: {
      status: 'SUCCESS',
      confidence: 'HIGH',
      name: 'WEBRTC',
      title: 'WebRTC',
      derivedSignals: [],
      description: 'WebRTC details',
      data: {
        status: 'PROTECTED',
        leakDetected: false,
        localIps: [],
        publicIps: [],
        mdnsCandidates: ['mdns-guid-candidate'],
      },
    },
    PRIVACY_PROTECTIONS: {
      status: 'SUCCESS',
      confidence: 'HIGH',
      name: 'PRIVACY_PROTECTIONS',
      title: 'Privacy Protections',
      derivedSignals: [],
      description: 'Privacy Protections details',
      data: {
        globalPrivacyControl: true,
        doNotTrack: true,
        incognitoSuspected: false,
        adBlockDetected: true,
      },
    },
  },
  summary: {
    ...mockProfile1.summary,
    privacyProtectionsActive: 2,
  },
} as unknown as BrowserProfile;

const mockAnalysis2 = {
  ...mockAnalysis1,
  privacyScore: 80,
  breakdown: [
    { factor: 'WEBRTC_LEAKS', score: 10, maxScore: 10, pointsDeducted: 0, weight: 1.0, impact: 'CRITICAL', status: 'PASS', reason: 'WebRTC protected', value: 'mDNS' },
    { factor: 'GLOBAL_PRIVACY_CONTROL', score: 5, maxScore: 5, pointsDeducted: 0, weight: 1.0, impact: 'LOW', status: 'PASS', reason: 'GPC active', value: 'Active' },
  ],
} as unknown as PrivacyScoreAnalysis;

const transitions = detectSignalTransitions(mockProfile1, mockProfile2, mockAnalysis1, mockAnalysis2);

assert(transitions.length >= 2, `Detected ${transitions.length} signal transitions`);
const webrtcTransition = transitions.find((t) => t.id === 'webrtc');
assert(!!webrtcTransition && webrtcTransition.improved === true, 'WebRTC transition correctly flagged as improved');

const gpcTransition = transitions.find((t) => t.id === 'gpc');
assert(!!gpcTransition && gpcTransition.improved === true, 'GPC transition correctly flagged as improved');

// 3. Test i18n Symmetry for Fix 2 Keys
const locales = [
  { code: 'en', dict: en },
  { code: 'es', dict: es },
  { code: 'fr', dict: fr },
  { code: 'tr', dict: tr },
  { code: 'pt', dict: pt },
  { code: 'ar', dict: ar },
];

for (const { code, dict } of locales) {
  const b = dict.browser;
  assert(typeof b.problemCenterTitle === 'string' && b.problemCenterTitle.length > 0, `[${code}] browser.problemCenterTitle is valid`);
  assert(typeof b.problemCenterSubtitle === 'string' && b.problemCenterSubtitle.length > 0, `[${code}] browser.problemCenterSubtitle is valid`);
  assert(typeof b.howToImprove === 'string' && b.howToImprove.length > 0, `[${code}] browser.howToImprove is valid`);
  assert(typeof b.beforeAfterTitle === 'string' && b.beforeAfterTitle.length > 0, `[${code}] browser.beforeAfterTitle is valid`);
  assert(typeof b.partialScanWarning === 'string' && b.partialScanWarning.length > 0, `[${code}] browser.partialScanWarning is valid`);
  assert(typeof b.recheckProblem === 'string' && b.recheckProblem.length > 0, `[${code}] browser.recheckProblem is valid`);
}

console.log('============================================================');
console.log('ALL FIX 2 BROWSER INTELLIGENCE TESTS PASSED (100%)');
console.log('============================================================');
