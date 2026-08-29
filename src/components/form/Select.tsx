import React from 'react';
import { InlineError } from '../feedback/InlineError';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
  isMono?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      options,
      error,
      helperText,
      isMono = false,
      className = '',
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-mono uppercase text-slate-400 mb-1.5 font-medium"
          >
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          disabled={disabled}
          className={`w-full bg-slate-950 border text-slate-100 text-xs sm:text-sm rounded-lg px-3 py-2 transition-colors focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed ${
            error ? 'border-red-500' : 'border-slate-800 hover:border-slate-700'
          } ${isMono ? 'font-mono' : 'font-sans'} ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled} className="bg-slate-900 text-slate-100">
              {opt.label}
            </option>
          ))}
        </select>
        {helperText && !error && (
          <p className="text-[11px] text-slate-500 mt-1">{helperText}</p>
        )}
        <InlineError message={error} />
      </div>
    );
  }
);

Select.displayName = 'Select';
