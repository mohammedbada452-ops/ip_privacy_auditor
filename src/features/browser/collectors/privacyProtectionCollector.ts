/**
 * Privacy Protection Collector
 * Detects browser anti-fingerprinting mechanisms, Global Privacy Control (GPC), and Do Not Track (DNT) flags.
 */

import type { BaseCollectorResult, PrivacyProtectionsData } from '../types';

export function collectPrivacyProtections(
  canvasRandomized?: boolean,
  webGlMasked?: boolean,
  webRtcMdnsActive?: boolean
): BaseCollectorResult<PrivacyProtectionsData> {
  const start = performance.now();

  try {
    const isBrowser = typeof window !== 'undefined';
    const nav = isBrowser && typeof navigator !== 'undefined' ? (navigator as any) : null;

    // 1. Global Privacy Control (GPC)
    const globalPrivacyControl = !!(nav && (nav.globalPrivacyControl === true || (window as any).globalPrivacyControl === true));

    // 2. Do Not Track (DNT)
    const dntValue = nav ? (nav.doNotTrack || (window as any).doNotTrack || nav.msDoNotTrack) : null;
    const doNotTrack = dntValue === '1' || dntValue === 'yes';

    // 3. Incognito/private mode and ad-blocking are not reliably detectable from
    // standard browser APIs. Do not fabricate a negative result when no trustworthy
    // signal exists; leave them undefined so the UI reports UNKNOWN.
    const incognitoSuspected: boolean | undefined = undefined;
    const adBlockDetected: boolean | undefined = undefined;

    const data: PrivacyProtectionsData = {
      globalPrivacyControl,
      doNotTrack,
      canvasMasked: canvasRandomized,
      webGlMasked,
      webRtcMdnsActive,
      incognitoSuspected,
      adBlockDetected,
    };

    return {
      id: 'privacy_protections',
      category: 'PRIVACY_PROTECTIONS',
      supported: true,
      available: true,
      status: 'SUCCESS',
      confidence: 'HIGH',
      durationMs: performance.now() - start,
      data,
    };
  } catch (err: unknown) {
    return {
      id: 'privacy_protections',
      category: 'PRIVACY_PROTECTIONS',
      supported: false,
      available: false,
      status: 'ERROR',
      confidence: 'LOW',
      durationMs: performance.now() - start,
      data: null,
      error: err instanceof Error ? err.message : 'Privacy protection collection failed',
    };
  }
}
