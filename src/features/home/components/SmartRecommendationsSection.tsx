import React from 'react';
import { Sparkles, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Link } from '../../../router/Router';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { SmartRecommendation } from '../types';

interface SmartRecommendationsSectionProps {
  recommendations: SmartRecommendation[];
}

export const SmartRecommendationsSection: React.FC<SmartRecommendationsSectionProps> = ({
  recommendations,
}) => {
  const { t } = useLanguage();

  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-xl text-center space-y-2">
        <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
        <h3 className="text-sm font-bold text-slate-200">
          {t.home.recommendations.title}
        </h3>
        <p className="text-xs text-slate-400">
          {t.home.unifiedRisks.noRisksSubtitle}
        </p>
      </div>
    );
  }

  return (
    <div
      id="smart-recommendations-section"
      className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-xl space-y-6"
    >
      <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
        <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-100">
            {t.home.recommendations.title}
          </h2>
          <p className="text-xs text-slate-400">
            {t.home.recommendations.subtitle}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recommendations.slice(0, 6).map((rec) => {
          const effortBadge =
            rec.priority === 'high'
              ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
              : rec.priority === 'medium'
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                : 'bg-sky-500/10 text-sky-300 border-sky-500/20';

          const priorityText =
            rec.priority === 'high'
              ? t.home.recommendations.priorityHigh
              : rec.priority === 'medium'
                ? t.home.recommendations.priorityMed
                : t.home.recommendations.priorityLow;

          return (
            <div
              key={rec.id}
              className="rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-indigo-500/40 p-5 flex flex-col justify-between transition-all space-y-4 shadow-sm"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${effortBadge}`}>
                    {priorityText}
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                    +{rec.estimatedScoreBoost} {t.home.recommendations.potentialBoost}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-100">
                  {rec.title}
                </h3>

                <p className="text-xs text-slate-400 leading-relaxed">
                  {rec.description}
                </p>

                {rec.fixes && rec.fixes.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-mono text-slate-400 font-semibold block">
                      Targeted Actions:
                    </span>
                    {rec.fixes.map((fix) => (
                      <div key={fix.id} className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] space-y-1">
                        <div className="flex items-center justify-between gap-1 font-mono">
                          <span className="text-slate-200 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                            {fix.title}
                          </span>
                          <span className="text-emerald-400 font-bold shrink-0">
                            +{fix.expectedImprovementPts} pts
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-1 text-[10px] text-slate-500 font-mono">
                          <span>{fix.actor}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-slate-500 uppercase">
                  {rec.sourceCategory}
                </span>

                <Link
                  to={rec.targetRoute || '/'}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors shrink-0 cursor-pointer"
                >
                  <span>{rec.actionLabel || t.home.recommendations.applyFix}</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
