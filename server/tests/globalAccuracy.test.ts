import assert from 'node:assert/strict';
import { PrivacyEngine } from '../privacy/PrivacyEngine';
import { HeaderClassifier } from '../headers/HeaderClassifier';
import { FallbackGeoIPProvider } from '../providers/geoip/FallbackGeoIPProvider';

const engine = new PrivacyEngine();

// Public STUN candidates alone are not a leak.
const stunOnly = engine.evaluate({
  ipCheck: { ip: '198.51.100.10', ipVersion: 'IPv4', isPrivate: false, headers: {} as any, connectionFlags: { hasProxyHeaders: false, viaHeader: null } },
  fingerprint: { webRtc: { localIps: [], publicIps: ['8.8.8.8'], mdnsCandidates: [] } },
});
assert.equal(stunOnly.deductions.some((d) => d.id === 'FP_WEBRTC_LEAK'), false);
assert.equal(stunOnly.factors.find((f) => f.id === 'FP_WEBRTC_LEAK')?.classification, 'FINGERPRINTING_SURFACE');

// Private/local WebRTC exposure is a confirmed client-side finding.
const localRtc = engine.evaluate({
  ipCheck: { ip: '198.51.100.10', ipVersion: 'IPv4', isPrivate: false, headers: {} as any, connectionFlags: { hasProxyHeaders: false, viaHeader: null } },
  fingerprint: { webRtc: { localIps: ['192.168.1.50'], publicIps: ['8.8.8.8'], mdnsCandidates: [] } },
});
assert.equal(localRtc.deductions.find((d) => d.id === 'FP_WEBRTC_LEAK')?.points, -20);
assert.equal(localRtc.factors.find((f) => f.id === 'FP_WEBRTC_LEAK')?.scoreImpact, -20);
assert.equal(localRtc.privacyScore, 80);

// GeoIP fallback must remain unverifiable for security classifications.
const fallback = await new FallbackGeoIPProvider().lookup('8.8.8.8');
assert.equal(fallback.network.isVpn, null);
assert.equal(fallback.network.isProxy, null);
assert.equal(fallback.network.isTor, null);
assert.equal(fallback.network.providerStatus, 'UNAVAILABLE');

// Forwarding-header presence alone is informational, not a confirmed leak.
const headers = HeaderClassifier.analyze([
  { key: 'x-forwarded-for', normalizedKey: 'x-forwarded-for', value: '203.0.113.7' },
  { key: 'via', normalizedKey: 'via', value: '1.1 example-proxy' },
], false);
const forwardingFactor = headers.scoreFactors.find((f) => f.id === 'HDR_PROXY_HEADERS_OBSERVED');
assert.equal(forwardingFactor?.points, 0);

// A provider may return a verified payload without all security classifications.
// Missing classifications must stay UNAVAILABLE, never NOT_DETECTED.
const partialNetwork = engine.evaluate({
  ipCheck: { ip: '198.51.100.10', ipVersion: 'IPv4', isPrivate: false, headers: {} as any, connectionFlags: { hasProxyHeaders: false, viaHeader: null } },
  ipDetails: { network: { provider: 'HackMyIPProvider', providerStatus: 'VERIFIED', isVpn: null, isProxy: false, isTor: null, isHosting: true, isMobile: null } } as any,
});
assert.equal(partialNetwork.factors.find((f) => f.id === 'NET_VPN_DETECTED')?.status, 'UNAVAILABLE');
assert.equal(partialNetwork.factors.find((f) => f.id === 'NET_TOR_DETECTED')?.status, 'UNAVAILABLE');
assert.equal(partialNetwork.factors.find((f) => f.id === 'NET_PROXY_DETECTED')?.status, 'INFO');
assert.equal(partialNetwork.factors.find((f) => f.id === 'NET_HOSTING_DATACENTER')?.status, 'INFO');

console.log('[PASS] Global accuracy invariants verified');
