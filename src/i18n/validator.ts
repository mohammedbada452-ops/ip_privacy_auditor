/**
 * i18n Dictionary Validation Engine
 * Enforces 100% key symmetry and completeness across all 6 supported languages.
 */

import { en } from './locales/en';
import { es } from './locales/es';
import { fr } from './locales/fr';
import { tr } from './locales/tr';
import { pt } from './locales/pt';
import { ar } from './locales/ar';
import type { Language, Translations } from './types';

export const SUPPORTED_LANGUAGES: Language[] = ['en', 'es', 'fr', 'tr', 'pt', 'ar'];

export const DICTIONARIES: Record<Language, Translations> = {
  en,
  es,
  fr,
  tr,
  pt,
  ar,
};

export interface ValidationError {
  language: Language;
  path: string;
  issue: 'missing_key' | 'extra_key' | 'empty_string' | 'type_mismatch';
}

function getObjectPaths(obj: Record<string, unknown>, prefix = ''): Array<{ path: string; value: unknown }> {
  const result: Array<{ path: string; value: unknown }> = [];

  for (const key of Object.keys(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result.push(...getObjectPaths(value as Record<string, unknown>, fullPath));
    } else {
      result.push({ path: fullPath, value });
    }
  }

  return result;
}

export function validateDictionaries(): { valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  const referencePaths = getObjectPaths(en as unknown as Record<string, unknown>);
  const referencePathMap = new Map(referencePaths.map((p) => [p.path, typeof p.value]));

  for (const lang of SUPPORTED_LANGUAGES) {
    if (lang === 'en') continue;

    const targetPaths = getObjectPaths(DICTIONARIES[lang] as unknown as Record<string, unknown>);
    const targetPathMap = new Map(targetPaths.map((p) => [p.path, p.value]));

    // Check for missing keys or empty strings
    for (const ref of referencePaths) {
      if (!targetPathMap.has(ref.path)) {
        errors.push({ language: lang, path: ref.path, issue: 'missing_key' });
      } else {
        const targetVal = targetPathMap.get(ref.path);
        if (typeof targetVal !== typeof ref.value) {
          errors.push({ language: lang, path: ref.path, issue: 'type_mismatch' });
        } else if (typeof targetVal === 'string' && targetVal.trim() === '') {
          errors.push({ language: lang, path: ref.path, issue: 'empty_string' });
        }
      }
    }

    // Check for extra unexpected keys
    for (const target of targetPaths) {
      if (!referencePathMap.has(target.path)) {
        errors.push({ language: lang, path: target.path, issue: 'extra_key' });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
