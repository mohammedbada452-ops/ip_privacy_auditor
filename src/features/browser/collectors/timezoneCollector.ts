/**
 * Timezone Characteristics Collector
 * Extracts IANA timezone and UTC offset using standard browser Intl APIs without fabricating physical location.
 */

import type { BaseCollectorResult, TimezoneData } from '../types';

export function collectTimezone(): BaseCollectorResult<TimezoneData> {
  const start = performance.now();

  try {
    let timezone = '';
    if (typeof Intl === 'undefined' || !Intl.DateTimeFormat) {
      return {
        id: 'timezone_intelligence',
        category: 'TIMEZONE',
        supported: false,
        available: false,
        status: 'UNAVAILABLE',
        confidence: 'HIGH',
        durationMs: performance.now() - start,
        data: null,
        error: 'Intl.DateTimeFormat is unavailable in this browser.',
      };
    }
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    } catch {
      return {
        id: 'timezone_intelligence',
        category: 'TIMEZONE',
        supported: true,
        available: false,
        status: 'ERROR',
        confidence: 'LOW',
        durationMs: performance.now() - start,
        data: null,
        error: 'Unable to read the browser timezone.',
      };
    }
    if (!timezone) {
      return {
        id: 'timezone_intelligence',
        category: 'TIMEZONE',
        supported: true,
        available: false,
        status: 'UNAVAILABLE',
        confidence: 'HIGH',
        durationMs: performance.now() - start,
        data: null,
        error: 'Browser did not expose a timezone identifier.',
      };
    }

    const now = new Date();
    const utcOffsetMinutes = -now.getTimezoneOffset(); // Positive for East, Negative for West

    const hours = Math.floor(Math.abs(utcOffsetMinutes) / 60);
    const mins = Math.abs(utcOffsetMinutes) % 60;
    const sign = utcOffsetMinutes >= 0 ? '+' : '-';
    const formattedOffset = `UTC${sign}${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

    // DST check: compare January and July offsets
    const jan = new Date(now.getFullYear(), 0, 1);
    const jul = new Date(now.getFullYear(), 6, 1);
    const standardOffset = Math.max(-jan.getTimezoneOffset(), -jul.getTimezoneOffset());
    const dstActive = utcOffsetMinutes !== standardOffset;

    const data: TimezoneData = {
      timezone,
      utcOffsetMinutes,
      formattedOffset,
      dstActive,
    };

    return {
      id: 'timezone_intelligence',
      category: 'TIMEZONE',
      supported: true,
      available: true,
      status: 'SUCCESS',
      confidence: 'HIGH',
      durationMs: performance.now() - start,
      data,
    };
  } catch (err: unknown) {
    return {
      id: 'timezone_intelligence',
      category: 'TIMEZONE',
      supported: false,
      available: false,
      status: 'ERROR',
      confidence: 'LOW',
      durationMs: performance.now() - start,
      data: null,
      error: err instanceof Error ? err.message : 'Timezone collection failed',
    };
  }
}
