/**
 * Capability Matrix Collector
 * Detects presence and accessibility of browser APIs before executing specialized collectors.
 */

import type { BaseCollectorResult, CapabilityMatrix, CapabilityStatus } from '../types';

function checkCapability(fn: () => boolean): CapabilityStatus {
  try {
    return fn() ? 'SUPPORTED' : 'UNSUPPORTED';
  } catch {
    return 'BLOCKED';
  }
}

export function collectCapabilities(): BaseCollectorResult<CapabilityMatrix> {
  const start = performance.now();

  try {
    const isBrowser = typeof window !== 'undefined';

    const webRtc: CapabilityStatus = checkCapability(() => {
      return (
        isBrowser &&
        (typeof window.RTCPeerConnection !== 'undefined' ||
          typeof (window as any).webkitRTCPeerConnection !== 'undefined')
      );
    });

    const canvas2d: CapabilityStatus = checkCapability(() => {
      if (!isBrowser || typeof document === 'undefined') return false;
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext && canvas.getContext('2d'));
    });

    const webGl: CapabilityStatus = checkCapability(() => {
      if (!isBrowser || typeof document === 'undefined') return false;
      const canvas = document.createElement('canvas');
      return !!(
        canvas.getContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      );
    });

    const webGl2: CapabilityStatus = checkCapability(() => {
      if (!isBrowser || typeof document === 'undefined') return false;
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext && canvas.getContext('webgl2'));
    });

    const audioContext: CapabilityStatus = checkCapability(() => {
      return (
        isBrowser &&
        (typeof window.AudioContext !== 'undefined' ||
          typeof (window as any).webkitAudioContext !== 'undefined')
      );
    });

    const offlineAudioContext: CapabilityStatus = checkCapability(() => {
      return (
        isBrowser &&
        (typeof window.OfflineAudioContext !== 'undefined' ||
          typeof (window as any).webkitOfflineAudioContext !== 'undefined')
      );
    });

    const localStorage: CapabilityStatus = checkCapability(() => {
      return isBrowser && typeof window.localStorage !== 'undefined';
    });

    const sessionStorage: CapabilityStatus = checkCapability(() => {
      return isBrowser && typeof window.sessionStorage !== 'undefined';
    });

    const indexedDb: CapabilityStatus = checkCapability(() => {
      return isBrowser && typeof window.indexedDB !== 'undefined';
    });

    const networkInfo: CapabilityStatus = checkCapability(() => {
      return (
        isBrowser &&
        typeof navigator !== 'undefined' &&
        (typeof (navigator as any).connection !== 'undefined' ||
          typeof (navigator as any).mozConnection !== 'undefined' ||
          typeof (navigator as any).webkitConnection !== 'undefined')
      );
    });

    const clientHints: CapabilityStatus = checkCapability(() => {
      return (
        isBrowser &&
        typeof navigator !== 'undefined' &&
        typeof (navigator as any).userAgentData !== 'undefined'
      );
    });

    const permissionsApi: CapabilityStatus = checkCapability(() => {
      return (
        isBrowser &&
        typeof navigator !== 'undefined' &&
        typeof navigator.permissions !== 'undefined'
      );
    });

    const matrix: CapabilityMatrix = {
      webRtc,
      webGl,
      webGl2,
      canvas2d,
      audioContext,
      offlineAudioContext,
      localStorage,
      sessionStorage,
      indexedDb,
      networkInfo,
      clientHints,
      permissionsApi,
    };

    return {
      id: 'capability_matrix',
      category: 'CAPABILITY',
      supported: true,
      available: true,
      status: 'SUCCESS',
      confidence: 'HIGH',
      durationMs: performance.now() - start,
      data: matrix,
    };
  } catch (err: unknown) {
    return {
      id: 'capability_matrix',
      category: 'CAPABILITY',
      supported: false,
      available: false,
      status: 'ERROR',
      confidence: 'LOW',
      durationMs: performance.now() - start,
      data: null,
      error: err instanceof Error ? err.message : 'Capability detection failed',
    };
  }
}
