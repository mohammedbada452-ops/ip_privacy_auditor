import React from 'react';
import type { SeverityLevel } from '../../tokens';
import { SeverityBadge } from '../status/SeverityBadge';

export interface RiskIndicatorProps {
  level: SeverityLevel;
  scoreDeduction?: number;
  label?: string;
  className?: string;
}

export const RiskIndicator: React.FC<RiskIndicatorProps> = ({
  level,
  scoreDeduction,
  label,
  className = '',
}) => {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <SeverityBadge severity={level} />
      {scoreDeduction && scoreDeduction > 0 && (
        <span className="text-xs font-mono text-red-400 font-semibold">
          (-{scoreDeduction} pts)
        </span>
      )}
      {label && <span className="text-xs text-slate-400">{label}</span>}
    </div>
  );
};
