import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { updateDocumentTitle } from '../lib/navigation/routes';
import { DICTIONARIES, SUPPORTED_LANGUAGES } from './validator';
import type { Language, Direction, Translations, LanguageOption, LanguageContextType } from './types';

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', dir: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français', dir: 'ltr' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', dir: 'ltr' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
];

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  direction: 'ltr',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: DICTIONARIES.en,
  formatNumber: (val) => String(val),
  formatDate: (date) => new Date(date).toLocaleDateString(),
  formatScore: (score) => `${Math.round(score)}/100`,
  plural: (_, forms) => forms.other,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('privacy_auditor_lang') as Language;
    if (saved && SUPPORTED_LANGUAGES.includes(saved)) {
      return saved;
    }
    // Check browser languages
    if (typeof navigator !== 'undefined' && navigator.language) {
      const browserLang = navigator.language.slice(0, 2).toLowerCase();
      if (SUPPORTED_LANGUAGES.includes(browserLang as Language)) {
        return browserLang as Language;
      }
    }
    return 'en';
  });

  const direction: Direction = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    // Update document HTML direction and lang attribute
    document.documentElement.dir = direction;
    document.documentElement.lang = language;
    localStorage.setItem('privacy_auditor_lang', language);

    // Update document title
    updateDocumentTitle(window.location.pathname, language);
  }, [language, direction]);

  const setLanguage = useCallback((lang: Language) => {
    if (SUPPORTED_LANGUAGES.includes(lang)) {
      setLanguageState(lang);
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => {
      const currentIndex = SUPPORTED_LANGUAGES.indexOf(prev);
      const nextIndex = (currentIndex + 1) % SUPPORTED_LANGUAGES.length;
      return SUPPORTED_LANGUAGES[nextIndex];
    });
  }, []);

  const formatNumber = useCallback((value: number, options?: Intl.NumberFormatOptions): string => {
    try {
      const locale = language === 'ar' ? 'ar-EG' : language;
      return new Intl.NumberFormat(locale, options).format(value);
    } catch {
      return String(value);
    }
  }, [language]);

  const formatDate = useCallback((date: Date | number | string, options?: Intl.DateTimeFormatOptions): string => {
    try {
      const d = typeof date === 'object' ? date : new Date(date);
      const locale = language === 'ar' ? 'ar-EG' : language;
      return new Intl.DateTimeFormat(locale, options || { dateStyle: 'medium', timeStyle: 'short' }).format(d);
    } catch {
      return String(date);
    }
  }, [language]);

  const formatScore = useCallback((score: number): string => {
    const rounded = Math.round(score);
    return `${formatNumber(rounded)}/100`;
  }, [formatNumber]);

  const plural = useCallback((count: number, forms: { zero?: string; one: string; other: string }): string => {
    if (count === 0 && forms.zero) return forms.zero;
    if (count === 1) return forms.one;
    return forms.other;
  }, []);

  const t = useMemo<Translations>(() => {
    return DICTIONARIES[language] || DICTIONARIES.en;
  }, [language]);

  const contextValue = useMemo<LanguageContextType>(() => ({
    language,
    direction,
    setLanguage,
    toggleLanguage,
    t,
    formatNumber,
    formatDate,
    formatScore,
    plural,
  }), [language, direction, setLanguage, toggleLanguage, t, formatNumber, formatDate, formatScore, plural]);

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export function useTranslation(): { t: Translations; language: Language; direction: Direction } {
  const { t, language, direction } = useLanguage();
  return { t, language, direction };
}
