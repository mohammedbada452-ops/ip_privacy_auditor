/**
 * Hardware Characteristics Collector
 * Inspects logical CPU cores, approximate memory, and touch capabilities without requesting device permissions.
 */

import type { BaseCollectorResult, HardwareData } from '../types';

export function collectHardware(): BaseCollectorResult<HardwareData> {
  const start = performance.now();

  try {
    if (typeof navigator === 'undefined') {
      return {
        id: 'hardware_intelligence',
        category: 'HARDWARE',
        supported: false,
        available: false,
        status: 'UNAVAILABLE',
        confidence: 'HIGH',
        durationMs: performance.now() - start,
        data: null,
      };
    }

    const cpuCores = navigator.hardwareConcurrency;
    const deviceMemory = (navigator as any).deviceMemory;
    const maxTouchPoints = navigator.maxTouchPoints || 0;
    const touchSupported =
      maxTouchPoints > 0 ||
      (typeof window !== 'undefined' && 'ontouchstart' in window);

    const data: HardwareData = {
      cpuCores,
      deviceMemory,
      maxTouchPoints,
      touchSupported,
      hardwareConcurrency: cpuCores,
    };

    return {
      id: 'hardware_intelligence',
      category: 'HARDWARE',
      supported: true,
      available: true,
      status: 'SUCCESS',
      confidence: 'HIGH',
      durationMs: performance.now() - start,
      data,
    };
  } catch (err: unknown) {
    return {
      id: 'hardware_intelligence',
      category: 'HARDWARE',
      supported: false,
      available: false,
      status: 'ERROR',
      confidence: 'LOW',
      durationMs: performance.now() - start,
      data: null,
      error: err instanceof Error ? err.message : 'Hardware collection failed',
    };
  }
}
