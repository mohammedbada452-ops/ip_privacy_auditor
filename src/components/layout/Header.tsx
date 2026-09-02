import React from 'react';
import { Link, useRouter } from '../../router/Router';
import { PRIMARY_NAV_ROUTES, isRouteActive, getRouteTitle } from '../../lib/navigation/routes';
import { useLanguage } from '../../i18n/LanguageContext';
import { useUnifiedScan } from '../../context/UnifiedScanContext';
import { LanguageSelector } from '../i18n/LanguageSelector';
import { Shield, Menu, Sparkles } from 'lucide-react';

export interface HeaderProps {
  onOpenMobileNav: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileNav }) => {
  const { currentPath } = useRouter();
  const { t, language } = useLanguage();
  const { currentSnapshot } = useUnifiedScan();
  const headerIp = currentSnapshot?.network?.ipCheck?.ip || null;

  return (
    <header className="bg-slate-900/90 border-b border-slate-800/80 sticky top-0 z-40 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Logo Area */}
        <Link
          to="/"
          className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded-lg p-1"
        >
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500/20 group-hover:border-cyan-500/50 transition-all">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-slate-100 tracking-tight leading-snug">
              {t.appTitle}
            </h1>
            <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">
              {t.appSubtitle}
            </p>
          </div>
        </Link>

        {/* Desktop Primary Navigation */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800/60">
          {PRIMARY_NAV_ROUTES.map((route) => {
            const isActive = isRouteActive(currentPath, route.path);
            const label = getRouteTitle(route, language);

            return (
              <Link
                key={route.path}
                to={route.path}
                className={`px-3.5 py-2 min-h-10 rounded-lg text-sm font-sans font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Header Actions (Right Area) */}
        <div className="flex items-center gap-2.5">
          {/* Live System Status Pill */}
          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 min-h-8 rounded-full bg-slate-950/80 border border-slate-800/80 text-xs font-mono text-slate-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] text-slate-300 font-medium">
              {headerIp ? headerIp : t.online}
            </span>
          </div>

          <div className="hidden xl:inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-400/80">
            <Sparkles className="w-3 h-3" />
            <span>{language === 'ar' ? 'نتائج مدعومة بالأدلة' : language === 'es' ? 'Resultados con evidencia' : language === 'fr' ? 'Résultats fondés sur les preuves' : language === 'pt' ? 'Resultados baseados em evidências' : language === 'tr' ? 'Kanıt odaklı sonuçlar' : 'Evidence-first results'}</span>
          </div>

          {/* Language Selector */}
          <LanguageSelector compact />

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={onOpenMobileNav}
            aria-label={t.menuOpen}
            className="md:hidden min-w-11 min-h-11 p-2.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 border border-slate-800"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};


