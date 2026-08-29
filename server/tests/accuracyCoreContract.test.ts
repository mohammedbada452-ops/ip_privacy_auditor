import assert from 'node:assert/strict';
import { PrivacyEngine } from '../privacy/PrivacyEngine';
import { validateIp } from '../utils/ipExtractor';

const engine = new PrivacyEngine();

const local = validateIp('127.0.0.1');
assert.equal(local.isLoopback, true);
assert.equal(local.isPublic, false);
assert.equal(validateIp('::1').isLoopback, true);

const base = engine.evaluate({
  ipCheck: {
    ip: '127.0.0.1', ipVersion: 'IPv4', isPrivate: true, observationScope: 'LOOPBACK',
    publicIpStatus: 'NOT_MEASURED', ipSource: 'LOCAL_ENDPOINT', connectionType: 'LOCAL_DEVELOPMENT',
    localAddress: '127.0.0.1', publicIp: null, publicIpConfidence: 'UNKNOWN',
    headers: { userAgent: 'test', secGpc: null, dnt: null, acceptLanguage: 'en-US', connection: null },
    connectionFlags: { hasProxyHeaders: false, isInfrastructureProxy: false, viaHeader: null }
  },
  fingerprint: { webgl: { status: 'UNAVAILABLE', isUnmasked: false }, audioStatus: 'TIMEOUT', webRtc: { status: 'UNAVAILABLE', localIps: [], publicIps: [], mdnsCandidates: [] } }
});
assert.equal(base.privacyScore, 100);
assert.equal(base.deductions.length, 0);
assert.ok(base.canonicalFindings?.every((f) => f.scoreImpact >= 0));

const webgl = engine.evaluate({ fingerprint: { webgl: { status: 'EXPOSED', renderer: 'ANGLE Intel UHD', isUnmasked: true } } });
const wg = webgl.factors.find((f) => f.id === 'FP_WEBGL_HARDWARE');
assert.equal(wg?.scoreImpact, -3);
assert.equal(webgl.privacyScore, 97);

const audio = engine.evaluate({ fingerprint: { audioHash: 'abcd', audioStatus: 'SIGNATURE_AVAILABLE' } });
const au = audio.factors.find((f) => f.id === 'FP_AUDIO_SIGNATURE');
assert.equal(au?.classification, 'FINGERPRINTING_SURFACE');
assert.equal(au?.scoreImpact, 0);
assert.equal(audio.privacyScore, 100);

const rtc = engine.evaluate({ fingerprint: { webRtc: { status: 'PUBLIC_CANDIDATE_REVIEW', localIps: [], publicIps: ['139.28.49.130'], mdnsCandidates: [] } } });
const rf = rtc.factors.find((f) => f.id === 'FP_WEBRTC_LEAK');
assert.equal(rf?.scoreImpact, 0);
assert.equal(rf?.evidenceState, 'NOT_DETECTED');
assert.equal(rtc.privacyScore, 100);

console.log('[PASS] Accuracy Core canonical contract and score consistency');
