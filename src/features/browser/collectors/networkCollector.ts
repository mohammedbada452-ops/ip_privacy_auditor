/**
 * Network Information Collector
 * Inspects navigator.connection where legitimately exposed by modern browsers.
 */

import type { BaseCollectorResult, NetworkData } from '../types';

export function collectNetwork(): BaseCollectorResult<NetworkData> {
  const start = performance.now();

  try {
    if (typeof navigator === 'undefined') {
      return {
        id: 'network_info',
        category: 'NETWORK',
        supported: false,
        available: false,
        status: 'UNAVAILABLE',
        confidence: 'HIGH',
        durationMs: performance.now() - start,
        data: null,
      };
    }

    const conn =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    if (!conn) {
      return {
        id: 'network_info',
        category: 'NETWORK',
        supported: false,
        available: false,
        status: 'UNAVAILABLE',
        confidence: 'HIGH',
        durationMs: performance.now() - start,
        data: null,
      };
    }

    const data: NetworkData = {
      effectiveType: conn.effectiveType,
      downlink: conn.downlink,
      rtt: conn.rtt,
      saveData: conn.saveData,
      connectionType: conn.type,
    };

    return {
      id: 'network_info',
      category: 'NETWORK',
      supported: true,
      available: true,
      status: 'SUCCESS',
      confidence: 'MEDIUM',
      durationMs: performance.now() - start,
      data,
    };
  } catch (err: unknown) {
    return {
      id: 'network_info',
      category: 'NETWORK',
      supported: false,
      available: false,
      status: 'ERROR',
      confidence: 'LOW',
      durationMs: performance.now() - start,
      data: null,
      error: err instanceof Error ? err.message : 'Network info collection failed',
    };
  }
}
