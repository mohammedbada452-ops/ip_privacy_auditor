/**
 * Language and Locale Collector
 * Inspects navigator language configurations, Intl resolved locale, and internal consistency.
 */

import type { BaseCollectorResult, LocaleData } from '../types';

export function collectLocale(): BaseCollectorResult<LocaleData> {
  const start = performance.now();

  try {
    if (typeof navigator === 'undefined') {
      return {
        id: 'locale_intelligence',
        category: 'LOCALE',
        supported: false,
        available: false,
        status: 'UNAVAILABLE',
        confidence: 'HIGH',
        durationMs: performance.now() - start,
        data: null,
      };
    }

    const language = navigator.language || '';
    const languages = Array.isArray(navigator.languages) ? [...navigator.languages] : [language];

    let resolvedLocale = language;
    try {
      if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
        resolvedLocale = Intl.DateTimeFormat().resolvedOptions().locale || language;
      }
    } catch {
      resolvedLocale = language;
    }

    // Check if primary language matches primary Intl resolved locale
    const primaryLang = language.split('-')[0].toLowerCase();
    const primaryResolved = resolvedLocale.split('-')[0].toLowerCase();
    const localeConsistent = primaryLang === primaryResolved || languages.some((l) => l.split('-')[0].toLowerCase() === primaryResolved);

    const data: LocaleData = {
      language,
      languages,
      resolvedLocale,
      localeConsistent,
    };

    return {
      id: 'locale_intelligence',
      category: 'LOCALE',
      supported: true,
      available: true,
      status: 'SUCCESS',
      confidence: 'HIGH',
      durationMs: performance.now() - start,
      data,
    };
  } catch (err: unknown) {
    return {
      id: 'locale_intelligence',
      category: 'LOCALE',
      supported: false,
      available: false,
      status: 'ERROR',
      confidence: 'LOW',
      durationMs: performance.now() - start,
      data: null,
      error: err instanceof Error ? err.message : 'Locale collection failed',
    };
  }
}
