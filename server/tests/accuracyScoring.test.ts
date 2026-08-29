import assert from 'node:assert/strict';
import { PrivacyEngine } from '../privacy/PrivacyEngine';

const baseInput = {
  ipCheck: {
    ip: '8.8.8.8',
    ipVersion: 'IPv4' as const,
    isPrivate: false,
    observationScope: 'PUBLIC' as const,
    isAuthoritativeForClientEgress: true,
    headers: {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36',
      secGpc: null,
      dnt: null,
      acceptLanguage: 'en-US,en;q=0.9',
      connection: 'keep-alive',
    },
    connectionFlags: {
      hasProxyHeaders: false,
      isInfrastructureProxy: false,
      viaHeader: null,
    },
  },
  ipDetails: {
    ip: '8.8.8.8',
    geo: { country: 'United States', countryCode: 'US', region: '', city: '', postalCode: '', latitude: null, longitude: null, timezone: 'UTC' },
    network: { isp: 'Example ISP', organization: 'Example ISP', asn: 'AS15169', isMobile: false, isProxy: false, isVpn: false, isTor: false, isHosting: false },
  },
};

const engine = new PrivacyEngine();

const missingControls = engine.evaluate(baseInput);
assert.equal(missingControls.deductions.some((d) => d.id === 'HDR_SEC_GPC_SIGNAL'), false);
assert.equal(missingControls.deductions.some((d) => d.id === 'HDR_USER_AGENT_DISCLOSURE'), false);

const fingerprintSurfaces = engine.evaluate({ ...baseInput, fingerprint: { canvasHash: 'abc123', audioHash: 'def456' } });
assert.equal(fingerprintSurfaces.deductions.some((d) => d.id === 'FP_CANVAS_UNIQUE'), false);
assert.equal(fingerprintSurfaces.deductions.some((d) => d.id === 'FP_AUDIO_SIGNATURE'), false);

const webgl = engine.evaluate({ ...baseInput, fingerprint: { webgl: { status: 'EXPOSED', isUnmasked: true, vendor: 'X', renderer: 'NVIDIA RTX' } } });
const webglFactor = webgl.factors.find((f) => f.id === 'FP_WEBGL_HARDWARE');
assert.equal(webglFactor?.points, -3);
assert.equal(webglFactor?.severity, 'medium');
assert.equal(webgl.privacyScore, 97);

const automation = engine.evaluate({ ...baseInput, fingerprint: { securityFlags: { isAutomation: true } } });
const automationFactor = automation.factors.find((f) => f.id === 'SEC_AUTOMATION_FLAG');
assert.equal(automationFactor?.points, 0);
assert.equal(automationFactor?.detected, true);

console.log('[PASS] Privacy score accuracy invariants verified');
