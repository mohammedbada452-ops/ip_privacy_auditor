import React from 'react';
import type { SemanticStatus } from '../../tokens';

export interface StatusIndicatorProps {
  status: SemanticStatus;
  pulse?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  pulse = true,
  size = 'md',
  className = '',
  label,
}) => {
  const colorMap: Record<SemanticStatus, string> = {
    neutral: 'bg-slate-400',
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    danger: 'bg-red-400',
    info: 'bg-cyan-400',
    unknown: 'bg-slate-400',
    unavailable: 'bg-slate-600',
    detected: 'bg-red-400',
    'not-detected': 'bg-emerald-400',
  };

  const sizeMap = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="relative flex items-center justify-center">
        {pulse && status !== 'unavailable' && status !== 'unknown' && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${colorMap[status]}`}
          />
        )}
        <span
          className={`relative inline-flex rounded-full ${sizeMap[size]} ${colorMap[status]}`}
        />
      </span>
      {label && (
        <span className="text-xs font-mono font-medium text-slate-300">
          {label}
        </span>
      )}
    </span>
  );
};
