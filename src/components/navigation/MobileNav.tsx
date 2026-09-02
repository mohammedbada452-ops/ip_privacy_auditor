import React from 'react';
import { Link, useRouter } from '../../router/Router';
import { PRIMARY_NAV_ROUTES, isRouteActive, getRouteTitle } from '../../lib/navigation/routes';
import { useLanguage } from '../../i18n/LanguageContext';
import { LanguageSelector } from '../i18n/LanguageSelector';
import { X, Shield, ChevronRight } from 'lucide-react';
import { useFocusTrap } from '../../lib/a11y/useFocusTrap';

export interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ isOpen, onClose }) => {
  const { currentPath } = useRouter();
  const { t, language } = useLanguage();

  const dialogRef = useFocusTrap<HTMLDivElement>({
    active: isOpen,
    onEscape: onClose,
    initialFocusSelector: 'button[aria-label]',
  });

  // Keep the page stationary while the mobile navigation dialog is open.
  React.useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const allNavRoutes = PRIMARY_NAV_ROUTES;

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 md:hidden flex flex-col bg-slate-950/95 backdrop-blur-xl transition-all duration-200"
      role="dialog"
      aria-modal="true"
      aria-label={t.menuOpen}
    >
      {/* Mobile Nav Top Bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 h-16 border-b border-slate-800/80 bg-slate-900/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 tracking-tight">
              {t.appTitle}
            </h2>
            <p className="text-[10px] text-slate-500 font-mono">
              {t.appSubtitle}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label={t.menuClose}
          className="min-w-11 min-h-11 p-2.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links Body */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-2">
        <p className="text-[11px] font-mono text-slate-500 uppercase tracking-wider px-2 mb-3">
          {t.nav.navigationRoutes}
        </p>

        {allNavRoutes.map((route) => {
          const isActive = isRouteActive(currentPath, route.path);
          const label = getRouteTitle(route, language);

          return (
            <Link
              key={route.path}
              to={route.path}
              onClick={onClose}
              className={`w-full flex items-center justify-between px-4 py-3 min-h-12 rounded-xl text-sm font-sans font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-semibold shadow-sm'
                  : 'text-slate-300 hover:text-slate-100 hover:bg-slate-900 border border-slate-800/60'
              }`}
            >
              <span>{label}</span>
              <ChevronRight
                className={`w-4 h-4 shrink-0 transition-transform ${
                  isActive ? 'text-cyan-400 translate-x-0.5' : 'text-slate-600'
                } ${language === 'ar' ? 'rotate-180' : ''}`}
              />
            </Link>
          );
        })}

        <div className="pt-6 border-t border-slate-800/80 mt-6">
          <p className="text-[11px] font-mono text-slate-500 uppercase tracking-wider px-2 mb-3">
            {t.common.languageSelect}
          </p>
          <div className="px-2">
            <LanguageSelector className="w-full justify-center py-2.5" />
          </div>
        </div>
      </div>

      {/* Mobile Footer Status */}
      <div className="px-6 py-4 border-t border-slate-900 bg-slate-900/40 text-center text-xs font-mono text-slate-500">
        {t.appTitle} &bull; {t.liveStatus}
      </div>
    </div>
  );
};

