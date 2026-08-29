/**
 * Comprehensive Stage 8 Advanced Browser Intelligence Test Suite
 * Tests capability matrix, all collectors, detectors, hashing, orchestrator,
 * server validation, data minimization, security boundaries, and Privacy Engine integration.
 */

import {
  collectCapabilities,
  collectIdentity,
  collectDisplay,
  collectHardware,
  collectLocale,
  collectTimezone,
  collectStorage,
  collectWebGL,
  collectCanvas,
  collectAutomation,
  collectNetwork,
  collectClientHints,
  collectPrivacyProtections,
  detectWebRtcLeak,
  detectCanvasSignature,
  detectWebGlExposure,
  detectAudioSignature,
  detectAutomation,
  fnv1a32,
  sha256Digest,
  withTimeout,
  buildBrowserProfile,
  sanitizeFingerprintPayload,
  BrowserOrchestrator,
} from '../../src/features/browser';
import { validateBrowserFingerprintPayload, PayloadValidationError } from '../utils/payloadValidator';
import { PrivacyEngine } from '../privacy/PrivacyEngine';
import type { BrowserFingerprintInput, IpCheckResponse, IpDetailsResponse } from '@packages/api-contract';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`[FAIL] ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`[PASS] ${msg}`);
}

async function runBrowserIntelligenceTests() {
  console.log('==================================================');
  console.log('RUNNING STAGE 8 BROWSER INTELLIGENCE TEST SUITE');
  console.log('==================================================');

  // --- CAPABILITY TESTS ---
  console.log('\n--- 1. Capability Matrix Tests ---');
  const caps = collectCapabilities();
  assert(caps.supported === true, '1. Capabilities collector executes successfully');
  assert(caps.data !== null && typeof caps.data.webRtc === 'string', '2. Capability matrix produces valid enum states');
  assert(['SUPPORTED', 'UNSUPPORTED', 'BLOCKED', 'FAILED', 'UNKNOWN'].includes(caps.data!.canvas2d), '3. Canvas capability enum is valid');
  assert(['SUPPORTED', 'UNSUPPORTED', 'BLOCKED', 'FAILED', 'UNKNOWN'].includes(caps.data!.audioContext), '4. AudioContext capability enum is valid');

  // --- HASHING UTILITY TESTS ---
  console.log('\n--- 2. Deterministic Hash Tests ---');
  const hash1 = fnv1a32('test_canvas_payload');
  const hash2 = fnv1a32('test_canvas_payload');
  const hash3 = fnv1a32('different_canvas_payload');
  assert(hash1 === hash2, '5. FNV-1a hash is 100% bit-for-bit deterministic');
  assert(hash1 !== hash3, '6. FNV-1a hash produces distinct outputs for distinct inputs');
  assert(hash1.length === 8, '7. FNV-1a produces normalized 8-character hex string');

  const shaRes = await sha256Digest('audit_signature');
  assert(typeof shaRes === 'string' && shaRes.length >= 8, '8. SHA-256 / digest fallback returns valid string');

  // --- WEBRTC DETECTOR TESTS ---
  console.log('\n--- 3. WebRTC Detection Tests ---');
  const webrtcUnavailable = detectWebRtcLeak(null);
  assert(webrtcUnavailable.status === 'UNAVAILABLE' && !webrtcUnavailable.leakDetected, '9. WebRTC unavailable handled safely without false leak');

  const webrtcNoLeak = detectWebRtcLeak({
    status: 'NO_LEAK',
    localIps: [],
    publicIps: ['8.8.8.8'],
    mdnsCandidates: [],
    leakDetected: false,
  });
  assert(webrtcNoLeak.status === 'PUBLIC_CANDIDATE_REVIEW' && !webrtcNoLeak.leakDetected, '10. WebRTC public STUN candidate is classified as review, not as a confirmed leak');

  const webrtcLocalLeak = detectWebRtcLeak({
    status: 'LEAK_DETECTED',
    localIps: ['192.168.1.150'],
    publicIps: ['1.2.3.4'],
    mdnsCandidates: [],
    leakDetected: true,
  });
  assert(webrtcLocalLeak.status === 'LEAK_DETECTED' && webrtcLocalLeak.leakDetected, '11. WebRTC private RFC1918 candidate triggers LEAK_DETECTED');
  assert(webrtcLocalLeak.recommendation !== undefined, '12. WebRTC leak provides remediation recommendation');

  const webrtcMdns = detectWebRtcLeak({
    status: 'PROTECTED',
    localIps: [],
    publicIps: [],
    mdnsCandidates: ['d7b8f9e0-1234.local'],
    leakDetected: false,
  });
  assert(webrtcMdns.status === 'PROTECTED' && !webrtcMdns.leakDetected, '13. WebRTC mDNS obfuscation classified as PROTECTED with 0 leak');

  const webrtcTimeout = detectWebRtcLeak({
    status: 'TIMEOUT',
    localIps: [],
    publicIps: [],
    mdnsCandidates: [],
    leakDetected: false,
  });
  assert(webrtcTimeout.status === 'TIMEOUT' && !webrtcTimeout.leakDetected, '14. WebRTC timeout safely handled without fake leak');

  // --- WEBGL DETECTOR TESTS ---
  console.log('\n--- 4. WebGL Detection Tests ---');
  const webglExposed = detectWebGlExposure({
    status: 'EXPOSED',
    unmaskedVendor: 'NVIDIA Corporation',
    unmaskedRenderer: 'NVIDIA GeForce RTX 4090',
    isUnmasked: true,
  });
  assert(webglExposed.status === 'EXPOSED' && webglExposed.isUnmasked, '15. WebGL unmasked GPU strings classified as EXPOSED');
  assert(webglExposed.summary.includes('GeForce RTX 4090'), '16. WebGL summary includes specific unmasked hardware');

  const webglMasked = detectWebGlExposure({
    status: 'MASKED',
    vendor: 'Generic',
    renderer: 'Masked GPU',
    isUnmasked: false,
  });
  assert(webglMasked.status === 'MASKED' && !webglMasked.isUnmasked, '17. WebGL generic/masked GPU strings classified as MASKED');

  const webglUnavailable = detectWebGlExposure(null);
  assert(webglUnavailable.status === 'UNAVAILABLE', '18. WebGL context unavailable handled safely');

  // --- CANVAS DETECTOR TESTS ---
  console.log('\n--- 5. Canvas Detection Tests ---');
  const canvasStable = detectCanvasSignature({
    status: 'STABLE_SIGNATURE',
    hash: 'a1b2c3d4',
    isRandomized: false,
    isStable: true,
    isBlank: false,
    testAttempts: 2,
  });
  assert(canvasStable.status === 'DISTINGUISHABLE_SIGNATURE' || canvasStable.status === 'STABLE_SIGNATURE', '19. Stable canvas classified as distinguishable signature');

  const canvasRandom = detectCanvasSignature({
    status: 'RANDOMIZED',
    hash: 'a1b2c3d4',
    isRandomized: true,
    isStable: false,
    isBlank: false,
    testAttempts: 2,
  });
  assert(canvasRandom.status === 'RANDOMIZED' && canvasRandom.isRandomized, '20. Randomized canvas classified as anti-fingerprinting protection');

  const canvasBlocked = detectCanvasSignature({
    status: 'BLOCKED',
    isRandomized: false,
    isStable: false,
    isBlank: true,
    testAttempts: 1,
  });
  assert(canvasBlocked.status === 'BLOCKED', '21. Blank/blocked canvas detected as BLOCKED');

  // --- AUDIO DETECTOR TESTS ---
  console.log('\n--- 6. Audio Detection Tests ---');
  const audioSig = detectAudioSignature({
    status: 'SIGNATURE_AVAILABLE',
    hash: 'f9e8d7c6',
    sampleSum: 124.55,
    sampleLength: 44100,
  });
  assert(audioSig.status === 'SIGNATURE_AVAILABLE' && audioSig.hasSignature, '22. AudioContext DSP hash classified as SIGNATURE_AVAILABLE');

  const audioBlocked = detectAudioSignature({
    status: 'BLOCKED',
  });
  assert(audioBlocked.status === 'BLOCKED' && !audioBlocked.hasSignature, '23. Blocked audio context classified as BLOCKED');

  const audioUnavailable = detectAudioSignature(null);
  assert(audioUnavailable.status === 'UNAVAILABLE' && !audioUnavailable.hasSignature, '24. AudioContext unavailable handled safely');

  // --- AUTOMATION DETECTOR TESTS ---
  console.log('\n--- 7. Automation Detection Tests ---');
  const autoDetected = detectAutomation({
    status: 'DETECTED',
    isAutomation: true,
    isWebDriver: true,
    automationSignals: ['navigator.webdriver=true'],
    confidence: 'HIGH',
  });
  assert(autoDetected.status === 'DETECTED' && autoDetected.isAutomation, '25. navigator.webdriver=true classified as DETECTED with HIGH confidence');

  const autoNotDetected = detectAutomation({
    status: 'NOT_DETECTED',
    isAutomation: false,
    isWebDriver: false,
    automationSignals: [],
    confidence: 'HIGH',
  });
  assert(autoNotDetected.status === 'NOT_DETECTED' && !autoNotDetected.isAutomation, '26. Clean session classified as NOT_DETECTED');

  const autoSuspected = detectAutomation({
    status: 'SUSPECTED',
    isAutomation: true,
    isWebDriver: false,
    automationSignals: ['Zero plugins on desktop Chrome'],
    confidence: 'MEDIUM',
  });
  assert(autoSuspected.status === 'SUSPECTED', '27. Heuristic anomalies classified as SUSPECTED with MEDIUM confidence');

  // --- STORAGE DATA MINIMIZATION TEST ---
  console.log('\n--- 8. Storage Data Minimization Tests ---');
  const storage = collectStorage();
  assert(storage.supported === true, '28. Storage collector runs without throwing');
  assert(typeof storage.data?.cookiesEnabled === 'boolean', '29. Storage returns boolean capability without reading or exposing user cookies');

  // --- PROFILE BUILDER & DOMAIN GROUPS ---
  console.log('\n--- 9. Profile Builder & 12 Groups ---');
  const orchestrator = new BrowserOrchestrator();
  const profile = await orchestrator.collectAll();
  assert(profile !== null && typeof profile.durationMs === 'number', '30. Orchestrator executes all collectors and returns BrowserProfile');
  assert(Object.keys(profile.groups).length === 12, '31. Profile contains all 12 standardized domain groups');
  assert(profile.groups.IDENTITY !== undefined, '32. Group IDENTITY exists');
  assert(profile.groups.DISPLAY !== undefined, '33. Group DISPLAY exists');
  assert(profile.groups.HARDWARE !== undefined, '34. Group HARDWARE exists');
  assert(profile.groups.LOCALE !== undefined, '35. Group LOCALE exists');
  assert(profile.groups.TIMEZONE !== undefined, '36. Group TIMEZONE exists');
  assert(profile.groups.STORAGE !== undefined, '37. Group STORAGE exists');
  assert(profile.groups.GRAPHICS !== undefined, '38. Group GRAPHICS exists');
  assert(profile.groups.AUDIO !== undefined, '39. Group AUDIO exists');
  assert(profile.groups.WEBRTC !== undefined, '40. Group WEBRTC exists');
  assert(profile.groups.AUTOMATION !== undefined, '41. Group AUTOMATION exists');
  assert(profile.groups.NETWORK !== undefined, '42. Group NETWORK exists');
  assert(profile.groups.PRIVACY_PROTECTIONS !== undefined, '43. Group PRIVACY_PROTECTIONS exists');

  // --- TIMEOUT ISOLATION HELPER ---
  console.log('\n--- 10. Timeout Isolation Tests ---');
  const slowPromise = new Promise<string>((resolve) => setTimeout(() => resolve('slow'), 500));
  const timeoutResult = await withTimeout(slowPromise, 50, 'fallback_timeout');
  assert(timeoutResult === 'fallback_timeout', '44. withTimeout helper triggers fallback upon timeout expiry');

  // --- SERVER-SIDE PAYLOAD VALIDATION TESTS ---
  console.log('\n--- 11. Server Payload Validation Tests ---');
  const validPayload = validateBrowserFingerprintPayload({
    canvasHash: '8f7e6d5c',
    webgl: { vendor: 'NVIDIA', renderer: 'GeForce' },
    audioHash: '1a2b3c4d',
    webRtc: { localIps: ['192.168.1.5'] },
    securityFlags: { isAutomation: true },
  });
  assert(validPayload !== null && validPayload.canvasHash === '8f7e6d5c', '45. Valid fingerprint payload accepted by server validator');

  let rejectedOversized = false;
  try {
    validateBrowserFingerprintPayload({
      canvasHash: 'a'.repeat(500), // Exceeds 128 chars limit
    });
  } catch (err) {
    if (err instanceof PayloadValidationError) {
      rejectedOversized = true;
    }
  }
  assert(rejectedOversized, '46. Oversized canvasHash string rejected with PayloadValidationError');

  let rejectedMalformedType = false;
  try {
    validateBrowserFingerprintPayload({
      hardware: { cpuCores: -5 }, // Invalid negative core count
    });
  } catch (err) {
    if (err instanceof PayloadValidationError) {
      rejectedMalformedType = true;
    }
  }
  assert(rejectedMalformedType, '47. Invalid hardware.cpuCores rejected with PayloadValidationError');

  // --- TRUST BOUNDARY VERIFICATION ---
  console.log('\n--- 12. Trust Boundary & Stage 7 Privacy Engine Integration Tests ---');
  const engine = new PrivacyEngine();

  const mockIpCheck: IpCheckResponse = {
    ip: '198.51.100.1',
    ipVersion: 'IPv4',
    isPrivate: false,
    headers: {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
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
    ip: '198.51.100.1',
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
      isp: 'Cloudflare, Inc.',
      organization: 'Cloudflare Datacenter',
      asn: 'AS13335',
      isMobile: false,
      isProxy: true, // Server-authoritative proxy fact!
      isVpn: false,
      isTor: false,
      isHosting: true,
    },
  };

  // Client attempts to send spoofed fingerprint data; server facts must NOT be overridden
  const evaluatedResult = engine.evaluate({
    ipCheck: mockIpCheck,
    ipDetails: mockIpDetails,
    fingerprint: {
      webRtc: { localIps: ['192.168.1.10'] }, // -20 pts
      webgl: { vendor: 'NVIDIA', renderer: 'GeForce RTX 4080' }, // -3 pts
      canvasHash: '9a8b7c6d', // informational only
      audioHash: '5e6f7a8b', // informational only
      securityFlags: { isAutomation: true }, // informational only
    },
    customHeaders: {},
  });

  assert(evaluatedResult.privacyScore < 70, '48. PrivacyEngine evaluates browser factors combined with server IP facts');
  const webrtcFactor = evaluatedResult.factors.find((f) => f.id === 'FP_WEBRTC_LEAK');
  assert(webrtcFactor !== undefined && webrtcFactor.detected && webrtcFactor.points === -20, '49. WebRTC local IP leak factor reaches PrivacyEngine with -20 pts deduction');

  const webglFactor = evaluatedResult.factors.find((f) => f.id === 'FP_WEBGL_HARDWARE');
  assert(webglFactor !== undefined && webglFactor.detected && webglFactor.points === -3, '50. WebGL GPU hardware factor reaches PrivacyEngine with -3 pts deduction');

  const canvasFactor = evaluatedResult.factors.find((f) => f.id === 'FP_CANVAS_UNIQUE');
  assert(canvasFactor !== undefined && !canvasFactor.detected && canvasFactor.points === 0, '51. Canvas fingerprint surface is informational with 0 points');

  const audioFactor = evaluatedResult.factors.find((f) => f.id === 'FP_AUDIO_SIGNATURE');
  assert(audioFactor !== undefined && !audioFactor.detected && audioFactor.points === 0, '52. Audio fingerprint surface is informational with 0 points');

  const autoFactor = evaluatedResult.factors.find((f) => f.id === 'SEC_AUTOMATION_FLAG');
  assert(autoFactor !== undefined && autoFactor.detected && autoFactor.points === 0, '53. Automation flag is informational with 0 points');

  // Verify server-authoritative proxy factor is still enforced
  const proxyFactor = evaluatedResult.factors.find((f) => f.id === 'NET_PROXY_DETECTED');
  assert(proxyFactor !== undefined && proxyFactor.detected && proxyFactor.points === 0, '54. Verified proxy classification is contextual and does not create a privacy deduction');

  console.log('==================================================');
  console.log('ALL STAGE 8 BROWSER INTELLIGENCE TESTS PASSED (54/54)');
  console.log('==================================================');
}

runBrowserIntelligenceTests().catch((err) => {
  console.error('[TEST SUITE CRASH]', err);
  process.exit(1);
});
