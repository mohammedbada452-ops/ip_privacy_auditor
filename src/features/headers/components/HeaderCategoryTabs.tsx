import React from 'react';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { HeaderCategoryFilter, HeaderSummaryStats } from '../types';

export interface HeaderCategoryTabsProps {
  selectedCategory: HeaderCategoryFilter;
  onSelectCategory: (category: HeaderCategoryFilter) => void;
  summary: HeaderSummaryStats;
}

export const HeaderCategoryTabs: React.FC<HeaderCategoryTabsProps> = ({
  selectedCategory,
  onSelectCategory,
  summary,
}) => {
  const { t, formatNumber } = useLanguage();

  const categoryCounts = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of summary.categoryCounts) {
      map[item.category] = item.count;
    }
    return map;
  }, [summary.categoryCounts]);

  const tabs: Array<{ id: HeaderCategoryFilter; label: string; count: number }> = [
    {
      id: 'ALL',
      label: t.headers.tabAll,
      count: summary.totalReceived,
    },
    {
      id: 'PRIVACY_TRACKING',
      label: t.headers.tabPrivacyTracking,
      count: categoryCounts['PRIVACY_TRACKING'] || 0,
    },
    {
      id: 'IDENTITY_CLIENT_HINTS',
      label: t.headers.tabIdentityClientHints,
      count: categoryCounts['IDENTITY_CLIENT_HINTS'] || 0,
    },
    {
      id: 'PROXY_NETWORK',
      label: t.headers.tabProxyNetwork,
      count: categoryCounts['PROXY_NETWORK'] || 0,
    },
    {
      id: 'SECURITY_TRANSPORT',
      label: t.headers.tabSecurityTransport,
      count: categoryCounts['SECURITY_TRANSPORT'] || 0,
    },
    {
      id: 'CONTENT_NEGOTIATION',
      label: t.headers.tabContentNegotiation,
      count: categoryCounts['CONTENT_NEGOTIATION'] || 0,
    },
    {
      id: 'CACHING_STATE',
      label: t.headers.tabCachingState,
      count: categoryCounts['CACHING_STATE'] || 0,
    },
    {
      id: 'CUSTOM_ANOMALY',
      label: t.headers.tabCustomAnomaly,
      count: categoryCounts['CUSTOM_ANOMALY'] || 0,
    },
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto overscroll-x-contain pb-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-950 px-0.5 -mx-0.5 [scrollbar-gutter:stable]" role="tablist" aria-label={t.headers.tableHeaderNameCategory}>
      {tabs.map((tab) => {
        const isActive = selectedCategory === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectCategory(tab.id)}
            role="tab"
            aria-selected={isActive}
            className={`min-h-10 px-3 sm:px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 ${
              isActive
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-950/40'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-slate-800/50'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                isActive ? 'bg-cyan-500/25 text-cyan-200' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {formatNumber(tab.count)}
            </span>
          </button>
        );
      })}
    </div>
  );
};
