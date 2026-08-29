import React, { useState } from 'react';
import {
  Layers,
  FileText,
  RefreshCw,
  Lock,
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Minus,
  X,
} from 'lucide-react';
import { Card, CardBody, Button, Badge } from '../../../components/ui';
import { useLanguage } from '../../../i18n/LanguageContext';
import type {
  HeaderSummaryStats,
  HeaderScoreFactor,
  HeaderPrivacyTier,
  HeaderCategoryFilter,
  HeadersAnalysisResponse,
} from '../types';

export interface HeaderOverviewCardProps {
  summary: HeaderSummaryStats;
  privacyScore?: number;
  headerSecurityScore?: number;
  privacyTier: HeaderPrivacyTier;
  scoreFactors: HeaderScoreFactor[];
  previousData?: HeadersAnalysisResponse | null;
  scoreDelta?: number | null;
  onDismissComparison?: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenExport: () => void;
  onSelectCategory?: (category: HeaderCategoryFilter) => void;
}

export const HeaderOverviewCard: React.FC<HeaderOverviewCardProps> = ({
  summary,
  privacyScore,
  headerSecurityScore,
  privacyTier,
  scoreFactors = [],
  previousData,
  scoreDelta,
  onDismissComparison,
  onRefresh,
  isRefreshing,
  onOpenExport,
  onSelectCategory,
}) => {
  const { t, formatNumber } = useLanguage();
  const [showFactors, setShowFactors] = useState(false);
  const hasPrivacyScore = typeof privacyScore === 'number' && Number.isFinite(privacyScore);
  const hasHeaderSecurityScore = typeof headerSecurityScore === 'number' && Number.isFinite(headerSecurityScore);
  const effectiveTier: HeaderPrivacyTier = privacyTier ?? 'CRITICAL';

  const getTierDetails = (tier: HeaderPrivacyTier) => {
    switch (tier) {
      case 'EXCELLENT':
        return {
          label: t.privacy.tierExcellent,
          badgeVariant: 'success' as const,
          colorClass: 'text-emerald-400',
          bgClass: 'bg-emerald-500',
          borderClass: 'border-emerald-500/30',
        };
      case 'GOOD':
        return {
          label: t.privacy.tierGood,
          badgeVariant: 'info' as const,
          colorClass: 'text-cyan-400',
          bgClass: 'bg-cyan-500',
          borderClass: 'border-cyan-500/30',
        };
      case 'MODERATE':
        return {
          label: t.privacy.tierModerate,
          badgeVariant: 'warning' as const,
          colorClass: 'text-amber-400',
          bgClass: 'bg-amber-500',
          borderClass: 'border-amber-500/30',
        };
      case 'CRITICAL':
      default:
        return {
          label: t.privacy.tierCritical,
          badgeVariant: 'danger' as const,
          colorClass: 'text-rose-400',
          bgClass: 'bg-rose-500',
          borderClass: 'border-rose-500/30',
        };
    }
  };

  const tierInfo = getTierDetails(effectiveTier);

  const scrollToSection = (sectionId: string, categoryFilter?: HeaderCategoryFilter) => {
    if (categoryFilter && onSelectCategory) {
      onSelectCategory(categoryFilter);
    }
    const elem = document.getElementById(sectionId);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="space-y-4">
      {/* Comparison Banner (Before vs After) */}
      {previousData && scoreDelta !== null && scoreDelta !== undefined && (
        <Card variant="standard" className="border-cyan-800/60 bg-cyan-950/20 p-4 animate-fadeIn">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                {scoreDelta > 0 ? (
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                ) : scoreDelta < 0 ? (
                  <TrendingDown className="w-5 h-5 text-rose-400" />
                ) : (
                  <Minus className="w-5 h-5 text-cyan-400" />
                )}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span>{t.headers.recheckComparisonTitle}</span>
                  <span
                    className={`px-2 py-0.5 text-xs font-mono font-bold rounded-full ${
                      scoreDelta > 0
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : scoreDelta < 0
                        ? 'bg-rose-950 text-rose-400 border border-rose-800'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta} {t.privacy.pointsDeduction}
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Previous: <span className="font-mono text-slate-300 font-semibold">{previousData.headerPrivacyExposureScore}/100</span> ({previousData.privacyTier}) → Current: <span className="font-mono text-cyan-300 font-semibold">{hasPrivacyScore ? `${privacyScore}/100` : t.ui.notMeasured}</span> ({effectiveTier})
                </p>
              </div>
            </div>

            {onDismissComparison && (
              <button
                type="button"
                onClick={onDismissComparison}
                aria-label={t.browser.dismissComparison || 'Dismiss'}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </Card>
      )}

      {/* Main Overview Card */}
      <Card variant="standard" className="border-slate-800/80 bg-slate-900/60 overflow-hidden shadow-xl">
        {/* Header Banner */}
        <div className="p-6 border-b border-slate-800/80 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-slate-100 tracking-tight">
                  {t.headers.title}
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-mono font-medium rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800/50">
                  RFC 9110
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                {t.headers.subtitle}
              </p>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2.5 self-start lg:self-center shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenExport}
              leftIcon={<FileText className="w-4 h-4" />}
            >
              {t.headers.exportHeaders}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              leftIcon={<RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
            >
              {isRefreshing ? t.common.scanning : t.headers.rescan}
            </Button>
          </div>
        </div>

        {/* Privacy Score & Metrics Section */}
        <CardBody className="p-6 space-y-6">
          {/* Dedicated HTTP Privacy Score Gauge */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              {/* Circular / Block Score Gauge */}
              <div className="relative w-20 h-20 rounded-2xl bg-slate-900 border border-slate-700/80 flex flex-col items-center justify-center shadow-inner shrink-0">
                <span className={`text-2xl font-black font-mono tracking-tighter ${tierInfo.colorClass}`}>
                  {hasPrivacyScore ? formatNumber(privacyScore as number) : t.ui.notMeasured}
                </span>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  / 100
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base font-bold text-slate-100">
                    {t.headers.httpPrivacyScore} <span className="text-[10px] text-slate-500 uppercase tracking-wide">(headers only)</span>
                  </h3>
                  <Badge variant={tierInfo.badgeVariant} size="sm" className="font-semibold">
                    {tierInfo.label}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                  {t.headers.httpPrivacyScoreDesc}
                </p>
                {/* Score Bar */}
                <div className="w-full max-w-md bg-slate-800/80 h-2 rounded-full overflow-hidden mt-2">
                  <div
                    className={`h-full ${tierInfo.bgClass} transition-all duration-500`}
                    style={{ width: `${hasPrivacyScore ? Math.max(5, Math.min(100, privacyScore as number)) : 0}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="min-w-[150px] bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-3 text-center">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">{t.ui.headerSecurity} {t.privacy.scoreTitle}</div>
              <div className="text-2xl font-black font-mono text-emerald-400 mt-1">{hasHeaderSecurityScore ? formatNumber(headerSecurityScore as number) : t.ui.notMeasured}{hasHeaderSecurityScore && <span className="text-xs text-slate-500">/100</span>}</div>
              <div className="text-[10px] text-slate-500 mt-1">{t.ui.securitySignalsOnly}</div>
            </div>

            {/* Score Breakdown Toggle */}
            {scoreFactors && scoreFactors.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFactors(!showFactors)}
                rightIcon={showFactors ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                className="self-start md:self-center shrink-0"
              >
                {t.headers.scoreBreakdownTitle} ({scoreFactors.length})
              </Button>
            )}
          </div>

          {/* Collapsible Score Factors Breakdown */}
          {showFactors && scoreFactors && scoreFactors.length > 0 && (
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-3 animate-fadeIn">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {t.headers.scoreBreakdownTitle}
              </h4>
              <div className="space-y-2">
                {scoreFactors.map((factor, index) => (
                  <div
                    key={`${factor.factor}-${index}`}
                    className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs"
                  >
                    <div className="space-y-0.5">
                      <span className="font-semibold text-slate-200 font-mono">
                        {factor.factor}
                      </span>
                      <p className="text-slate-400 text-[11px]">
                        {factor.description}
                      </p>
                    </div>
                    <span
                      className={`font-mono font-bold px-2 py-0.5 rounded shrink-0 ${
                        factor.points < 0
                          ? 'text-rose-400 bg-rose-950/60 border border-rose-800/40'
                          : 'text-slate-400 bg-slate-900 border border-slate-700'
                      }`}
                    >
                      {factor.points < 0
                        ? `${factor.points} ${t.privacy.pointsDeduction}`
                        : `${factor.points} ${t.privacy.pointsDeduction}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interactive Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* 1. Total Headers */}
            <button
              type="button"
              onClick={() => scrollToSection('headers-table-section', 'ALL')}
              className="bg-slate-950/60 hover:bg-slate-950/90 border border-slate-800/60 hover:border-cyan-500/40 rounded-xl p-4 flex flex-col justify-between text-left transition-all duration-150 group cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider group-hover:text-cyan-300">
                  {t.headers.totalHeaders}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400 transition-colors" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-slate-100 group-hover:text-cyan-200">
                  {formatNumber(summary.totalReceived)}
                </span>
                <span className="text-xs text-slate-500 font-sans">{t.headers.received}</span>
              </div>
            </button>

            {/* 2. Privacy Signals */}
            <button
              type="button"
              onClick={() => scrollToSection('headers-table-section', 'PRIVACY_TRACKING')}
              className="bg-slate-950/60 hover:bg-slate-950/90 border border-slate-800/60 hover:border-cyan-500/40 rounded-xl p-4 flex flex-col justify-between text-left transition-all duration-150 group cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider group-hover:text-cyan-300">
                  {t.headers.privacySignals}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400 transition-colors" />
              </div>
              <div className="mt-2 flex items-center gap-2">
                {summary.hasSecGpc ? (
                  <Badge variant="success" size="sm" className="font-mono">
                    Sec-GPC: 1
                  </Badge>
                ) : summary.hasDnt ? (
                  <Badge variant="info" size="sm" className="font-mono">
                    DNT: 1
                  </Badge>
                ) : (
                  <Badge variant="warning" size="sm">
                    {t.common.inactive}
                  </Badge>
                )}
              </div>
            </button>

            {/* 3. Client Hints */}
            <button
              type="button"
              onClick={() => scrollToSection('client-hints-section')}
              className="bg-slate-950/60 hover:bg-slate-950/90 border border-slate-800/60 hover:border-cyan-500/40 rounded-xl p-4 flex flex-col justify-between text-left transition-all duration-150 group cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider group-hover:text-cyan-300">
                  {t.headers.clientHints}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400 transition-colors" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-cyan-400 group-hover:text-cyan-300">
                  {formatNumber(summary.clientHintsCount)}
                </span>
                <span className="text-xs text-slate-500 font-sans">{t.headers.activeCount}</span>
              </div>
            </button>

            {/* 4. Sensitive Masked */}
            <button
              type="button"
              onClick={() => scrollToSection('cookie-security-section')}
              className="bg-slate-950/60 hover:bg-slate-950/90 border border-slate-800/60 hover:border-emerald-500/40 rounded-xl p-4 flex flex-col justify-between text-left transition-all duration-150 group cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider group-hover:text-emerald-300">
                  {t.headers.redactedData}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-emerald-400 transition-colors" />
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span className="text-2xl font-bold font-mono text-emerald-400">
                  {formatNumber(summary.sensitiveMaskedCount)}
                </span>
                <span className="text-xs text-slate-500">{t.headers.masked}</span>
              </div>
            </button>

            {/* 5. Proxy Headers */}
            <button
              type="button"
              onClick={() => scrollToSection('proxy-analysis-section')}
              className="bg-slate-950/60 hover:bg-slate-950/90 border border-slate-800/60 hover:border-indigo-500/40 rounded-xl p-4 flex flex-col justify-between text-left transition-all duration-150 group cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider group-hover:text-indigo-300">
                  {t.headers.proxyHeaders}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-indigo-400 transition-colors" />
              </div>
              <div className="mt-2">
                {summary.hasProxyHeaders ? (
                  <Badge variant="danger" size="sm" className="font-mono">
                    {formatNumber(summary.proxyHeadersCount)} {t.headers.activeCount}
                  </Badge>
                ) : (
                  <Badge variant="success" size="sm">
                    {t.headers.clean}
                  </Badge>
                )}
              </div>
            </button>

            {/* 6. Exposure Flags */}
            <button
              type="button"
              onClick={() => scrollToSection('problem-center-section')}
              className="bg-slate-950/60 hover:bg-slate-950/90 border border-slate-800/60 hover:border-amber-500/40 rounded-xl p-4 flex flex-col justify-between text-left transition-all duration-150 group cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider group-hover:text-amber-300">
                  {t.headers.exposureFlags}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-amber-400 transition-colors" />
              </div>
              <div className="mt-2">
                {summary.riskFlagsCount > 0 ? (
                  <Badge variant="warning" size="sm">
                    {formatNumber(summary.riskFlagsCount)} {t.headers.observations}
                  </Badge>
                ) : (
                  <Badge variant="success" size="sm">
                    {t.headers.clean}
                  </Badge>
                )}
              </div>
            </button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
