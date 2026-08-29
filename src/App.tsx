import React, { Suspense } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingBoundary } from './components/LoadingBoundary';
import { RouterProvider } from './router/Router';
import { LanguageProvider } from './i18n/LanguageContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { UnifiedScanProvider } from './context/UnifiedScanContext';
import { AppShell } from './components/AppShell';

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingBoundary message="Loading application shell..." />}>
        <LanguageProvider>
          <AdminAuthProvider>
            <UnifiedScanProvider>
              <RouterProvider>
                <AppShell />
              </RouterProvider>
            </UnifiedScanProvider>
          </AdminAuthProvider>
        </LanguageProvider>
      </Suspense>
    </ErrorBoundary>
  );
}
