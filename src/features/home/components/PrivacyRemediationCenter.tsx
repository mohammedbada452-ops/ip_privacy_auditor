import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Cpu,
  Globe,
  FileCode2,
  Sliders,
  Layers,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Server,
  Monitor,
  Smartphone,
  Lock,
} from 'lucide-react';
import { useLanguage } from '../../../i18n/LanguageContext';
import type {
  RemediationFinding,
  RemediationSummary,
  ConsistencyObservation,
  FindingCategory,
  ResolutionState,
  ResponsibleActor,
  ActionabilityType,
} from '../types';

interface PrivacyRemediationCenterProps {
  findings: RemediationFinding[];
  summary: RemediationSummary;
  consistencyObservations: ConsistencyObservation[];
  currentScore: number;
  previousScore: number | null;
  scoreDelta: number | null;
  isRechecking: boolean;
  onRecheck: () => void;
}

export const PrivacyRemediationCenter: React.FC<PrivacyRemediationCenterProps> = ({
  findings,
  summary,
  consistencyObservations,
  currentScore,
  previousScore,
  scoreDelta,
  isRechecking,
  onRecheck,
}) => {
  const { t, direction } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<FindingCategory | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<ResolutionState | 'ALL'>('ALL');
  const [expandedFindingIds, setExpandedFindingIds] = useState<Record<string, boolean>>(() => {
    // Expand the first finding by default if present
    if (findings.length > 0) {
      return { [findings[0].id]: true };
    }
    return {};
  });
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedFindingIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCopySnippet = (snippet: string, id: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(snippet);
      setCopiedSnippetId(id);
      setTimeout(() => {
        setCopiedSnippetId(null), 2000;
      });
    }
  };

  // Filter findings
  const filteredFindings = findings.filter((f) => {
    const matchesCat = selectedCategory === 'ALL' || f.category === selectedCategory;
    const matchesStatus = selectedStatus === 'ALL' || f.status === selectedStatus;
    return matchesCat && matchesStatus;
  });

  const scoreAffectingCount = findings.filter((f) => f.status !== 'RESOLVED' && f.scoreImpact > 0).length;
  const informationalCount = findings.filter(
    (f) => f.status !== 'RESOLVED' && f.scoreImpact === 0 && !f.isInfrastructure
  ).length;

  const getCategoryIcon = (cat: FindingCategory) => {
    switch (cat) {
      case 'NETWORK':
        return <Globe className="w-4 h-4" />;
      case 'BROWSER':
        return <Cpu className="w-4 h-4" />;
      case 'HEADERS':
        return <FileCode2 className="w-4 h-4" />;
      case 'PRIVACY_CONTROLS':
        return <Lock className="w-4 h-4" />;
    }
  };

  const getActorLabel = (actor: ResponsibleActor) => {
    switch (actor) {
      case 'USER':
        return t.home.remediationCenter.actorUser;
      case 'BROWSER':
        return t.home.remediationCenter.actorBrowser;
      case 'DEVICE':
        return t.home.remediationCenter.actorDevice;
      case 'NETWORK':
        return t.home.remediationCenter.actorNetwork;
      case 'ISP':
        return t.home.remediationCenter.actorIsp;
      case 'WEBSITE':
        return t.home.remediationCenter.actorWebsite;
      case 'SERVER':
        return t.home.remediationCenter.actorServer;
      case 'HOSTING_PROVIDER':
        return t.home.remediationCenter.actorHosting;
      case 'UNAVAILABLE':
        return t.home.remediationCenter.actorUnavailable;
      case 'EDUCATIONAL':
      default:
        return t.home.remediationCenter.actorEducational;
    }
  };

  const getActionabilityLabel = (actionability: ActionabilityType) => {
    switch (actionability) {
      case 'ACTIONABLE_NOW':
        return t.home.remediationCenter.actionableNow;
      case 'ACTIONABLE_BROWSER':
        return t.home.remediationCenter.actionableBrowser;
      case 'ACTIONABLE_DEVICE':
        return t.home.remediationCenter.actionableDevice;
      case 'ACTIONABLE_NETWORK':
        return t.home.remediationCenter.actionableNetwork;
      case 'ACTIONABLE_WEBSITE':
        return t.home.remediationCenter.actionableWebsite;
      case 'ACTIONABLE_HOSTING':
        return t.home.remediationCenter.actionableHosting;
      case 'EDUCATIONAL_ONLY':
        return t.home.remediationCenter.educationalOnly;
      case 'NOT_ACTIONABLE':
        return t.home.remediationCenter.notActionable;
      case 'UNKNOWN':
      default:
        return t.home.remediationCenter.unknownAction;
    }
  };

  const getStatusBadge = (status: ResolutionState) => {
    switch (status) {
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {t.home.remediationCenter.statusResolved}
          </span>
        );
      case 'IMPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            <TrendingUp className="w-3.5 h-3.5" />
            {t.home.remediationCenter.statusImproved}
          </span>
        );
      case 'WORSENED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <TrendingDown className="w-3.5 h-3.5" />
            {t.home.remediationCenter.statusWorsened}
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            {t.home.remediationCenter.statusInProgress}
          </span>
        );
      case 'UNAVAILABLE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20">
            <Info className="w-3.5 h-3.5" />
            {t.home.remediationCenter.statusUnavailable}
          </span>
        );
      case 'UNCHANGED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5" />
            {t.home.remediationCenter.statusUnchanged}
          </span>
        );
      case 'OPEN':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5" />
            {t.home.remediationCenter.statusOpen}
          </span>
        );
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'critical':
        return (
          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
            {t.common.critical}
          </span>
        );
      case 'high':
        return (
          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
            {t.common.high}
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            {t.common.medium}
          </span>
        );
      case 'low':
      default:
        return (
          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
            {t.common.low}
          </span>
        );
    }
  };

  return (
    <section
      id="remediation-center-section"
      className="space-y-6 scroll-mt-24"
      aria-label={t.ui.remediationCenter}
    >
      {/* Header Banner */}
      <div
        id="remediation-header-banner"
        className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Sliders className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                {t.home.remediationCenter.title}
              </h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
              {t.home.remediationCenter.subtitle}
            </p>
          </div>

          <button
            id="recheck-all-remediation-button"
            onClick={onRecheck}
            disabled={isRechecking}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRechecking ? 'animate-spin' : ''}`} />
            <span>
              {isRechecking
                ? t.home.remediationCenter.rechecking
                : t.home.remediationCenter.recheckAction}
            </span>
          </button>
        </div>

        {/* Summary Metric Counters */}
        <div
          id="remediation-metrics-summary"
          className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-3 pt-6 border-t border-slate-100 dark:border-slate-800"
        >
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t.home.remediationCenter.totalFindings}
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {summary.total}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30">
            <div className="text-xs font-medium text-amber-700 dark:text-amber-400">
              {t.home.remediationCenter.scoreAffectingCount}
            </div>
            <div className="text-2xl font-bold text-amber-900 dark:text-amber-300 mt-1">
              {scoreAffectingCount}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t.home.remediationCenter.informationalCount}
            </div>
            <div className="text-2xl font-bold text-slate-700 dark:text-slate-300 mt-1">
              {informationalCount}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t.home.remediationCenter.infraControlledCount}
            </div>
            <div className="text-2xl font-bold text-slate-700 dark:text-slate-300 mt-1">
              {summary.infrastructureControlled}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/30">
            <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              {t.home.remediationCenter.statusResolved}
            </div>
            <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-300 mt-1">
              {summary.resolvedCount}
            </div>
          </div>
        </div>
      </div>

      {/* Before / After Comparison Card (if previous score exists) */}
      {previousScore !== null && scoreDelta !== null && (
        <div
          id="remediation-before-after-card"
          className="p-5 rounded-2xl bg-gradient-to-r from-blue-50/80 to-slate-50 dark:from-slate-800/80 dark:to-slate-900 border border-blue-100 dark:border-blue-900/40 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-wider uppercase text-blue-700 dark:text-blue-300">
                  {t.home.remediationCenter.beforeAfterTitle}
                </span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {scoreDelta > 0
                  ? `Your privacy score improved by +${scoreDelta} points after recent configuration changes.`
                  : scoreDelta < 0
                    ? `Score decreased by ${scoreDelta} points due to newly exposed signals.`
                    : `Score unchanged (${currentScore}/100). Review remaining actionable findings.`}
              </p>
            </div>

            <div className="flex items-center gap-4 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div className="text-center">
                <div className="text-[10px] font-medium text-slate-400">
                  {t.home.remediationCenter.beforeScore}
                </div>
                <div className="text-lg font-bold text-slate-600 dark:text-slate-300">
                  {previousScore}
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 rtl:rotate-180" />
              <div className="text-center">
                <div className="text-[10px] font-medium text-blue-600 dark:text-blue-400 font-bold">
                  {t.home.remediationCenter.afterScore}
                </div>
                <div className="text-xl font-extrabold text-blue-600 dark:text-blue-400">
                  {currentScore}
                </div>
              </div>
              <div
                className={`px-2 py-1 rounded-lg text-xs font-bold ${
                  scoreDelta > 0
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : scoreDelta < 0
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      : 'bg-slate-500/10 text-slate-600 dark:text-slate-400'
                }`}
              >
                {scoreDelta > 0 ? `+${scoreDelta}` : `${scoreDelta}`} pts
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Tabs & Filter Controls */}
      <div
        id="remediation-category-tabs"
        className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3"
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            id="tab-all-findings"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {t.home.remediationCenter.tabAll} ({findings.length})
          </button>

          <button
            id="tab-network-findings"
            onClick={() => setSelectedCategory('NETWORK')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              selectedCategory === 'NETWORK'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            {t.home.remediationCenter.tabNetwork} ({summary.byCategory.network})
          </button>

          <button
            id="tab-browser-findings"
            onClick={() => setSelectedCategory('BROWSER')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              selectedCategory === 'BROWSER'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            {t.home.remediationCenter.tabBrowser} ({summary.byCategory.browser})
          </button>

          <button
            id="tab-headers-findings"
            onClick={() => setSelectedCategory('HEADERS')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              selectedCategory === 'HEADERS'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            {t.home.remediationCenter.tabHeaders} ({summary.byCategory.headers})
          </button>

          <button
            id="tab-privacy-controls-findings"
            onClick={() => setSelectedCategory('PRIVACY_CONTROLS')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              selectedCategory === 'PRIVACY_CONTROLS'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            {t.home.remediationCenter.tabPrivacyControls} ({summary.byCategory.privacyControls})
          </button>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="remediation-status-select" className="text-xs text-slate-500 font-medium">
            {t.common.status}:
          </label>
          <select
            id="remediation-status-select"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as ResolutionState | 'ALL')}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">{t.common.all}</option>
            <option value="OPEN">{t.home.remediationCenter.statusOpen}</option>
            <option value="RESOLVED">{t.home.remediationCenter.statusResolved}</option>
            <option value="IMPROVED">{t.home.remediationCenter.statusImproved}</option>
            <option value="UNCHANGED">{t.home.remediationCenter.statusUnchanged}</option>
          </select>
        </div>
      </div>

      {/* Findings List */}
      {filteredFindings.length === 0 ? (
        <div
          id="remediation-empty-state"
          className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-2"
        >
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {t.home.remediationCenter.noIssuesTitle}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {t.home.remediationCenter.noIssuesDesc}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFindings.map((finding) => {
            const isExpanded = !!expandedFindingIds[finding.id];
            return (
              <div
                key={finding.id}
                id={`finding-card-${finding.id}`}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-all"
              >
                {/* Finding Header Card */}
                <div
                  onClick={() => toggleExpand(finding.id)}
                  className="p-5 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {getCategoryIcon(finding.category)}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {finding.title}
                      </h3>
                      {getSeverityBadge(finding.severity)}
                      {getStatusBadge(finding.status)}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {t.home.remediationCenter.actorLabel}:
                        </span>{' '}
                        {getActorLabel(finding.responsibleActor)}
                      </span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {t.home.remediationCenter.actionabilityLabel}:
                        </span>{' '}
                        {getActionabilityLabel(finding.actionability)}
                      </span>
                      {finding.platformAwareTag && (
                        <>
                          <span>•</span>
                          <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium">
                            {finding.platformAwareTag}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                    <div className="text-right">
                      {finding.scoreImpact > 0 ? (
                        <div className="text-sm font-bold text-rose-600 dark:text-rose-400">
                          -{finding.scoreImpact} pts deduction
                        </div>
                      ) : (
                        <div className="text-sm font-bold text-slate-500 dark:text-slate-400">
                          0 pts (Informational)
                        </div>
                      )}
                      {finding.potentialRecoveryPts > 0 && (
                        <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          +{finding.potentialRecoveryPts} pts recovery
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      aria-label={t.ui.toggleFindingDetails}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Details Body */}
                {isExpanded && (
                  <div
                    id={`finding-details-${finding.id}`}
                    className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 space-y-5"
                  >
                    {/* Evidence & Technical Impact */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                          {t.home.unifiedRisks.problemEvidence}
                        </div>
                        <div className="text-xs font-mono text-slate-800 dark:text-slate-200 break-words dir-ltr text-left">
                          {finding.evidence}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                          {t.home.unifiedRisks.problemImpact}
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                          {finding.impactExplanation}
                        </p>
                      </div>
                    </div>

                    {/* Multi-Factor grouping indicator if applicable */}
                    {finding.isMultiFactor && (
                      <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/30 flex items-start gap-2.5">
                        <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <div className="text-xs font-bold text-blue-900 dark:text-blue-300">
                            {t.home.remediationCenter.multiFactorTitle}
                          </div>
                          <div className="text-xs text-blue-700 dark:text-blue-400">
                            {t.home.remediationCenter.affectedSignals}:{' '}
                            <span className="font-mono">{finding.affectedFactorIds.join(', ')}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step-by-Step Remediation Instructions */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          {t.home.recommendations.actionSteps}
                        </h4>
                        <span className="text-xs text-slate-500">
                          {t.home.remediationCenter.remediationConfidenceLabel}:{' '}
                          <strong className="text-slate-700 dark:text-slate-300">
                            {finding.remediationConfidence}
                          </strong>
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {finding.steps.map((step) => {
                          const snippetKey = `${finding.id}-step-${step.stepNumber}`;
                          const isCopied = copiedSnippetId === snippetKey;
                          return (
                            <div
                              key={step.stepNumber}
                              className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-start gap-3"
                            >
                              <div className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                {step.stepNumber}
                              </div>

                              <div className="space-y-1.5 flex-1 min-w-0">
                                <div className="text-xs font-bold text-slate-900 dark:text-white">
                                  {step.title}
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                  {step.instruction}
                                </p>

                                {step.codeSnippet && (
                                  <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-900 text-slate-100 text-xs font-mono mt-2 dir-ltr text-left">
                                    <span className="truncate">{step.codeSnippet}</span>
                                    <button
                                      onClick={() => handleCopySnippet(step.codeSnippet!, snippetKey)}
                                      className="p-1 rounded hover:bg-slate-800 text-slate-300 transition-colors shrink-0"
                                      title={t.home.remediationCenter.copySnippet}
                                    >
                                      {isCopied ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Expected Outcome */}
                    <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                          {t.home.remediationCenter.expectedOutcomeLabel}
                        </div>
                        <p className="text-xs text-emerald-800 dark:text-emerald-400">
                          {finding.expectedOutcome}
                        </p>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      {finding.anchorRoute ? (
                        <a
                          href={finding.anchorRoute}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          <span>{finding.deepDiveLabel || t.home.remediationCenter.deepDive}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <div />
                      )}

                      <button
                        onClick={onRecheck}
                        disabled={isRechecking}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 active:scale-98 transition-all cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRechecking ? 'animate-spin' : ''}`} />
                        <span>
                          {isRechecking
                            ? t.home.remediationCenter.rechecking
                            : t.home.remediationCenter.recheckAction}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Environmental Consistency Observations (Timezone & Language) */}
      {consistencyObservations.length > 0 && (
        <div
          id="remediation-consistency-section"
          className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
        >
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {t.home.remediationCenter.consistencyTitle}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cross-evaluates network geolocation against browser system locale and timezone.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {consistencyObservations.map((obs) => (
              <div
                key={obs.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {obs.type === 'TIMEZONE'
                      ? t.home.remediationCenter.timezoneConsistency
                      : t.home.remediationCenter.languageConsistency}
                  </span>
                  {obs.status === 'MATCH' ? (
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {t.home.remediationCenter.match}
                    </span>
                  ) : obs.status === 'MISMATCH' ? (
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      {t.home.remediationCenter.mismatch}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-500/10 text-slate-500 border border-slate-500/20">
                      {t.home.remediationCenter.statusUnavailable}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                    <div className="text-[10px] text-slate-400 font-medium">{t.ui.networkSignal}</div>
                    <div className="font-mono text-slate-800 dark:text-slate-200 truncate mt-0.5">
                      {obs.networkValue}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                    <div className="text-[10px] text-slate-400 font-medium">{t.ui.browserSignal}</div>
                    <div className="font-mono text-slate-800 dark:text-slate-200 truncate mt-0.5">
                      {obs.browserValue}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {obs.explanation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
