import React from 'react';

export interface LabelProps {
  children: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  className?: string;
  size?: 'xs' | 'sm' | 'base';
}

export const Label: React.FC<LabelProps> = ({
  children,
  htmlFor,
  required = false,
  className = '',
  size = 'xs',
}) => {
  const sizeClasses = {
    xs: 'text-[11px]',
    sm: 'text-xs',
    base: 'text-sm',
  };

  return (
    <label
      htmlFor={htmlFor}
      className={`block font-mono uppercase tracking-wider text-slate-400 font-semibold ${sizeClasses[size]} ${className}`}
    >
      {children}
      {required && <span className="text-red-400 ml-1">*</span>}
    </label>
  );
};
