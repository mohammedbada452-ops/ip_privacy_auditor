/**
 * WebGL GPU Hardware Intelligence Collector
 * Measures whether GPU hardware identifiers (vendor & renderer) are disclosed or masked.
 * Performs clean resource disposal.
 */

import type { BaseCollectorResult, WebGlData, WebGlStatus } from '../types';
import { fnv1a32 } from '../utils/hash';

export function collectWebGL(): BaseCollectorResult<WebGlData> {
  const start = performance.now();

  try {
    if (typeof document === 'undefined') {
      return {
        id: 'webgl_hardware',
        category: 'GRAPHICS',
        supported: false,
        available: false,
        status: 'UNAVAILABLE',
        confidence: 'HIGH',
        durationMs: performance.now() - start,
        data: {
          status: 'UNAVAILABLE',
          isUnmasked: false,
        },
      };
    }

    const canvas = document.createElement('canvas');
    let gl: WebGLRenderingContext | null = null;

    try {
      gl =
        (canvas.getContext('webgl') as WebGLRenderingContext) ||
        (canvas.getContext('experimental-webgl') as WebGLRenderingContext);
    } catch {
      gl = null;
    }

    if (!gl) {
      return {
        id: 'webgl_hardware',
        category: 'GRAPHICS',
        supported: false,
        available: false,
        status: 'UNAVAILABLE',
        confidence: 'HIGH',
        durationMs: performance.now() - start,
        data: {
          status: 'UNAVAILABLE',
          isUnmasked: false,
        },
      };
    }

    let vendor = '';
    let renderer = '';
    let unmaskedVendor = '';
    let unmaskedRenderer = '';
    let isUnmasked = false;
    let maxTextureSize: number | undefined;
    let maxCubeMapTextureSize: number | undefined;
    let shaderPrecision: string | undefined;

    try {
      vendor = gl.getParameter(gl.VENDOR) || '';
      renderer = gl.getParameter(gl.RENDERER) || '';

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        unmaskedVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';
        unmaskedRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';

        if (unmaskedRenderer && !unmaskedRenderer.toLowerCase().includes('generic') && !unmaskedRenderer.toLowerCase().includes('masked')) {
          isUnmasked = true;
        }
      }

      maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      maxCubeMapTextureSize = gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE);

      const precisionFormat = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
      if (precisionFormat) {
        shaderPrecision = `${precisionFormat.precision}_${precisionFormat.rangeMin}_${precisionFormat.rangeMax}`;
      }
    } catch {
      // Ignore inspection errors
    }

    // Context cleanup
    try {
      const loseContext = gl.getExtension('WEBGL_lose_context');
      if (loseContext) {
        loseContext.loseContext();
      }
    } catch {
      // Ignore
    }

    const effectiveVendor = unmaskedVendor || vendor;
    const effectiveRenderer = unmaskedRenderer || renderer;

    const hardwareHash = fnv1a32(
      `${effectiveVendor}|${effectiveRenderer}|${maxTextureSize || 0}|${maxCubeMapTextureSize || 0}|${shaderPrecision || ''}`
    );

    let status: WebGlStatus = 'MASKED';
    if (isUnmasked) {
      status = 'EXPOSED';
    } else if (effectiveRenderer) {
      status = 'MASKED';
    } else {
      status = 'UNAVAILABLE';
    }

    const data: WebGlData = {
      status,
      vendor: vendor || undefined,
      renderer: renderer || undefined,
      unmaskedVendor: unmaskedVendor || undefined,
      unmaskedRenderer: unmaskedRenderer || undefined,
      isUnmasked,
      maxTextureSize,
      maxCubeMapTextureSize,
      shaderPrecision,
      hardwareHash,
    };

    return {
      id: 'webgl_hardware',
      category: 'GRAPHICS',
      supported: true,
      available: true,
      status: 'SUCCESS',
      confidence: 'HIGH',
      durationMs: performance.now() - start,
      data,
    };
  } catch (err: unknown) {
    return {
      id: 'webgl_hardware',
      category: 'GRAPHICS',
      supported: false,
      available: false,
      status: 'ERROR',
      confidence: 'LOW',
      durationMs: performance.now() - start,
      data: {
        status: 'ERROR',
        isUnmasked: false,
      },
      error: err instanceof Error ? err.message : 'WebGL collection failed',
    };
  }
}
