import { DICTIONARIES, validateDictionaries } from './validator';

export * from './types';
export * from './LanguageContext';
export * from './validator';
export { en } from './locales/en';
export { es } from './locales/es';
export { fr } from './locales/fr';
export { tr } from './locales/tr';
export { pt } from './locales/pt';
export { ar } from './locales/ar';

export const DEFAULT_LANGUAGE = 'en';
export const RTL_LANGUAGES = ['ar'];
export const translations = DICTIONARIES;
export const validateAllLocales = validateDictionaries;
