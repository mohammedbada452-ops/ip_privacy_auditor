/**
 * Display Characteristics Collector
 * Inspects display dimensions, color depth, pixel ratio, and viewport without uploading screenshots.
 */

import type { BaseCollectorResult, DisplayData } from '../types';

export function collectDisplay(): BaseCollectorResult<DisplayData> {
  const start = performance.now();

  try {
    if (typeof window === 'undefined' || typeof window.screen === 'undefined') {
      return {
        id: 'display_intelligence',
        category: 'DISPLAY',
        supported: false,
        available: false,
        status: 'UNAVAILABLE',
        confidence: 'HIGH',
        durationMs: performance.now() - start,
        data: null,
      };
    }

    const scr = window.screen;
    const orientation = scr.orientation?.type || (scr as any).mozOrientation || (scr as any).msOrientation;

    const data: DisplayData = {
      width: scr.width || 0,
      height: scr.height || 0,
      availWidth: scr.availWidth || 0,
      availHeight: scr.availHeight || 0,
      colorDepth: scr.colorDepth || 0,
      pixelDepth: scr.pixelDepth || 0,
      devicePixelRatio: window.devicePixelRatio || 1,
      orientation: orientation ? String(orientation) : undefined,
      viewportWidth: window.innerWidth || 0,
      viewportHeight: window.innerHeight || 0,
    };

    return {
      id: 'display_intelligence',
      category: 'DISPLAY',
      supported: true,
      available: true,
      status: 'SUCCESS',
      confidence: 'HIGH',
      durationMs: performance.now() - start,
      data,
    };
  } catch (err: unknown) {
    return {
      id: 'display_intelligence',
      category: 'DISPLAY',
      supported: false,
      available: false,
      status: 'ERROR',
      confidence: 'LOW',
      durationMs: performance.now() - start,
      data: null,
      error: err instanceof Error ? err.message : 'Display collection failed',
    };
  }
}
