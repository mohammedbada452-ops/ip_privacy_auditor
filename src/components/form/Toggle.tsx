import React from 'react';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: {
      track: 'w-7 h-4',
      thumb: 'w-3 h-3 translate-x-0.5',
      thumbChecked: 'translate-x-[14px]',
    },
    md: {
      track: 'w-10 h-5',
      thumb: 'w-4 h-4 translate-x-0.5',
      thumbChecked: 'translate-x-[22px]',
    },
  };

  const currentSize = sizeClasses[size];
  const accessibleLabel = typeof label === 'string' ? label : undefined;

  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      {(label || description) && (
        <div>
          {label && <div className="text-xs font-medium text-slate-200">{label}</div>}
          {description && <div className="text-[11px] text-slate-500">{description}</div>}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={accessibleLabel}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex min-w-10 min-h-10 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          currentSize.track
        } ${checked ? 'bg-cyan-600' : 'bg-slate-800 border border-slate-700'}`}
      >
        <span
          className={`pointer-events-none inline-block rounded-full bg-white shadow-sm transform ring-0 transition duration-200 ease-in-out ${
            currentSize.thumb
          } ${checked ? currentSize.thumbChecked : 'translate-x-0.5 bg-slate-400'}`}
        />
      </button>
    </div>
  );
};
