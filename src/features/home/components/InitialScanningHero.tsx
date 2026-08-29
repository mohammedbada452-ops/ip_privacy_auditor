import React from 'react';
import { Shield, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { StageStep } from '../types';

interface InitialScanningHeroProps {
  steps: StageStep[];
}

export const InitialScanningHero: React.FC<InitialScanningHeroProps> = ({ steps }) => {
  const { t } = useLanguage();

  const getStepLabel = (key: string) => {
    if (key === 'home.scanStages.ip') return t.home.scanStages.ip;
    if (key === 'home.scanStages.browser') return t.home.scanStages.browser;
    if (key === 'home.scanStages.headers') return t.home.scanStages.headers;
    if (key === 'home.scanStages.evaluating') return t.home.scanStages.evaluating;
    return key;
  };

  return (
    <div
      id="initial-scanning-hero"
      className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden text-center max-w-2xl mx-auto my-8 backdrop-blur-xl"
    >
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />

      <div className="relative z-10 space-y-6">
        {/* Animated Radar Icon */}
        <div className="relative inline-flex items-center justify-center">
          <div className="w-20 h-20 rounded-3xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-sky-400 shadow-inner">
            <Shield className="w-10 h-10 animate-pulse" />
          </div>
          <div className="absolute -inset-2 rounded-3xl border border-sky-500/20 animate-ping pointer-events-none" />
        </div>

        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
            {t.home.initialScanning.title}
          </h2>
          <p className="text-sm text-slate-400 mt-2 max-w-lg mx-auto">
            {t.home.initialScanning.subtitle}
          </p>
        </div>

        {/* Steps Progress */}
        <div className="space-y-3 pt-4 text-left max-w-md mx-auto">
          {steps.map((step) => {
            const isActive = step.status === 'active';
            const isComplete = step.status === 'complete';
            const isWarning = step.status === 'warning';
            const isError = step.status === 'error';

            return (
              <div
                key={step.id}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  isActive
                    ? 'bg-sky-500/10 border-sky-500/40 text-sky-200'
                    : isComplete
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-300'
                      : isWarning
                        ? 'bg-amber-500/5 border-amber-500/20 text-amber-300'
                        : isError
                          ? 'bg-rose-500/5 border-rose-500/20 text-rose-300'
                          : 'bg-slate-950/40 border-slate-800/60 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-3">
                  {isActive ? (
                    <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
                  ) : isComplete ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : isWarning ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-700 bg-slate-800" />
                  )}
                  <span className="text-xs font-semibold">{getStepLabel(step.labelKey)}</span>
                </div>

                {step.durationMs !== undefined && (
                  <span className="text-[11px] font-mono text-slate-400">{step.durationMs}ms</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
