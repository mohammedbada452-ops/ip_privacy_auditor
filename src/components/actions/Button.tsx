import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  fullWidth = false,
  disabled,
  className = '',
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap';

  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      'bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm hover:shadow-[0_0_12px_rgba(6,182,212,0.3)] active:bg-cyan-700',
    secondary:
      'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700/80 active:bg-slate-850',
    outline:
      'bg-transparent hover:bg-slate-800/60 text-slate-200 border border-slate-700 hover:border-slate-600 active:bg-slate-800',
    ghost:
      'bg-transparent hover:bg-slate-800/50 text-slate-300 hover:text-slate-100 active:bg-slate-800',
    danger:
      'bg-red-600 hover:bg-red-500 text-white shadow-sm hover:shadow-[0_0_12px_rgba(239,68,68,0.3)] active:bg-red-700',
  };

  const sizeClasses: Record<ButtonSize, string> = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5 min-h-[32px]',
    md: 'text-sm px-4 py-2 gap-2 min-h-[40px]',
    lg: 'text-base px-5 py-2.5 gap-2.5 min-h-[48px]',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
