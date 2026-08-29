import React from 'react';
import type { ButtonVariant, ButtonSize } from './Button';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  ariaLabel: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  ariaLabel,
  variant = 'ghost',
  size = 'md',
  isLoading = false,
  disabled,
  className = '',
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0';

  const variantClasses: Record<ButtonVariant, string> = {
    primary: 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm',
    secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700',
    outline: 'bg-transparent hover:bg-slate-800 text-slate-300 border border-slate-700',
    ghost: 'bg-transparent hover:bg-slate-800/60 text-slate-400 hover:text-slate-100',
    danger: 'bg-red-600 hover:bg-red-500 text-white shadow-sm',
  };

  const sizeClasses: Record<ButtonSize, string> = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  return (
    <button
      aria-label={ariaLabel}
      title={ariaLabel}
      disabled={disabled || isLoading}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        icon
      )}
    </button>
  );
};
