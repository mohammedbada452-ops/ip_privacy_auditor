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
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    danger: 'bg-red-500/10 text-red-400 border-red-500/20',
    info: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    unknown: 'bg-slate-800/60 text-slate-400 border-slate-700/40',
    unavailable: 'bg-slate-800/40 text-slate-500 border-slate-800',
    detected: 'bg-red-500/10 text-red-400 border-red-500/20',
    'not-detected': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  };

  const dotClasses: Record<SemanticStatus, string> = {
    neutral: 'bg-slate-400',
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    danger: 'bg-red-400',
    info: 'bg-cyan-400',
    unknown: 'bg-slate-400',
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
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClasses[variant]}`}
        />
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
