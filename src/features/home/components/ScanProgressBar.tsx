import React from 'react';
import { CheckCircle2, Loader2, AlertTriangle, Circle, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../../i18n/LanguageContext';
import type { StageStep } from '../types';

interface ScanProgressBarProps {
  steps: StageStep[];
  isScanning: boolean;
}

export const ScanProgressBar: React.FC<ScanProgressBarProps> = ({ steps, isScanning }) => {
  const { t } = useLanguage();

  if (!isScanning) return null;

  const getStepIcon = (status: StageStep['status']) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'active':
        return <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />;
      case 'pending':
      default:
        return <Circle className="w-4 h-4 text-slate-600 shrink-0" />;
    }
  };

  const getStepText = (id: StageStep['id']) => {
    switch (id) {
      case 'ip':
        return t.home.scanStages.ip;
      case 'browser':
        return t.home.scanStages.browser;
      case 'headers':
        return t.home.scanStages.headers;
      case 'evaluating':
        return t.home.scanStages.evaluating;
      default:
        return id;
    }
  };

  return (
    <div className="w-full bg-slate-900/90 backdrop-blur border border-cyan-500/20 rounded-xl p-5 mb-8 shadow-xl shadow-cyan-950/20">
      <div className="flex items-center gap-3 mb-4">
        <ShieldCheck className="w-5 h-5 text-cyan-400 animate-pulse" />
        <span className="text-sm font-mono font-semibold text-cyan-200 uppercase tracking-wider">
          {t.common.scanning}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {steps.map((step) => {
          const isActive = step.status === 'active';
          const isComplete = step.status === 'complete';

          return (
            <div
              key={step.id}
              className={`flex items-center gap-2.5 p-3 rounded-lg border text-xs font-mono transition-all ${
                isActive
                  ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-200'
                  : isComplete
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400'
              }`}
            >
              {getStepIcon(step.status)}
              <span className="truncate">{getStepText(step.id)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
