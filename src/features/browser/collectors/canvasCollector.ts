/**
 * Canvas Fingerprint Intelligence Collector
 * Measures 2D Canvas rendering signatures with local deterministic hashing.
 * Detects active canvas randomization / anti-fingerprinting masking.
 * Never uploads raw image data or pixel buffers.
 */

import type { BaseCollectorResult, CanvasData, CanvasStatus } from '../types';
import { fnv1a32 } from '../utils/hash';

function drawCanvasPattern(canvas: HTMLCanvasElement): string | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  canvas.width = 280;
  canvas.height = 60;

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 280, 60);
  grad.addColorStop(0, '#f87171');
  grad.addColorStop(0.5, '#38bdf8');
  grad.addColorStop(1, '#a855f7');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 280, 60);

  // Geometric shapes with alpha transparency
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(40, 30, 20, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.fill();

  // Composite operation
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = '#10b981';
  ctx.fillRect(30, 15, 45, 30);

  // Reset composite for text
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1.0;

  // Multi-font text & emoji rendering
  ctx.fillStyle = '#0f172a';
  ctx.font = '14px Arial, sans-serif';
  ctx.fillText('PrivacyAuditor C(280x60)', 85, 25);

  ctx.font = '12px "Times New Roman", serif';
  ctx.fillStyle = '#1e293b';
  ctx.fillText('🔒🕵️‍♂️ 0x9f81_DSP', 85, 45);

  return canvas.toDataURL();
}

export function collectCanvas(): BaseCollectorResult<CanvasData> {
  const start = performance.now();

  try {
    if (typeof document === 'undefined') {
      return {
        id: 'canvas_fingerprint',
        category: 'GRAPHICS',
        supported: false,
        available: false,
        status: 'UNAVAILABLE',
        confidence: 'HIGH',
        durationMs: performance.now() - start,
        data: {
          status: 'UNAVAILABLE',
          isRandomized: false,
          isStable: false,
          isBlank: false,
          testAttempts: 0,
        },
      };
    }

    const canvas1 = document.createElement('canvas');
    const dataUrl1 = drawCanvasPattern(canvas1);

    if (!dataUrl1) {
      return {
        id: 'canvas_fingerprint',
        category: 'GRAPHICS',
        supported: false,
        available: false,
        status: 'UNAVAILABLE',
        confidence: 'HIGH',
        durationMs: performance.now() - start,
        data: {
          status: 'UNAVAILABLE',
          isRandomized: false,
          isStable: false,
          isBlank: false,
          testAttempts: 1,
        },
      };
    }

    // Check for blank or blocked canvas
    if (dataUrl1.length < 50 || dataUrl1 === 'data:,') {
      return {
        id: 'canvas_fingerprint',
        category: 'GRAPHICS',
        supported: true,
        available: true,
        status: 'BLOCKED',
        confidence: 'HIGH',
        durationMs: performance.now() - start,
        data: {
          status: 'BLOCKED',
          isRandomized: false,
          isStable: false,
          isBlank: true,
          testAttempts: 1,
        },
      };
    }

    const hash1 = fnv1a32(dataUrl1);

    // Run secondary attempt on a new canvas to test stability vs. randomization
    const canvas2 = document.createElement('canvas');
    const dataUrl2 = drawCanvasPattern(canvas2);
    const hash2 = dataUrl2 ? fnv1a32(dataUrl2) : null;

    const isRandomized = hash2 !== null && hash1 !== hash2;
    const isStable = hash2 !== null && hash1 === hash2;

    let status: CanvasStatus = 'DISTINGUISHABLE_SIGNATURE';
    if (isRandomized) {
      status = 'RANDOMIZED';
    } else if (isStable) {
      status = 'STABLE_SIGNATURE';
    }

    const data: CanvasData = {
      status,
      hash: hash1,
      isRandomized,
      isStable,
      isBlank: false,
      testAttempts: 2,
    };

    return {
      id: 'canvas_fingerprint',
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
      id: 'canvas_fingerprint',
      category: 'GRAPHICS',
      supported: false,
      available: false,
      status: 'ERROR',
      confidence: 'LOW',
      durationMs: performance.now() - start,
      data: {
        status: 'ERROR',
        isRandomized: false,
        isStable: false,
        isBlank: false,
        testAttempts: 0,
      },
      error: err instanceof Error ? err.message : 'Canvas collection failed',
    };
  }
}
