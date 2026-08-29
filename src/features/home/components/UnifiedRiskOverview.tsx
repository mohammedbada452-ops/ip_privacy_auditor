import React from 'react';
import { ShieldAlert, AlertTriangle, AlertCircle, Info, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { UnifiedRiskSummary, RiskSeverity } from '../types';

interface UnifiedRiskOverviewProps {
  summary: UnifiedRiskSummary;
  activeFilter: RiskSeverity | null;
  onFilterChange: (filter: RiskSeverity | null) => void;
  onViewAllClick?: () => void;
}

export const UnifiedRiskOverview: React.FC<UnifiedRiskOverviewProps> = ({
  summary,
  activeFilter,
  onFilterChange,
  onViewAllClick,
}) => {
  const { t } = useLanguage();

  return (
    <div
      id="unified-risk-overview"
      className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-xl space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-100">
              {t.home.unifiedRisks.overviewTitle}
            </h2>
            <p className="text-xs text-slate-400">
              {t.home.unifiedRisks.overviewSubtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-mono text-slate-400">
            {t.home.unifiedRisks.totalRisks.replace('{count}', String(summary.total))}
          </span>
          {onViewAllClick && (
            <button
              type="button"
              onClick={onViewAllClick}
              className="inline-flex items-center gap-1 text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors ml-2 cursor-pointer"
            >
              <span>{t.home.unifiedRisks.viewAllIssues}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 4 Severity Metric Cards with Click-to-Filter */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Critical */}
        <button
          type="button"
          onClick={() => onFilterChange(activeFilter === 'critical' ? null : 'critical')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeFilter === 'critical'
              ? 'bg-rose-500/20 border-rose-500 ring-2 ring-rose-500/30'
              : 'bg-rose-950/20 border-rose-500/30 hover:border-rose-500/60'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-rose-300 uppercase tracking-wider">
              {t.home.unifiedRisks.criticalLabel}
            </span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-400 font-mono">
            {summary.critical}
          </div>
        </button>

        {/* High */}
        <button
          type="button"
          onClick={() => onFilterChange(activeFilter === 'high' ? null : 'high')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeFilter === 'high'
              ? 'bg-amber-500/20 border-amber-500 ring-2 ring-amber-500/30'
              : 'bg-amber-950/20 border-amber-500/30 hover:border-amber-500/60'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
              {t.home.unifiedRisks.highLabel}
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono">
            {summary.high}
          </div>
        </button>

        {/* Medium */}
        <button
          type="button"
          onClick={() => onFilterChange(activeFilter === 'medium' ? null : 'medium')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeFilter === 'medium'
              ? 'bg-yellow-500/20 border-yellow-500 ring-2 ring-yellow-500/30'
              : 'bg-yellow-950/20 border-yellow-500/30 hover:border-yellow-500/60'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-yellow-300 uppercase tracking-wider">
              {t.home.unifiedRisks.mediumLabel}
            </span>
            <AlertCircle className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-yellow-400 font-mono">
            {summary.medium}
          </div>
        </button>

        {/* Low / Info */}
        <button
          type="button"
          onClick={() => onFilterChange(activeFilter === 'low' ? null : 'low')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeFilter === 'low'
              ? 'bg-sky-500/20 border-sky-500 ring-2 ring-sky-500/30'
              : 'bg-sky-950/20 border-sky-500/30 hover:border-sky-500/60'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-sky-300 uppercase tracking-wider">
              {t.home.unifiedRisks.lowLabel}
            </span>
            <Info className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-sky-400 font-mono">
            {summary.low}
          </div>
        </button>
      </div>

      {/* Sources breakdown mini-pills */}
      <div className="flex flex-wrap items-center gap-2 pt-2 text-xs font-mono text-slate-400">
        <span className="text-slate-500">{t.home.unifiedRisks.filterAll}:</span>
        <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800">
          {t.home.unifiedRisks.sourceBrowser}: {summary.bySource.browser}
        </span>
        <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800">
          {t.home.unifiedRisks.sourceNetwork}: {summary.bySource.network}
        </span>
        <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800">
          {t.home.unifiedRisks.sourceHeaders}: {summary.bySource.headers}
        </span>
      </div>
    </div>
  );
};
