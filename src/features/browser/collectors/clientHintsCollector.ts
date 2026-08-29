/**
 * Client Hints Collector
 * Inspects navigator.userAgentData where supported without intrusive high-entropy requests.
 */

import type { BaseCollectorResult, ClientHintsData } from '../types';

export function collectClientHints(): BaseCollectorResult<ClientHintsData> {
  const start = performance.now();

  try {
    if (typeof navigator === 'undefined' || !(navigator as any).userAgentData) {
      return {
        id: 'client_hints',
        category: 'IDENTITY',
        supported: false,
        available: false,
        status: 'UNAVAILABLE',
        confidence: 'HIGH',
        durationMs: performance.now() - start,
        data: null,
      };
    }

    const uad = (navigator as any).userAgentData;

    const data: ClientHintsData = {
      brands: Array.isArray(uad.brands)
        ? uad.brands.map((b: any) => ({ brand: String(b.brand), version: String(b.version) }))
        : undefined,
      mobile: typeof uad.mobile === 'boolean' ? uad.mobile : undefined,
      platform: typeof uad.platform === 'string' ? uad.platform : undefined,
    };

    return {
      id: 'client_hints',
      category: 'IDENTITY',
      supported: true,
      available: true,
      status: 'SUCCESS',
      confidence: 'HIGH',
      durationMs: performance.now() - start,
      data,
    };
  } catch (err: unknown) {
    return {
      id: 'client_hints',
      category: 'IDENTITY',
      supported: false,
      available: false,
      status: 'ERROR',
      confidence: 'LOW',
      durationMs: performance.now() - start,
      data: null,
      error: err instanceof Error ? err.message : 'Client Hints collection failed',
    };
  }
}
