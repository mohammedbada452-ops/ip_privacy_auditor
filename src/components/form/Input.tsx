import React from 'react';
import { InlineError } from '../feedback/InlineError';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  helperText?: string;
  isMono?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      leftIcon,
      rightIcon,
      helperText,
      isMono = false,
      className = '',
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-mono uppercase text-slate-400 mb-1.5 font-medium"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-slate-500 pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            disabled={disabled}
            className={`w-full bg-slate-950 border text-slate-100 text-xs sm:text-sm rounded-lg px-3 py-2 transition-colors placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed ${
              leftIcon ? 'pl-9' : ''
            } ${rightIcon ? 'pr-9' : ''} ${
              error ? 'border-red-500' : 'border-slate-800 hover:border-slate-700'
            } ${isMono ? 'font-mono' : 'font-sans'} ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 text-slate-500">{rightIcon}</div>
          )}
        </div>
        {helperText && !error && (
          <p className="text-[11px] text-slate-500 mt-1">{helperText}</p>
        )}
        <InlineError message={error} />
      </div>
    );
  }
);

Input.displayName = 'Input';
