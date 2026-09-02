import React from 'react';
import type { SemanticStatus } from '../../tokens';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: SemanticStatus;
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className = '',
  icon,
}) => {
  const variantClasses: Record<SemanticStatus, string> = {
    neutral: 'bg-slate-800/80 text-slate-300 border-slate-700/60',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
    danger: 'bg-red-500/10 text-red-400 border-red-500/25',
    info: 'bg-blue-500/10 text-blue-300 border-blue-400/25',
    unknown: 'bg-slate-800/75 text-slate-300 border-slate-600/70 border-dashed',
    unavailable: 'bg-slate-900/80 text-slate-400 border-slate-700 border-dotted',
    detected: 'bg-red-500/10 text-red-400 border-red-500/25',
    'not-detected': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
  };

  const dotClasses: Record<SemanticStatus, string> = {
    neutral: 'bg-slate-400',
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    danger: 'bg-red-400',
    info: 'bg-blue-400',
    unknown: 'bg-slate-300',
    unavailable: 'bg-slate-500',
    detected: 'bg-red-400',
    'not-detected': 'bg-emerald-400',
  };

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };

  return (
    <span
      className={`inline-flex items-center font-mono font-medium rounded-md border tracking-wider uppercase whitespace-nowrap ${
        variantClasses[variant]
      } ${sizeClasses[size]} ${className}`}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClasses[variant]}`}
        />
      )}
      {icon && <span aria-hidden="true" className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
