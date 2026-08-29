/**
 * Normalizer & Data Minimization Utility
 * Ensures all browser facts are sanitized and constrained before transmission.
 */

import type { BrowserFingerprintInput } from '@packages/api-contract';

export function sanitizeFingerprintPayload(input: BrowserFingerprintInput): BrowserFingerprintInput {
  const sanitized: BrowserFingerprintInput = {};

  if (typeof input.canvasHash === 'string') {
    sanitized.canvasHash = input.canvasHash.substring(0, 64);
  }

  if (input.webgl && typeof input.webgl === 'object') {
    sanitized.webgl = {
      vendor: typeof input.webgl.vendor === 'string' ? input.webgl.vendor.substring(0, 100) : undefined,
      renderer: typeof input.webgl.renderer === 'string' ? input.webgl.renderer.substring(0, 150) : undefined,
    };
  }

  if (typeof input.audioHash === 'string') {
    sanitized.audioHash = input.audioHash.substring(0, 64);
  }

  if (input.hardware && typeof input.hardware === 'object') {
    sanitized.hardware = {
      cpuCores: typeof input.hardware.cpuCores === 'number' ? Math.min(256, Math.max(0, input.hardware.cpuCores)) : undefined,
      deviceMemory: typeof input.hardware.deviceMemory === 'number' ? Math.min(1024, Math.max(0, input.hardware.deviceMemory)) : undefined,
      touchPoints: typeof input.hardware.touchPoints === 'number' ? Math.min(32, Math.max(0, input.hardware.touchPoints)) : undefined,
    };
  }

  if (input.screen && typeof input.screen === 'object') {
    sanitized.screen = {
      width: typeof input.screen.width === 'number' ? Math.min(10000, Math.max(0, input.screen.width)) : undefined,
      height: typeof input.screen.height === 'number' ? Math.min(10000, Math.max(0, input.screen.height)) : undefined,
      colorDepth: typeof input.screen.colorDepth === 'number' ? Math.min(64, Math.max(0, input.screen.colorDepth)) : undefined,
      pixelRatio: typeof input.screen.pixelRatio === 'number' ? Math.min(10, Math.max(0, input.screen.pixelRatio)) : undefined,
    };
  }

  if (typeof input.timezone === 'string') {
    sanitized.timezone = input.timezone.substring(0, 50);
  }

  if (Array.isArray(input.languages)) {
    sanitized.languages = input.languages.slice(0, 10).map((l) => String(l).substring(0, 15));
  }

  if (input.webRtc && typeof input.webRtc === 'object') {
    sanitized.webRtc = {
      localIps: Array.isArray(input.webRtc.localIps)
        ? input.webRtc.localIps.slice(0, 10).map((ip) => String(ip).substring(0, 45))
        : undefined,
      publicIps: Array.isArray(input.webRtc.publicIps)
        ? input.webRtc.publicIps.slice(0, 10).map((ip) => String(ip).substring(0, 45))
        : undefined,
    };
  }

  if (input.securityFlags && typeof input.securityFlags === 'object') {
    const flags = {
      isAutomation: typeof input.securityFlags.isAutomation === 'boolean' ? input.securityFlags.isAutomation : undefined,
      isAdBlockActive: typeof input.securityFlags.isAdBlockActive === 'boolean' ? input.securityFlags.isAdBlockActive : undefined,
      isIncognito: typeof input.securityFlags.isIncognito === 'boolean' ? input.securityFlags.isIncognito : undefined,
    };
    if (Object.values(flags).some((value) => value !== undefined)) {
      sanitized.securityFlags = flags;
    }
  }

  return sanitized;
}
