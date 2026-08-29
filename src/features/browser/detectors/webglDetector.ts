/**
 * WebGL GPU Hardware Exposure Detector
 * Evaluates whether physical GPU renderer and vendor strings are unmasked.
 */

import type { WebGlData, WebGlStatus, ConfidenceLevel } from '../types';

export interface WebGlDetectionOutcome {
  status: WebGlStatus;
  isUnmasked: boolean;
  confidence: ConfidenceLevel;
  summary: string;
  recommendation?: string;
}

export function detectWebGlExposure(data: WebGlData | null): WebGlDetectionOutcome {
  if (!data || data.status === 'UNAVAILABLE') {
    return {
      status: 'UNAVAILABLE',
      isUnmasked: false,
      confidence: 'HIGH',
      summary: 'WebGL graphics context is not supported or unavailable.',
    };
  }

  if (data.status === 'BLOCKED') {
    return {
      status: 'BLOCKED',
      isUnmasked: false,
      confidence: 'HIGH',
      summary: 'WebGL context creation was blocked by browser privacy settings.',
    };
  }

  if (data.isUnmasked || data.status === 'EXPOSED') {
    const gpuName = data.unmaskedRenderer || data.renderer || 'Generic GPU';
    return {
      status: 'EXPOSED',
      isUnmasked: true,
      confidence: 'HIGH',
      summary: `Physical GPU hardware model disclosed: ${gpuName}`,
      recommendation: 'Enable WebGL hardware masking in your browser privacy settings or use privacy-focused browser modes.',
    };
  }

  return {
    status: 'MASKED',
    isUnmasked: false,
    confidence: 'HIGH',
    summary: 'WebGL renderer information is masked or generic.',
  };
}
