/**
 * Canvas Fingerprint Detector
 * Classifies 2D Canvas rendering stability, randomization, and distinctiveness.
 */

import type { CanvasData, CanvasStatus, ConfidenceLevel } from '../types';

export interface CanvasDetectionOutcome {
  status: CanvasStatus;
  isRandomized: boolean;
  confidence: ConfidenceLevel;
  summary: string;
  recommendation?: string;
}

export function detectCanvasSignature(data: CanvasData | null): CanvasDetectionOutcome {
  if (!data || data.status === 'UNAVAILABLE') {
    return {
      status: 'UNAVAILABLE',
      isRandomized: false,
      confidence: 'HIGH',
      summary: 'HTML5 2D Canvas API is unavailable.',
    };
  }

  if (data.status === 'BLOCKED' || data.isBlank) {
    return {
      status: 'BLOCKED',
      isRandomized: false,
      confidence: 'HIGH',
      summary: 'Canvas pixel extraction is blocked by browser privacy protection.',
    };
  }

  if (data.isRandomized || data.status === 'RANDOMIZED') {
    return {
      status: 'RANDOMIZED',
      isRandomized: true,
      confidence: 'HIGH',
      summary: 'Canvas rendering is actively randomized (anti-fingerprinting protection enabled).',
    };
  }

  return {
    status: 'DISTINGUISHABLE_SIGNATURE',
    isRandomized: false,
    confidence: 'HIGH',
    summary: `Canvas produces a deterministic rendering signature (Hash: ${data.hash || 'N/A'}).`,
    recommendation: 'Consider using a browser with built-in canvas randomization or anti-fingerprinting protection.',
  };
}
