import React from 'react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  description?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, className = '', id, disabled, ...props }, ref) => {
    const checkboxId = id || (typeof label === 'string' ? `checkbox-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          id={checkboxId}
          ref={ref}
          disabled={disabled}
          className={`mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-500/50 focus:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${className}`}
          {...props}
        />
        {(label || description) && (
          <label
            htmlFor={checkboxId}
            className="text-xs text-slate-300 font-medium select-none cursor-pointer leading-tight"
          >
            <div>{label}</div>
            {description && (
              <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                {description}
              </div>
            )}
          </label>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
