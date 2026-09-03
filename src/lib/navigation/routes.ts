/**
 * Centralized Route Configuration
 * Privacy & Browser Intelligence Auditor - Stage 10 i18n
 */

import type { Language } from '../../i18n/types';
import { DICTIONARIES } from '../../i18n/validator';

export interface RouteConfig {
  id: string;
  path: string;
  title: string;
  titleAr: string;
  description: string;
  category: 'public' | 'admin' | 'system';
}

export const ROUTES: Record<string, RouteConfig> = {
  HOME: {
    id: 'overview',
    path: '/',
    title: 'Overview',
    titleAr: 'نظرة عامة',
    description: 'Privacy & Browser Intelligence Overview Dashboard',
    category: 'public',
  },
  BROWSER: {
    id: 'browser',
    path: '/browser',
    title: 'Browser Signals',
    titleAr: 'إشارات المتصفح',
    description: 'Browser Fingerprinting, WebGL, Canvas & Hardware Intelligence',
    category: 'public',
  },
  HEADERS: {
    id: 'headers',
    path: '/headers',
    title: 'HTTP Headers',
    titleAr: 'ترويسات HTTP',
    description: 'HTTP Header Privacy & Security Inspector',
    category: 'public',
  },
  LEARN: {
    id: 'learn',
    path: '/learn',
    title: 'Learning Center',
    titleAr: 'مركز التعلم',
    description: 'Practical guides to privacy, browser signals, WebRTC, security headers and IP reputation',
    category: 'public',
  },
  PRIVACY_POLICY: {
    id: 'privacy-policy',
    path: '/privacy',
    title: 'Privacy Policy',
    titleAr: 'سياسة الخصوصية',
    description: 'How PrivaSec handles audit data and protects users',
    category: 'public',
  },
  ADMIN: {
    id: 'admin',
    path: '/admin',
    title: 'Admin',
    titleAr: 'الإدارة',
    description: 'Administrator Authentication & System Portal',
    category: 'admin',
  },
  ADMIN_DASHBOARD: {
    id: 'admin-dashboard',
    path: '/admin/dashboard',
    title: 'Admin Dashboard',
    titleAr: 'لوحة الإدارة',
    description: 'System Analytics, Scan Volume & Security Audit Logs',
    category: 'admin',
  },
  DESIGN_SYSTEM: {
    id: 'design-system',
    path: '/design-system',
    title: 'Design System',
    titleAr: 'نظام التصميم',
    description: 'Component & Token System Verification Showcase',
    category: 'system',
  },
};

/**
 * All application routes as an array
 */
export const ALL_ROUTES: RouteConfig[] = Object.values(ROUTES);

/**
 * Primary navigation items displayed in header
 */
export const PRIMARY_NAV_ROUTES: RouteConfig[] = [
  ROUTES.HOME,
  ROUTES.BROWSER,
  ROUTES.HEADERS,
  ROUTES.LEARN,
];

/**
 * Helper to determine if a route is active given the current location path.
 * Handles exact matching for root path '/' and nested route matching for subpaths.
 */
export function isRouteActive(currentPath: string, targetPath: string): boolean {
  if (targetPath === '/') {
    return currentPath === '/';
  }
  if (targetPath === '/admin') {
    return currentPath === '/admin' || currentPath.startsWith('/admin/');
  }
  return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
}

/**
 * Helper to find route configuration by exact path
 */
export function getRouteByPath(path: string): RouteConfig | undefined {
  return Object.values(ROUTES).find((r) => r.path === path);
}

/**
 * Gets localized route title based on language
 */
export function getRouteTitle(route: RouteConfig, lang: Language): string {
  const dict = DICTIONARIES[lang] || DICTIONARIES.en;
  switch (route.id) {
    case 'overview':
      return dict.nav.overview;
    case 'browser':
      return dict.nav.browser;
    case 'headers':
      return dict.nav.headers;
    case 'learn': {
      const labels: Record<Language, string> = {
        en: 'Learn',
        ar: 'التعلم',
        es: 'Aprender',
        fr: 'Apprendre',
        pt: 'Aprender',
        tr: 'Öğren',
      };
      return labels[lang];
    }
    case 'privacy-policy':
      return dict.nav.privacyPolicy;
    case 'admin':
      return dict.nav.admin;
    case 'admin-dashboard':
      return dict.nav.adminDashboard;
    case 'design-system':
      return dict.nav.designSystem;
    default:
      return route.title;
  }
}

/**
 * Updates browser document title based on current path and active language
 */
export function updateDocumentTitle(path: string, lang: Language = 'en'): void {
  const route = getRouteByPath(path);
  const dict = DICTIONARIES[lang] || DICTIONARIES.en;
  const baseTitle = dict.appTitle;

  if (path.startsWith('/learn/')) {
    const labels: Record<Language, string> = {
      en: 'Learning Guide',
      ar: 'دليل تعليمي',
      es: 'Guía de aprendizaje',
      fr: 'Guide d’apprentissage',
      pt: 'Guia de aprendizado',
      tr: 'Öğrenme Rehberi',
    };
    document.title = `${labels[lang]} | ${baseTitle}`;
    return;
  }

  if (route) {
    const pageTitle = getRouteTitle(route, lang);
    document.title = `${pageTitle} | ${baseTitle}`;
    return;
  }
  const notFoundTitle = dict.notFound.title;
  document.title = `${notFoundTitle} | ${baseTitle}`;
}

