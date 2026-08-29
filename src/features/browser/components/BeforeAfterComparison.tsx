/**
 * BeforeAfterComparison Component
 * Displays score delta and signal state transitions after rechecks or subsequent scans.
 */

import React from 'react';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { SignalTransition } from '../utils/problemExtractor';
import { ArrowRight, CheckCircle2, TrendingUp, TrendingDown, X, ShieldAlert } from 'lucide-react';

interface BeforeAfterComparisonProps {
  previousScore: number;
  currentScore: number;
  transitions: SignalTransition[];
  onDismiss: () => void;
}

export const BeforeAfterComparison: React.FC<BeforeAfterComparisonProps> = ({
  previousScore,
  currentScore,
  transitions,
  onDismiss,
}) => {
  const { t } = useLanguage();
  const delta = currentScore - previousScore;
  const isImproved = delta > 0;
  const isNeutral = delta === 0;

  return (
    <div
      id="browser-before-after-comparison"
      className="p-4 mb-6 rounded-xl bg-slate-900/90 border border-cyan-500/30 shadow-lg relative overflow-hidden"
    >
      <div className="flex items-start justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            {isImproved ? <TrendingUp className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">{t.browser.beforeAfterTitle}</h3>
            <p className="text-xs text-slate-400">
              {isImproved
                ? `Privacy score increased by +${delta} points after recheck.`
                : isNeutral
                  ? 'No score change detected between scans.'
                  : `Score decreased by ${delta} points.`}
            </p>
          </div>
        </div>

        <button
          id="dismiss-before-after-btn"
          onClick={onDismiss}
          aria-label={t.browser.dismissComparison}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Score Comparison Display */}
      <div className="grid grid-cols-3 gap-3 my-4">
        <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-center">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            {t.browser.beforeScore}
          </span>
          <span className="text-2xl font-bold font-mono text-slate-300">{previousScore}</span>
        </div>

        <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-center flex flex-col items-center justify-center">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            {t.browser.scoreDelta}
          </span>
          <span
            className={`text-xl font-bold font-mono px-2 py-0.5 rounded border ${
              isImproved
                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                : isNeutral
                  ? 'text-slate-400 bg-slate-800 border-slate-700'
                  : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
            }`}
          >
            {delta > 0 ? `+${delta}` : delta}
          </span>
        </div>

        <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-center">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            {t.browser.afterScore}
          </span>
          <span className="text-2xl font-bold font-mono text-cyan-400">{currentScore}</span>
        </div>
      </div>

      {/* Signal Transitions */}
      {transitions.length > 0 ? (
        <div className="mt-3 space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
            {t.browser.signalChangesTitle}
          </span>
          <div className="space-y-1.5">
            {transitions.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/80 text-xs"
              >
                <span className="font-medium text-slate-200">{item.name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-400 line-through">{item.beforeStatus}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  <span
                    className={`font-mono font-semibold px-2 py-0.5 rounded ${
                      item.improved
                        ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                        : 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
                    }`}
                  >
                    {item.afterStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic text-center py-1">{t.browser.noChangesDetected}</p>
      )}
    </div>
  );
};
