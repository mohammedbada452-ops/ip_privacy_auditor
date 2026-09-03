import React, { useMemo, useState } from 'react';
import {
  RotateCcw,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
  Sliders,
  ChevronDown,
  Info,
} from 'lucide-react';
import { ScoreGauge } from '../../../components/privacy/ScoreGauge';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { PrivacyScoreAnalysis } from '@packages/api-contract';

interface PrivacyScoreHeroProps {
  analysis: PrivacyScoreAnalysis;
  isScanning: boolean;
  isRechecking: boolean;
  scoreDelta: number | null;
  isPartial: boolean;
  partialReason: string | null;
  totalDurationMs?: number;
  onRecheck: () => void;
}

export const PrivacyScoreHero: React.FC<PrivacyScoreHeroProps> = ({
  analysis,
  isScanning,
  isRechecking,
  scoreDelta,
  isPartial,
  partialReason,
  totalDurationMs,
  onRecheck,
}) => {
  const { t } = useLanguage();

  // Authoritative deduction factors from PrivacyEngine
  // Only the PrivacyEngine's canonical deductions may affect the displayed issue count.
  // Never rebuild deductions from presentation-layer status flags.
  const deductionFactors = analysis.deductions || [];

  // Helper to determine if a factor represents an active, verified positive protection mechanism
  const isPositiveProtection = (f: { id: string; status?: string; detected?: boolean; currentValue?: any; points?: number; available?: boolean; evidenceState?: string }): boolean => {
    if (f.available === false || (f.evidenceState && f.evidenceState !== 'NOT_DETECTED' && f.evidenceState !== 'CONFIRMED')) return false;
    const valStr = typeof f.currentValue === 'string' ? f.currentValue : String(f.currentValue ?? '');
    if (f.id === 'HDR_SEC_GPC_SIGNAL' && valStr.includes('Active')) return true;
    if (f.id === 'HDR_DNT_SIGNAL' && (valStr.includes('DNT: 1') || valStr.includes('Active'))) return true;
    if (f.id === 'FP_WEBRTC_LEAK') {
      const metadata = (f as PrivacyScoreAnalysis['factors'][number] & { metadata?: Record<string, unknown> }).metadata;
      if (metadata?.mdnsProtectionConfirmed === true) return true;
    }
    if (f.id === 'NET_TOR_DETECTED' && f.detected) return true;
    if (f.id === 'NET_VPN_DETECTED' && f.detected) return true;
    if (f.id === 'FP_WEBGL_HARDWARE' && f.status === 'SAFE') return true;
    if (f.id === 'FP_CANVAS_UNIQUE' && f.status === 'SAFE') return true;
    if (f.id === 'HDR_PROXY_FLAGS' && valStr.includes('Protected Infrastructure')) return true;
    return false;
  };

  const protectionFactors = analysis.factors.filter(
    (f) => isPositiveProtection(f) && (f.points === 0 || f.points === undefined) && f.available !== false
  );
  const unavailableFactors = analysis.factors.filter(
    (f) => f.available === false || f.status === 'UNAVAILABLE'
  );

  const getLocalizedTier = (tier: string) => {
    switch (tier) {
      case 'EXCELLENT':
        return t.privacy.tierExcellent;
      case 'GOOD':
        return t.privacy.tierGood;
      case 'MODERATE':
        return t.privacy.tierModerate;
      case 'CRITICAL':
        return t.privacy.tierCritical;
      default:
        return tier;
    }
  };

  const isBusy = isScanning || isRechecking;
  const [showEvidenceDetails, setShowEvidenceDetails] = useState(false);
  const coverage = typeof analysis.verificationCoveragePct === 'number'
    ? Math.max(0, Math.min(100, analysis.verificationCoveragePct))
    : null;
  const weightedCoverage = typeof analysis.evidenceSummary?.weightedCoveragePct === 'number'
    ? Math.max(0, Math.min(100, analysis.evidenceSummary.weightedCoveragePct))
    : coverage;

  const confidence = analysis.overallConfidence || 'UNKNOWN';
  const verificationLabel = analysis.verificationStatus === 'PARTIAL' ? t.ui.evidenceStatusPartial : t.ui.evidenceStatusComplete;
  const evidenceBreakdown = useMemo(() => {
    const factors = analysis.factors || [];
    return {
      confirmed: factors.filter((f) => f.evidenceState === 'CONFIRMED').length,
      notDetected: factors.filter((f) => f.evidenceState === 'NOT_DETECTED').length,
      unknown: factors.filter((f) => f.evidenceState === 'UNKNOWN' || (!f.evidenceState && f.available !== false)).length,
      unavailable: factors.filter((f) => f.evidenceState === 'UNAVAILABLE' || f.available === false || f.status === 'UNAVAILABLE').length,
    };
  }, [analysis.factors]);
  const scoreContext = 'Privacy Score reflects score-eligible evidence only. Evidence coverage shows how much could be measured; confidence reflects certainty in the available measurements.';
  const topDeductions = useMemo(() => {
    return [...deductionFactors]
      .filter((factor) => (factor.scoreImpact ?? factor.points ?? 0) < 0)
      .sort((a, b) => Math.abs(b.scoreImpact ?? b.points ?? 0) - Math.abs(a.scoreImpact ?? a.points ?? 0))
      .slice(0, 3);
  }, [deductionFactors]);

  return (
    <div
      id="privacy-score-hero"
      className="w-full bg-slate-900/70 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden space-y-6"
    >
      {/* Background ambient lighting */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Partial analysis warning */}
      {isPartial && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-start gap-3 text-amber-300 text-xs sm:text-sm">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block uppercase tracking-wide text-amber-200 mb-0.5">
              {t.home.scoreContext.partialAnalysisNotice}
            </span>
            {partialReason && <p className="text-amber-300/90 text-xs font-mono">{partialReason}</p>}
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row items-stretch gap-8 lg:gap-10">
        {/* Left: Score Gauge */}
        <div className="flex w-full lg:basis-[42%] lg:min-w-[280px] flex-col items-center justify-center lg:self-stretch lg:py-2">
          <ScoreGauge
            score={analysis.privacyScore}
            size="xl"
            label={t.privacy.scoreTitle}
            tierLabel={getLocalizedTier(analysis.tier)}
            subtext={t.ui.scoreBasedOnEvidence}
          />

          {/* Real Score Delta Badge */}
          {scoreDelta !== null && (
            <div className="mt-3 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold border transition-all animate-fadeIn">
              {scoreDelta > 0 ? (
                <span className="text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  {t.home.scoreContext.scoreImproved.replace('{delta}', String(scoreDelta))}
                </span>
              ) : scoreDelta < 0 ? (
                <span className="text-rose-400 bg-rose-950/60 border border-rose-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5" />
                  {t.home.scoreContext.scoreDecreased.replace('{delta}', String(Math.abs(scoreDelta)))}
                </span>
              ) : (
                <span className="text-slate-400 bg-slate-800/60 border border-slate-700 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Minus className="w-3.5 h-3.5" />
                  {t.home.scoreContext.scoreUnchanged}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: Summary & Diagnostic Context */}
        <div className="flex-1 min-w-0 w-full lg:basis-[58%] space-y-5 lg:pt-1">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={analysis.verificationStatus === 'PARTIAL' ? 'text-[10px] font-bold tracking-wide uppercase px-2 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300' : 'text-[10px] font-bold tracking-wide uppercase px-2 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'} role="status">
                {verificationLabel}
              </span>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-100 font-sans">
                {t.home.title}
              </h1>
              <span className="text-[10px] font-bold tracking-wide uppercase px-2 py-1 rounded-full border border-sky-500/20 bg-sky-500/10 text-sky-300" role="status">
                {coverage !== null ? `${t.ui.evidenceCoverageShort} ${coverage}%` : t.ui.evidenceNotMeasured} · {t.ui.confidenceLabel.replace('{confidence}', confidence.toLowerCase())}
              </span>
              {totalDurationMs !== undefined && totalDurationMs > 0 && (
                <span className="text-[11px] font-mono text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2.5 py-0.5 rounded-full">
                  {totalDurationMs}ms latency
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              {analysis.summary || t.home.subtitle}
            </p>
            {analysis.scoreDisclaimer && (
              <p className="mt-2 text-[11px] text-amber-300/90" role="note">{analysis.scoreDisclaimer}</p>
            )}
            <p className="mt-2 text-[11px] text-slate-500 leading-relaxed" role="note">{scoreContext}</p>
            {unavailableFactors.length > 0 && (
              <div className="mt-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800" role="note">
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">{t.ui.knownLimitations}</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {unavailableFactors.slice(0, 4).map((f) => f.name).join(' · ')}
                  {unavailableFactors.length > 4 ? ` · +${unavailableFactors.length - 4} more` : ''}
                </p>
              </div>
            )}
          </div>

          {/* Evidence / score context: explain the result without implying that protections add points. */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 space-y-3" aria-label={t.ui.scoreEvidenceCoverage}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Info className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-200">{t.ui.evidenceCoverageShort}</span>
              </div>
              <span className="text-xs font-mono font-bold text-sky-300 shrink-0">
                {weightedCoverage !== null ? `${weightedCoverage}%` : t.ui.notMeasured}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={coverage ?? 0} aria-label={t.ui.evidenceCoverageShort}>
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 transition-[width] duration-500"
                style={{ width: `${weightedCoverage ?? 0}%` }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-500">
              <span>{t.home.scoreContext.issuesCount.replace('{count}', String(deductionFactors.length))}</span>
              <span>{t.home.scoreContext.protectionsCount.replace('{count}', String(protectionFactors.length))}</span>
              <span>{t.home.scoreContext.unavailableCount.replace('{count}', String(unavailableFactors.length))}</span>
              {analysis.evidenceSummary?.excludedUnsupported ? (
                <span>{t.ui.unsupported}: {analysis.evidenceSummary.excludedUnsupported}</span>
              ) : null}
              <button
                type="button"
                onClick={() => setShowEvidenceDetails((value) => !value)}
                aria-expanded={showEvidenceDetails}
                aria-controls="score-evidence-breakdown"
                className="font-semibold text-sky-300 hover:text-sky-200 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 rounded px-1"
              >
                {showEvidenceDetails ? 'Hide evidence details' : 'Why is coverage incomplete?'}
              </button>
            </div>
            {showEvidenceDetails && (
              <div id="score-evidence-breakdown" className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1" role="region" aria-label={t.ui.evidenceBreakdown}>
                <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wide text-emerald-300">{t.ui.confirmed}</div>
                  <div className="text-sm font-mono font-bold text-emerald-200">{evidenceBreakdown.confirmed}</div>
                </div>
                <div className="rounded-lg border border-sky-500/15 bg-sky-500/5 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wide text-sky-300">{t.common.notDetected}</div>
                  <div className="text-sm font-mono font-bold text-sky-200">{evidenceBreakdown.notDetected}</div>
                </div>
                <div className="rounded-lg border border-violet-500/15 bg-violet-500/5 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wide text-violet-300">{t.common.signalState.reviewNeeded}</div>
                  <div className="text-sm font-mono font-bold text-violet-200">{evidenceBreakdown.unknown}</div>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wide text-slate-400">{t.ui.unavailable}</div>
                  <div className="text-sm font-mono font-bold text-slate-200">{evidenceBreakdown.unavailable}</div>
                </div>
              </div>
            )}
          </div>

          {/* Score explainability: surface the most important deductions before deeper details. */}
          {topDeductions.length > 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 space-y-3" aria-labelledby="score-top-factors-heading">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 id="score-top-factors-heading" className="text-xs font-semibold text-slate-200">{t.ui.whyScoreNotHigher}</h2>
                  <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">{t.ui.topScoreDeductions}</p>
                </div>
                <span className="shrink-0 text-[10px] font-mono font-semibold uppercase tracking-wide text-amber-300">{topDeductions.length} factor{topDeductions.length === 1 ? '' : 's'}</span>
              </div>
              <div className="grid gap-2">
                {topDeductions.map((factor) => {
                  const deduction = Math.abs(factor.scoreImpact ?? factor.points ?? 0);
                  return (
                    <div key={`top-${factor.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800/90 bg-slate-900/60 px-3 py-2.5">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-200 break-words">{factor.name}</div>
                        <div className="mt-0.5 text-[10px] text-slate-500">{factor.evidenceState === 'CONFIRMED' ? t.ui.confirmedEvidence : t.ui.scoreEligibleFinding}</div>
                      </div>
                      <span className="shrink-0 text-sm font-mono font-bold text-rose-400">−{deduction} {t.privacy.pointsDeduction}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3 Metric Context Counters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a
              href="#problem-center-section"
              onClick={(event) => {
                event.preventDefault();
                document.getElementById('problem-center-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="group text-left p-3.5 rounded-xl bg-slate-950/60 border border-rose-500/20 flex items-center gap-3 cursor-pointer hover:border-rose-400/40 hover:bg-rose-950/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/60"
              aria-label={t.home.scoreContext.issuesCount.replace('{count}', String(deductionFactors.length))}
            >
              <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
              </div>
              <div className="min-w-0">
                <span className="text-lg font-bold font-mono text-rose-400 block leading-tight">
                  {deductionFactors.length}
                </span>
                <span className="text-[11px] text-slate-400 group-hover:text-slate-200 transition-colors">
                  {t.home.scoreContext.issuesCount.replace('{count}', String(deductionFactors.length))}
                </span>
              </div>
            </a>

            <a
              href="#active-protections-section"
              onClick={(event) => {
                event.preventDefault();
                document.getElementById('active-protections-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="group text-left p-3.5 rounded-xl bg-slate-950/60 border border-emerald-500/20 flex items-center gap-3 cursor-pointer hover:border-emerald-400/40 hover:bg-emerald-950/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
              aria-label={t.home.scoreContext.protectionsCount.replace('{count}', String(protectionFactors.length))}
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <span className="text-lg font-bold font-mono text-emerald-400 block leading-tight">
                  {protectionFactors.length}
                </span>
                <span className="text-[11px] text-slate-400 group-hover:text-slate-200 transition-colors">
                  {t.home.scoreContext.protectionsCount.replace('{count}', String(protectionFactors.length))}
                </span>
              </div>
            </a>

            <a
              href="#score-evidence-breakdown"
              onClick={(event) => {
                event.preventDefault();
                setShowEvidenceDetails(true);
                window.setTimeout(() => {
                  document.getElementById('score-evidence-breakdown')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 0);
              }}
              className="group text-left p-3.5 rounded-xl bg-slate-950/60 border border-slate-700/40 flex items-center gap-3 cursor-pointer hover:border-slate-500 hover:bg-slate-900/70 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/60"
              aria-label={t.home.scoreContext.unavailableCount.replace('{count}', String(unavailableFactors.length))}
            >
              <div className="w-9 h-9 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-slate-400" />
              </div>
              <div className="min-w-0">
                <span className="text-lg font-bold font-mono text-slate-300 block leading-tight">
                  {unavailableFactors.length}
                </span>
                <span className="text-[11px] text-slate-400 group-hover:text-slate-200 transition-colors">
                  {t.home.scoreContext.unavailableCount.replace('{count}', String(unavailableFactors.length))}
                </span>
              </div>
            </a>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              id="run-complete-privacy-audit-button"
              type="button"
              onClick={onRecheck}
              disabled={isBusy}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 hover:from-sky-500 hover:via-indigo-500 hover:to-purple-500 text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-950/50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            >
              <RotateCcw className={`w-4 h-4 ${isBusy ? 'animate-spin' : ''}`} />
              <span>
                {isBusy
                  ? t.home.completeAudit.auditing
                  : t.home.completeAudit.reRunAuditButton}
              </span>
            </button>

            <a
              id="hero-jump-to-remediation-button"
              href="#remediation-center-section"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-semibold border border-slate-700 transition-all cursor-pointer shadow-md"
            >
              <Sliders className="w-4 h-4 text-blue-400" />
              <span>{t.home.remediationCenter.fixMyPrivacy}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
