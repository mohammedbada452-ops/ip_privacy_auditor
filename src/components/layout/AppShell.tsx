import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useRouter } from '../../router/Router';
import { updateDocumentTitle } from '../../lib/navigation/routes';
import { useLanguage } from '../../i18n/LanguageContext';
import { Header } from './Header';
import { MobileNav } from '../navigation/MobileNav';
import { PageContainer } from './PageContainer';
import { Footer } from './Footer';
import { SEOHead } from '../seo/SEOHead';

// Route Component Imports
const HomeRoute = lazy(() => import('../../routes/HomeRoute').then((m) => ({ default: m.HomeRoute })));
const BrowserRoute = lazy(() => import('../../routes/BrowserRoute').then((m) => ({ default: m.BrowserRoute })));
const HeadersRoute = lazy(() => import('../../routes/HeadersRoute').then((m) => ({ default: m.HeadersRoute })));
const AdminRoute = lazy(() => import('../../routes/AdminRoute').then((m) => ({ default: m.AdminRoute })));
const AdminDashboardRoute = lazy(() => import('../../routes/AdminDashboardRoute').then((m) => ({ default: m.AdminDashboardRoute })));
const DesignSystemShowcase = lazy(() => import('../../routes/DesignSystemShowcase').then((m) => ({ default: m.DesignSystemShowcase })));
const NotFoundPage = lazy(() => import('../../routes/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));
const PrivacyPolicyRoute = lazy(() => import('../../routes/PrivacyPolicyRoute').then((m) => ({ default: m.PrivacyPolicyRoute })));
const LearnRoute = lazy(() => import('../../routes/LearnRoute').then((m) => ({ default: m.LearnRoute })));

export const AppShell: React.FC = () => {
  const { currentPath } = useRouter();
  const { language, t } = useLanguage();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);

  // Update Document Title whenever path or language changes
  useEffect(() => {
    updateDocumentTitle(currentPath, language);
  }, [currentPath, language]);

  const seo = (() => {
    const meta: Record<string, { title: string; description: string }> = {
      '/': { title: 'PrivaSec — Free Privacy & Browser Intelligence Auditor', description: 'Free, evidence-first privacy auditing for IP, networks, browser signals, fingerprint exposure, HTTP headers, and website security.' },
      '/browser': { title: 'Browser Privacy & Fingerprint Test | PrivaSec', description: 'Measure browser privacy signals, fingerprint exposure, WebRTC, graphics, hardware, storage, and automation indicators.' },
      '/headers': { title: 'HTTP Security & Privacy Headers Test | PrivaSec', description: 'Inspect HTTP privacy and security headers, client hints, proxy signals, and configuration evidence.' },
      '/privacy': { title: 'Privacy Policy | PrivaSec', description: 'Learn what PrivaSec measures, processes, stores, and deliberately does not collect.' },
      '/learn': { title: 'Privacy & Security Learning Center | PrivaSec', description: 'Practical guides to IP privacy, browser fingerprinting, WebRTC, security headers, and IP reputation.' },
    };
    return meta[currentPath] || { title: 'PrivaSec | Privacy Intelligence', description: 'Free privacy and browser exposure auditing with evidence-backed results.' };
  })();

  // Route matching outlet
  const renderRouteOutlet = () => {
    switch (currentPath) {
      case '/':
        return <HomeRoute />;
      case '/browser':
        return <BrowserRoute />;
      case '/headers':
        return <HeadersRoute />;
      case '/privacy':
        return <PrivacyPolicyRoute />;
      case '/learn':
        return <LearnRoute />;
      case '/admin':
        return <AdminRoute />;
      case '/admin/dashboard':
        return <AdminDashboardRoute />;
      case '/design-system':
        return import.meta.env.DEV ? <DesignSystemShowcase /> : <NotFoundPage />;
      default:
        return <NotFoundPage />;
    }
  };

  return (
    <>
      <SEOHead title={seo.title} description={seo.description} path={currentPath} />
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Header */}
      <Header onOpenMobileNav={() => setIsMobileNavOpen(true)} />

      {/* Mobile Navigation Drawer */}
      <MobileNav
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
      />

      {/* Main Page Container */}
      <main className="flex-1 w-full" id="main-content">
        <PageContainer maxWidth="7xl">
          <Suspense fallback={<div className="p-8 text-slate-400" role="status" aria-live="polite">{t.common.loading}</div>}>{renderRouteOutlet()}</Suspense>
        </PageContainer>
      </main>

      {/* Footer */}
      <Footer />
      </div>
    </>
  );
};
