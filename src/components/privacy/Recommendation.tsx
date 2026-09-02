import React from 'react';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import type { SeverityLevel } from '../../tokens';
import { useLanguage } from '../../i18n/LanguageContext';

export interface RecommendationProps {
  title: string;
  actionText: string;
  impact: SeverityLevel;
  description?: string;
  onApplyAction?: () => void;
  className?: string;
}

export const Recommendation: React.FC<RecommendationProps> = ({
  title,
  actionText,
  impact,
  description,
  onApplyAction,
  className = '',
}) => {
  const { t } = useLanguage();
  const impactBorder = {
    critical: 'border-red-500/30 bg-red-950/15',
    high: 'border-red-500/30 bg-red-950/10',
    medium: 'border-amber-500/30 bg-amber-950/10',
    low: 'border-cyan-500/30 bg-cyan-950/10',
    info: 'border-slate-800 bg-slate-900/50',
  }[impact];

  return (
    <div className={`p-4 rounded-xl border ${impactBorder} flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}>
      <div className="flex items-start gap-3 min-w-0">
        <div className="p-2 rounded-lg bg-slate-800 text-cyan-400 shrink-0 mt-0.5 border border-slate-700/60">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-slate-100">{title}</h4>
          {description && (
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {description}
            </p>
          )}
          <div className="text-[11px] font-mono text-cyan-400 font-medium mt-1">
            Action: {actionText}
          </div>
        </div>
      </div>

      {onApplyAction && (
        <button
          onClick={onApplyAction}
          className="min-h-10 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-cyan-200 border border-slate-700 text-xs font-mono font-medium flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 shrink-0 self-start sm:self-auto cursor-pointer transition-colors"
        >
          <span>{t.common.remediate}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
