import assert from 'node:assert/strict';
import { PrivacyEngine } from '../privacy/PrivacyEngine';

const engine = new PrivacyEngine();

const baseIp = {
  ip: '203.0.113.99', ipVersion: 'IPv4' as const, isPrivate: false,
  isAuthoritativeForClientEgress: true, observationSource: 'SOCKET_PEER' as const, observationScope: 'PUBLIC' as const,
  headers: { userAgent: 'Mozilla/5.0', secGpc: null, dnt: null, acceptLanguage: 'en-US', connection: 'keep-alive' },
  connectionFlags: { hasProxyHeaders: false, isInfrastructureProxy: false, viaHeader: null },
};

const verifiedNetwork = {
  isp: 'Example ISP', organization: 'Example ISP', asn: 'AS64500', isMobile: false,
  isProxy: false, isVpn: null, isTor: null, isHosting: false, provider: 'TestProvider', providerStatus: 'VERIFIED' as const,
};

const clean = engine.evaluate({ ipCheck: baseIp, ipDetails: { ip: baseIp.ip, geo: { country: 'Test', countryCode: 'ZZ', region: '', city: '', postalCode: '', latitude: null, longitude: null, timezone: 'UTC' }, network: verifiedNetwork } });
assert.equal(clean.privacyScore, 100);
assert.equal(clean.deductions.length, 0);

const webrtcOnly = engine.evaluate({ ipCheck: baseIp, ipDetails: { ip: baseIp.ip, geo: { country: 'Test', countryCode: 'ZZ', region: '', city: '', postalCode: '', latitude: null, longitude: null, timezone: 'UTC' }, network: verifiedNetwork }, fingerprint: { webRtc: { localIps: ['192.168.1.10'], publicIps: [], } } });
assert.equal(webrtcOnly.privacyScore, 80);
assert.equal(webrtcOnly.deductions.reduce((s, d) => s + d.points, 0), -20);

const publicCandidate = engine.evaluate({ ipCheck: baseIp, ipDetails: { ip: baseIp.ip, geo: { country: 'Test', countryCode: 'ZZ', region: '', city: '', postalCode: '', latitude: null, longitude: null, timezone: 'UTC' }, network: verifiedNetwork }, fingerprint: { webRtc: { localIps: [], publicIps: ['139.28.49.130'] } } });
assert.equal(publicCandidate.privacyScore, 100);
const rtc = publicCandidate.factors.find((f) => f.id === 'FP_WEBRTC_LEAK');
assert.equal(rtc?.points, 0);
assert.equal(rtc?.status, 'WARNING');

const unknownNetwork = engine.evaluate({ ipCheck: baseIp, ipDetails: null });
assert.equal(unknownNetwork.privacyScore, 100);
assert.equal(unknownNetwork.verificationStatus, 'PARTIAL');
assert.ok((unknownNetwork.verificationCoveragePct ?? 0) < 100);
assert.match(unknownNetwork.summary, /coverage/i);

console.log('[PASS] accuracyCoreAuthority');
