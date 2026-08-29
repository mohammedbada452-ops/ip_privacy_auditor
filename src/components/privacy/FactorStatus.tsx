import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';

export type FactorState = 'pass' | 'warn' | 'fail' | 'info';

export interface FactorStatusProps {
  state: FactorState;
  title: string;
  deduction?: number;
  description?: string;
  className?: string;
}

export const FactorStatus: React.FC<FactorStatusProps> = ({
  state,
  title,
  deduction,
  description,
  className = '',
}) => {
  const config = {
    pass: {
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
      border: 'border-emerald-500/20 bg-emerald-950/20',
      text: 'text-emerald-400',
    },
    warn: {
      icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
      border: 'border-amber-500/20 bg-amber-950/20',
      text: 'text-amber-400',
    },
    fail: {
      icon: <XCircle className="w-4 h-4 text-red-400" />,
      border: 'border-red-500/20 bg-red-950/20',
      text: 'text-red-400',
    },
    info: {
      icon: <Info className="w-4 h-4 text-cyan-400" />,
      border: 'border-cyan-500/20 bg-cyan-950/20',
      text: 'text-cyan-400',
    },
  }[state];

  return (
    <div className={`p-3 rounded-lg border ${config.border} flex items-start justify-between gap-3 ${className}`}>
      <div className="flex items-start gap-2.5 min-w-0">
        <span className="shrink-0 mt-0.5">{config.icon}</span>
        <div className="min-w-0">
          <h4 className="text-xs font-bold text-slate-200">{title}</h4>
          {description && <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">{description}</p>}
        </div>
      </div>
      {deduction !== undefined && deduction > 0 && (
        <span className="text-xs font-mono font-bold text-red-400 shrink-0 bg-red-950/60 px-2 py-0.5 rounded border border-red-800/40">
          -{deduction} pts
        </span>
      )}
    </div>
  );
};
