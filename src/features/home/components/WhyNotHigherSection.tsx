import React from 'react';
import { AlertCircle, ArrowUpRight, CheckCircle2, ShieldAlert, ShieldCheck, Scale } from 'lucide-react';
import { SeverityBadge } from '../../../components/status/SeverityBadge';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { PrivacyFactor } from '@packages/api-contract';

interface WhyNotHigherSectionProps {
  factors: PrivacyFactor[];
  onSelectFactorForRemediation: (factor: PrivacyFactor) => void;
  privacyScore?: number;
}

export const WhyNotHigherSection: React.FC<WhyNotHigherSectionProps> = ({
  factors,
  onSelectFactorForRemediation,
  privacyScore,
}) => {
  const { t } = useLanguage();

  // Filter all factors that carry negative point penalties and are actively detected/warning/danger
  const issueFactors = factors
    .filter((f) => f.scored === true && f.evidenceState === 'CONFIRMED' && (f.scoreImpact ?? f.points) < 0)
    .sort((a, b) => Math.abs(b.points) - Math.abs(a.points)); // Highest impact deduction first

  const totalDeductions = issueFactors.reduce((sum, f) => sum + Math.abs(f.scoreImpact ?? f.points), 0);
  const computedScore = privacyScore !== undefined ? privacyScore : Math.max(0, 100 - totalDeductions);

  return (
    <section className="mb-8" aria-labelledby="why-not-higher-heading">
      {/* Header with Title & Dynamic Summary Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 id="why-not-higher-heading" className="text-xl font-bold font-mono text-slate-100 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            {t.home.whyNotHigher.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-sans mt-0.5">
            {t.home.whyNotHigher.subtitle}
          </p>
        </div>

        {issueFactors.length > 0 && (
          <div className="px-3 py-1 rounded-full bg-red-950/40 border border-red-500/30 text-red-400 text-xs font-mono font-semibold self-start sm:self-auto flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{t.home.whyNotHigher.totalDeductions.replace('{points}', String(totalDeductions))}</span>
          </div>
        )}
      </div>

      {/* Dynamic Score Equation Bar when Deductions Exist */}
      {issueFactors.length > 0 && (
        <div className="mb-4 p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-300">
            <Scale className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{t.ui.scoreCalculation}:</span>
            <span className="text-slate-400">{t.ui.baseline.replace('{score}', String(100))}</span>
            <span className="text-red-400 font-bold">− {t.ui.deductions} ({totalDeductions} {t.privacy.pointsDeduction})</span>
            <span className="text-slate-500">=</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-bold border border-slate-700">
              {computedScore}/100
            </span>
          </div>
          <div className="text-slate-400 text-[11px]">
            <span>{t.ui.activeDeductionsDetected.replace('{count}', String(issueFactors.length))}</span>
          </div>
        </div>
      )}

      {issueFactors.length === 0 ? (
        <div className="p-8 rounded-xl bg-slate-900/40 border border-emerald-500/20 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
          <h3 className="text-base font-bold font-mono text-emerald-300 mb-1">
            {t.home.whyNotHigher.noIssuesTitle}
          </h3>
          <p className="text-xs text-slate-400 max-w-md font-sans">
            {t.home.whyNotHigher.noIssuesDesc}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {issueFactors.map((factor) => {
            const deductionPts = Math.abs(factor.scoreImpact ?? factor.points);
            const confidence = factor.confidence || 'HIGH';
            const sourceLabel =
              factor.source === 'ip'
                ? t.ui.networkIntelligence
                : factor.source === 'headers'
                  ? 'HTTP Headers'
                  : 'Browser Intelligence';

            return (
              <div
                key={factor.id}
                data-finding-id={factor.id}
                data-single-source-of-truth="true"
                className="p-4 sm:p-5 rounded-xl bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="text-sm sm:text-base font-mono font-bold text-slate-200">
                      {factor.name}
                    </span>
                    <SeverityBadge severity={factor.severity} size="sm" />
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800/80 text-cyan-300 border border-slate-700">
                      {sourceLabel}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${
                        confidence === 'HIGH'
                          ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                          : confidence === 'MEDIUM'
                            ? 'bg-amber-950/40 text-amber-300 border-amber-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                      title={`Verification Confidence: ${confidence}`}
                    >
                      {confidence} CONFIDENCE
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 font-sans leading-relaxed mt-1">
                    <strong className="text-slate-400 font-mono text-[11px] mr-1">{t.ui.reason}</strong>
                    {factor.reason || factor.description}
                  </p>

                  {factor.recommendation && (
                    <p className="text-[11px] text-emerald-400/90 font-sans mt-1 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 shrink-0" />
                      <span>{factor.recommendation}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                  <div className="text-left sm:text-right">
                    <span className="text-base sm:text-lg font-mono font-bold text-red-400 block leading-tight">
                      -{deductionPts} {t.common.pts}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">
                      +{deductionPts} pts recoverable
                    </span>
                  </div>

                  <button
                    onClick={() => onSelectFactorForRemediation(factor)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-cyan-950/60 border border-slate-700 hover:border-cyan-500/40 text-xs font-mono text-cyan-300 transition-all shadow-sm"
                  >
                    <span>{t.home.whyNotHigher.howToImprove}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
