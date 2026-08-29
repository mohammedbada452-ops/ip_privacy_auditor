/**
 * Browser Identity Collector
 * Safely extracts user agent, platform, languages, and normalized browser family without generating user tracking identifiers.
 */

import type { BaseCollectorResult, IdentityData } from '../types';

export function collectIdentity(): BaseCollectorResult<IdentityData> {
  const start = performance.now();

  try {
    if (typeof navigator === 'undefined') {
      return {
        id: 'browser_identity',
        category: 'IDENTITY',
        supported: false,
        available: false,
        status: 'UNAVAILABLE',
        confidence: 'HIGH',
        durationMs: performance.now() - start,
        data: null,
      };
    }

    const ua = navigator.userAgent || '';
    const platform = navigator.platform || '';
    const vendor = navigator.vendor || '';
    const product = navigator.product || '';
    const language = navigator.language || '';
    const languages = Array.isArray(navigator.languages) ? [...navigator.languages] : [language];

    // Determine normalized browser family
    let browserFamily = 'Unknown';
    let browserVersion = 'Unknown';

    if (/Edg\/([0-9.]+)/.test(ua)) {
      browserFamily = 'Edge';
      browserVersion = ua.match(/Edg\/([0-9.]+)/)?.[1] || '';
    } else if (/Chrome\/([0-9.]+)/.test(ua) && !/Chromium/.test(ua)) {
      browserFamily = 'Chrome';
      browserVersion = ua.match(/Chrome\/([0-9.]+)/)?.[1] || '';
    } else if (/Firefox\/([0-9.]+)/.test(ua)) {
      browserFamily = 'Firefox';
      browserVersion = ua.match(/Firefox\/([0-9.]+)/)?.[1] || '';
    } else if (/Safari\/([0-9.]+)/.test(ua) && /Version\/([0-9.]+)/.test(ua)) {
      browserFamily = 'Safari';
      browserVersion = ua.match(/Version\/([0-9.]+)/)?.[1] || '';
    } else if (/OPR\/([0-9.]+)/.test(ua)) {
      browserFamily = 'Opera';
      browserVersion = ua.match(/OPR\/([0-9.]+)/)?.[1] || '';
    }

    // Determine normalized OS family
    let osFamily = 'Unknown';
    if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) {
      osFamily = 'iOS';
    } else if (/Android/i.test(ua)) {
      osFamily = 'Android';
    } else if (/Win/i.test(platform) || /Windows/i.test(ua)) {
      osFamily = 'Windows';
    } else if (/Mac/i.test(platform) || /Macintosh/i.test(ua)) {
      osFamily = 'macOS';
    } else if (/Linux/i.test(platform) || /Linux/i.test(ua)) {
      osFamily = 'Linux';
    }

    const data: IdentityData = {
      userAgent: ua,
      browserFamily,
      browserVersion,
      osFamily,
      platform,
      language,
      languages,
      vendor,
      product,
      hardwareConcurrency: navigator.hardwareConcurrency,
      maxTouchPoints: navigator.maxTouchPoints,
    };

    return {
      id: 'browser_identity',
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
      id: 'browser_identity',
      category: 'IDENTITY',
      supported: false,
      available: false,
      status: 'ERROR',
      confidence: 'LOW',
      durationMs: performance.now() - start,
      data: null,
      error: err instanceof Error ? err.message : 'Identity collection failed',
    };
  }
}
