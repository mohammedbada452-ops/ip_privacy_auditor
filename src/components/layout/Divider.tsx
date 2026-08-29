import React from 'react';

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  label?: string;
}

export const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  className = '',
  label,
}) => {
  if (orientation === 'vertical') {
    return <div className={`w-[1px] h-full bg-slate-800 self-stretch ${className}`} />;
  }

  if (label) {
    return (
      <div className={`relative flex items-center py-2 ${className}`}>
        <div className="flex-grow border-t border-slate-800" />
        <span className="flex-shrink mx-3 text-[11px] font-mono text-slate-500 uppercase tracking-wider">
          {label}
        </span>
        <div className="flex-grow border-t border-slate-800" />
      </div>
    );
  }

  return <hr className={`border-t border-slate-800/80 my-4 ${className}`} />;
};
