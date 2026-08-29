import React from 'react';

export interface CodeValueProps {
  children: React.ReactNode;
  className?: string;
  size?: 'xs' | 'sm' | 'base';
}

export const CodeValue: React.FC<CodeValueProps> = ({
  children,
  className = '',
  size = 'xs',
}) => {
  const sizeClasses = {
    xs: 'text-[11px] px-2 py-0.5',
    sm: 'text-xs px-2.5 py-1',
    base: 'text-sm px-3 py-1.5',
  };

  return (
    <code
      className={`font-mono bg-slate-950 border border-slate-800 text-cyan-300 rounded-md inline-block max-w-full overflow-x-auto whitespace-pre-wrap break-all ${sizeClasses[size]} ${className}`}
    >
      {children}
    </code>
  );
};
