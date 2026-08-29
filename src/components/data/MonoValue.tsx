import React from 'react';

export interface MonoValueProps {
  children: React.ReactNode;
  color?: 'cyan' | 'emerald' | 'amber' | 'red' | 'slate';
  className?: string;
  size?: 'xs' | 'sm' | 'base' | 'lg';
}

export const MonoValue: React.FC<MonoValueProps> = ({
  children,
  color = 'cyan',
  className = '',
  size = 'xs',
}) => {
  const colorClasses = {
    cyan: 'text-cyan-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
    slate: 'text-slate-300',
  };

  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg font-bold',
  };

  return (
    <span
      className={`font-mono font-medium ${colorClasses[color]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </span>
  );
};
