import React from 'react';

export interface IconWrapperProps {
  icon: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'cyan' | 'emerald' | 'amber' | 'red' | 'slate';
  className?: string;
}

export const IconWrapper: React.FC<IconWrapperProps> = ({
  icon,
  size = 'md',
  variant = 'cyan',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'p-1.5 rounded-md text-xs',
    md: 'p-2 rounded-lg text-sm',
    lg: 'p-2.5 rounded-xl text-base',
    xl: 'p-3 rounded-xl text-lg',
  };

  const variantClasses = {
    cyan: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    red: 'bg-red-500/10 text-red-400 border border-red-500/20',
    slate: 'bg-slate-800/80 text-slate-300 border border-slate-700/60',
  };

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {icon}
    </div>
  );
};
