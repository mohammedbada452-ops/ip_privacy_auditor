import React from 'react';
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
    if (f.id === 'FP_WEBRTC_LEAK' && (f.evidenceState === 'NOT_DETECTED' || valStr === 'No address candidates exposed')) return true;
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

      <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
        {/* Left: Score Gauge */}
        <div className="flex flex-col items-center justify-center shrink-0">
          <ScoreGauge
            score={analysis.privacyScore}
            size="lg"
            label={t.privacy.scoreTitle}
            tierLabel={getLocalizedTier(analysis.tier)}
            subtext={`Verified privacy score. Evidence coverage: ${analysis.verificationCoveragePct != null ? `${analysis.verificationCoveragePct}%` : t.ui.notMeasured}. Confidence: ${analysis.overallConfidence ?? t.ui.notMeasured}.`}
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
        <div className="flex-1 max-w-2xl w-full space-y-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={analysis.verificationStatus === 'PARTIAL' ? 'text-[10px] font-bold tracking-wide uppercase px-2 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300' : 'text-[10px] font-bold tracking-wide uppercase px-2 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'} role="status">
                {analysis.verificationStatus === 'PARTIAL' ? 'Verification incomplete' : 'Verification complete'}
              </span>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-100 font-sans">
                {t.home.title}
              </h1>
              {analysis.verificationCoveragePct !== undefined && (
                <span className="text-[10px] font-bold tracking-wide uppercase px-2 py-1 rounded-full border border-sky-500/20 bg-sky-500/10 text-sky-300" role="status">
                  Evidence coverage {analysis.verificationCoveragePct}% · {analysis.overallConfidence || 'MEDIUM'} confidence
                </span>
              )}
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

          {/* 3 Metric Context Counters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-rose-500/20 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
              </div>
              <div>
                <span className="text-lg font-bold font-mono text-rose-400 block leading-tight">
                  {deductionFactors.length}
                </span>
                <span className="text-[11px] text-slate-400">
                  {t.home.scoreContext.issuesCount.replace('{count}', String(deductionFactors.length))}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-emerald-500/20 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <span className="text-lg font-bold font-mono text-emerald-400 block leading-tight">
                  {protectionFactors.length}
                </span>
                <span className="text-[11px] text-slate-400">
                  {t.home.scoreContext.protectionsCount.replace('{count}', String(protectionFactors.length))}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-700/40 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-slate-400" />
              </div>
              <div>
                <span className="text-lg font-bold font-mono text-slate-300 block leading-tight">
                  {unavailableFactors.length}
                </span>
                <span className="text-[11px] text-slate-400">
                  {t.home.scoreContext.unavailableCount.replace('{count}', String(unavailableFactors.length))}
                </span>
              </div>
            </div>
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
