import assert from 'node:assert/strict';
import { PrivacyEngine } from '../privacy/PrivacyEngine';

const engine = new PrivacyEngine();

const baseIp = {
  ip: '188.226.128.20',
  ipVersion: 'IPv4' as const,
  isPrivate: false,
  observationScope: 'PUBLIC' as const,
  isAuthoritativeForClientEgress: true,
  headers: { userAgent: null, secGpc: null, dnt: null, acceptLanguage: null, connection: null },
  connectionFlags: { hasProxyHeaders: false, viaHeader: null },
};

function evaluated(overrides: Record<string, unknown> = {}) {
  return engine.evaluate({
    ipCheck: baseIp,
    fingerprint: {},
    ...(overrides as any),
  });
}

// 1. Every factor has one canonical score field. Unscored findings always contribute zero.
for (const analysis of [
  evaluated(),
  evaluated({ fingerprint: { webgl: { status: 'EXPOSED', isUnmasked: true, renderer: 'Intel UHD Graphics' } } }),
  evaluated({ fingerprint: { audioStatus: 'TIMEOUT' } }),
  evaluated({ fingerprint: { canvasStatus: 'UNAVAILABLE' } }),
]) {
  for (const factor of analysis.factors) {
    assert.equal(factor.scoreImpact, factor.scored ? factor.points : 0, `score mismatch for ${factor.id}`);
    if (!factor.scored) assert.equal(factor.points, 0, `unscored factor ${factor.id} must be zero`);
  }
}

// 2. WebGL exposure is scored; an unavailable WebGL collector is not.
assert.equal(
  evaluated({ fingerprint: { webgl: { status: 'EXPOSED', isUnmasked: true, renderer: 'Intel UHD Graphics' } } }).privacyScore,
  97,
);
assert.equal(
  evaluated({ fingerprint: { webgl: { status: 'UNAVAILABLE', isUnmasked: false } } }).privacyScore,
  100,
);
const webglObserved = evaluated({ fingerprint: { webgl: { status: 'EXPOSED', isUnmasked: true, renderer: 'Intel UHD Graphics' } } });
const webglFactor = webglObserved.factors.find((f) => f.id === 'FP_WEBGL_HARDWARE');
assert.equal(webglFactor?.evidenceState, 'CONFIRMED');
assert.equal(webglFactor?.observed, true);
assert.equal(webglFactor?.scored, true);
assert.equal(webglFactor?.scoreImpact, -3);

const webglUnavailable = evaluated({ fingerprint: { webgl: { status: 'UNAVAILABLE', isUnmasked: false } } });
const webglUnavailableFactor = webglUnavailable.factors.find((f) => f.id === 'FP_WEBGL_HARDWARE');
assert.equal(webglUnavailableFactor?.evidenceState, 'UNAVAILABLE');
assert.equal(webglUnavailableFactor?.observed, false);
assert.equal(webglUnavailableFactor?.scored, false);
assert.equal(webglUnavailableFactor?.scoreImpact, 0);

// 3. AudioContext timeout is unknown/unavailable semantics, never a five-point penalty.
const audio = evaluated({ fingerprint: { audioStatus: 'TIMEOUT' } });
const audioFactor = audio.factors.find((f) => f.id === 'FP_AUDIO_SIGNATURE');
assert.equal(audioFactor?.points, 0);
assert.equal(audioFactor?.scoreImpact, 0);
assert.equal(audio.deductions.some((d) => d.id === 'FP_AUDIO_SIGNATURE'), false);
const audioObserved = evaluated({ fingerprint: { audioStatus: 'SIGNATURE_AVAILABLE', audioHash: 'abcdef123456' } });
const audioObservedFactor = audioObserved.factors.find((f) => f.id === 'FP_AUDIO_SIGNATURE');
assert.equal(audioObservedFactor?.evidenceState, 'CONFIRMED');
assert.equal(audioObservedFactor?.observed, true);
assert.equal(audioObservedFactor?.scored, false);
assert.equal(audioObservedFactor?.scoreImpact, 0);
assert.equal(audioObserved.privacyScore, 100);

// 4. Public ICE candidates do not equal a confirmed leak. Private/local exposure does.
const publicCandidate = evaluated({
  fingerprint: { webRtc: { status: 'PUBLIC_CANDIDATE_REVIEW', localIps: [], publicIps: ['139.28.49.130'], mdnsCandidates: [] } },
});
assert.equal(publicCandidate.deductions.some((d) => d.id === 'FP_WEBRTC_LEAK'), false);
const rtcFactor = publicCandidate.factors.find((f) => f.id === 'FP_WEBRTC_LEAK');
assert.equal(rtcFactor?.evidenceState, 'CONFIRMED');
assert.equal(rtcFactor?.classification, 'FINGERPRINTING_SURFACE');
assert.equal(rtcFactor?.scoreImpact, 0);

const privateLeak = evaluated({
  fingerprint: { webRtc: { status: 'LEAK_DETECTED', localIps: ['192.168.1.2'], publicIps: [], mdnsCandidates: [] } },
});
assert.equal(privateLeak.deductions.find((d) => d.id === 'FP_WEBRTC_LEAK')?.points, -20);

// 5. Localhost is not a public measurement.
const localhost = engine.evaluate({
  ipCheck: {
    ip: '127.0.0.1', ipVersion: 'IPv4', isPrivate: true, observationScope: 'LOOPBACK',
    isAuthoritativeForClientEgress: false, headers: { userAgent: null, secGpc: null, dnt: null, acceptLanguage: null, connection: null }, connectionFlags: { hasProxyHeaders: false, viaHeader: null },
  },
  fingerprint: {},
});
assert.equal(localhost.privacyScore, 100);
console.log('[PASS] Accuracy Core invariants verified');
