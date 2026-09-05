import React from 'react';

export interface ScoreLabelProps {
  score: number;
  showMax?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ScoreLabel: React.FC<ScoreLabelProps> = ({
  score,
  showMax = true,
  className = '',
  size = 'md',
}) => {
  const safeScore = Number.isFinite(score) ? score : 0;

  const getScoreColor = (val: number) => {
    if (val >= 80) return 'text-emerald-400';
    if (val >= 50) return 'text-amber-400';
    return 'text-red-400';
  };

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base font-bold',
    lg: 'text-2xl font-bold',
  };

  return (
    <span className={`font-mono ${sizeClasses[size]} ${getScoreColor(safeScore)} ${className}`}>
      {Math.round(safeScore)}
      {showMax && <span className="text-slate-500 text-xs font-normal">/100</span>}
    </span>
  );
};
