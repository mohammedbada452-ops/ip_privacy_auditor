import assert from 'node:assert';
import { PrivacyEngine } from '../privacy/PrivacyEngine';
import { HeaderCollector } from '../headers/HeaderCollector';
import { HeaderClassifier } from '../headers/HeaderClassifier';

console.log('--- STAGE 1 TRUST CORRECTIONS ---');

// 1. WebRTC must only qualify as PROTECTED when positive mDNS evidence exists.
{
  const engine = new PrivacyEngine();
  const noLeak = engine.evaluate({
    fingerprint: {
      webRtc: { status: 'NO_LEAK', localIps: [], publicIps: [], mdnsCandidates: [] },
    },
  } as any);
  const factor = noLeak.factors.find((f) => f.id === 'FP_WEBRTC_LEAK');
  assert(factor, 'WebRTC factor must exist');
  assert.strictEqual(factor?.metadata?.mdnsProtectionConfirmed, false, 'No-leak result must not claim mDNS protection');

  const mdns = engine.evaluate({
    fingerprint: {
      webRtc: { status: 'PROTECTED', localIps: [], publicIps: [], mdnsCandidates: ['example.local'] },
    },
  } as any);
  const mdnsFactor = mdns.factors.find((f) => f.id === 'FP_WEBRTC_LEAK');
  assert.strictEqual(mdnsFactor?.metadata?.mdnsProtectionConfirmed, true, 'mDNS evidence must confirm protection');
  console.log('[PASS] WebRTC protection requires positive mDNS evidence');
}

// 2. Privasec worker-derived headers must never be counted as browser-originated headers.
{
  const req = {
    rawHeaders: [
      'Host', 'example.test',
      'User-Agent', 'TestBrowser/1.0',
      'x-privasec-cf-country', 'SY',
      'x-privasec-cf-asn', '216472',
    ],
    headers: {
      host: 'example.test',
      'user-agent': 'TestBrowser/1.0',
      'x-privasec-cf-country': 'SY',
      'x-privasec-cf-asn': '216472',
    },
  } as any;

  const browserHeaders = HeaderCollector.collect(req);
  const derived = HeaderCollector.collectServerDerivedMetadata(req);
  assert(browserHeaders.every((h) => !h.normalizedKey.startsWith('x-privasec-')), 'Internal Privasec metadata must not enter browser header list');
  assert.strictEqual(derived.length, 2, 'Server-derived metadata must remain separately available');
  const analysis = HeaderClassifier.analyze(browserHeaders, true, derived);
  assert.strictEqual(analysis.summary.totalReceived, 2, 'Browser header count must exclude internal metadata');
  assert.strictEqual(analysis.serverDerivedMetadata?.length, 2, 'Derived metadata must remain available separately');
  console.log('[PASS] Browser headers are separated from Privasec-derived metadata');
}

console.log('STAGE 1 TRUST CORRECTIONS: PASS');
