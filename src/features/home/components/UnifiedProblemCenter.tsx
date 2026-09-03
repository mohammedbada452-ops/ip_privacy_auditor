import React, { useState, useMemo } from 'react';
import {
  AlertOctagon,
  ChevronDown,
  ChevronUp,
  Shield,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { Link } from '../../../router/Router';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { UnifiedRiskItem, RiskSeverity } from '../types';

interface UnifiedProblemCenterProps {
  risks: UnifiedRiskItem[];
  activeSeverityFilter: RiskSeverity | null;
  onSeverityFilterChange: (severity: RiskSeverity | null) => void;
}

export const UnifiedProblemCenter: React.FC<UnifiedProblemCenterProps> = ({
  risks,
  activeSeverityFilter,
  onSeverityFilterChange,
}) => {
  const { t } = useLanguage();
  const [selectedSource, setSelectedSource] = useState<'all' | 'browser' | 'network' | 'headers'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedRiskId, setExpandedRiskId] = useState<string | null>(null);

  const toggleRisk = (id: string) => {
    setExpandedRiskId((prev) => (prev === id ? null : id));
  };

  const filteredRisks = useMemo(() => {
    return risks.filter((item) => {
      if (activeSeverityFilter && item.severity !== activeSeverityFilter) {
        return false;
      }
      if (selectedSource !== 'all' && item.source !== selectedSource) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesImpact = item.impact.toLowerCase().includes(q);
        const matchesEvidence = item.evidence.toLowerCase().includes(q);
        if (!matchesTitle && !matchesImpact && !matchesEvidence) {
          return false;
        }
      }
      return true;
    });
  }, [risks, activeSeverityFilter, selectedSource, searchQuery]);

  const getSeverityBadge = (severity: RiskSeverity) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase tracking-wider">
            {t.home.unifiedRisks.criticalLabel}
          </span>
        );
      case 'high':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
            {t.home.unifiedRisks.highLabel}
          </span>
        );
      case 'medium':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 uppercase tracking-wider">
            {t.home.unifiedRisks.mediumLabel}
          </span>
        );
      case 'low':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase tracking-wider">
            {t.home.unifiedRisks.lowLabel}
          </span>
        );
    }
  };

  const getSourceBadge = (source: UnifiedRiskItem['source']) => {
    switch (source) {
      case 'browser':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20">
            {t.home.unifiedRisks.sourceBrowser}
          </span>
        );
      case 'network':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-sky-500/10 text-sky-300 border border-sky-500/20">
            {t.home.unifiedRisks.sourceNetwork}
          </span>
        );
      case 'headers':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            {t.home.unifiedRisks.sourceHeaders}
          </span>
        );
    }
  };

  return (
    <div
      id="problem-center-section"
      className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-xl space-y-6 scroll-mt-24"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <AlertOctagon className="w-5 h-5" />
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

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">
            {filteredRisks.length} / {risks.length} {t.home.unifiedRisks.totalRisks.replace('{count}', '')}
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {/* Source Pills */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-slate-950/80 border border-slate-800">
          <button
            type="button"
            onClick={() => setSelectedSource('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedSource === 'all'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.home.unifiedRisks.filterAll}
          </button>
          <button
            type="button"
            onClick={() => setSelectedSource('browser')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedSource === 'browser'
                ? 'bg-purple-600/40 text-purple-200 border border-purple-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.home.unifiedRisks.sourceBrowser}
          </button>
          <button
            type="button"
            onClick={() => setSelectedSource('network')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedSource === 'network'
                ? 'bg-sky-600/40 text-sky-200 border border-sky-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.home.unifiedRisks.sourceNetwork}
          </button>
          <button
            type="button"
            onClick={() => setSelectedSource('headers')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedSource === 'headers'
                ? 'bg-indigo-600/40 text-indigo-200 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.home.unifiedRisks.sourceHeaders}
          </button>
        </div>

        {/* Severity Filter Reset if active */}
        {activeSeverityFilter && (
          <button
            type="button"
            onClick={() => onSeverityFilterChange(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{t.ui.clearSeverity.replace('{severity}', String(activeSeverityFilter))}</span>
          </button>
        )}

        {/* Search input */}
        <div className="w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.home.unifiedRisks.searchPlaceholder}
            className="w-full px-3.5 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
          />
        </div>
      </div>

      {/* Risks Accordion List */}
      <div className="space-y-3">
        {filteredRisks.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
            <Shield className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
            <p className="text-sm font-semibold text-slate-300">
              {t.home.unifiedRisks.noRisksTitle}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {t.home.unifiedRisks.noRisksSubtitle}
            </p>
          </div>
        ) : (
          filteredRisks.map((risk) => {
            const isExpanded = expandedRiskId === risk.id;

            return (
              <div
                key={risk.id}
                data-finding-id={risk.id}
                data-single-source-of-truth="true"
                className={`rounded-2xl border transition-all ${
                  isExpanded
                    ? 'bg-slate-950/90 border-slate-700 shadow-lg'
                    : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700/80'
                }`}
              >
                {/* Header item */}
                <button
                  type="button"
                  onClick={() => toggleRisk(risk.id)}
                  aria-expanded={isExpanded}
                  aria-controls={`risk-details-${risk.id}`}
                  className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/70 focus-visible:ring-inset rounded-2xl"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex items-center gap-2 shrink-0">
                      {getSeverityBadge(risk.severity)}
                      {getSourceBadge(risk.source)}
                    </div>
                    <h3 className="text-sm font-bold text-slate-200 truncate">
                      {risk.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-mono text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded-lg border border-rose-500/20">
                      -{risk.scoreImpact} pts
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div id={`risk-details-${risk.id}`} className="px-5 pb-5 pt-2 border-t border-slate-800/80 space-y-4 animate-fadeIn">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Evidence */}
                      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          {t.home.unifiedRisks.problemEvidence}
                        </span>
                        <p className="text-xs font-mono text-slate-200 break-all">
                          {risk.evidence}
                        </p>
                      </div>

                      {/* Impact */}
                      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          {t.home.unifiedRisks.problemImpact}
                        </span>
                        <p className="text-xs text-slate-300">
                          {risk.impact}
                        </p>
                      </div>
                    </div>

                    {/* Solution & Remediation */}
                    <div className="p-4 rounded-xl bg-sky-950/20 border border-sky-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-sky-300">
                            {t.home.unifiedRisks.problemSolution}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                            {risk.remediationActor}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300">
                          {risk.solution}
                        </p>
                      </div>

                      {risk.anchorRoute && (
                        <Link
                          to={risk.anchorRoute}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-all shrink-0 self-start sm:self-auto shadow-md"
                        >
                          <span>{t.home.unifiedRisks.viewAllIssues}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
