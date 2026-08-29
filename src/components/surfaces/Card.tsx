import React from 'react';

export type CardVariant =
  | 'standard'
  | 'compact'
  | 'highlighted'
  | 'warning'
  | 'success'
  | 'danger'
  | 'data';

export interface CardProps {
  children: React.ReactNode;
  id?: string;
  variant?: CardVariant;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  id,
  variant = 'standard',
  className = '',
  onClick,
  hoverable = false,
}) => {
  const baseClasses =
    'rounded-xl border transition-all duration-200 overflow-hidden';

  const variantMap: Record<CardVariant, string> = {
    standard: 'bg-slate-900/90 border-slate-800 text-slate-100 shadow-sm',
    compact: 'bg-slate-900/80 border-slate-800/80 text-slate-100 text-sm',
    highlighted:
      'bg-slate-900 border-cyan-500/40 text-slate-100 shadow-[0_0_15px_rgba(6,182,212,0.12)]',
    warning:
      'bg-slate-900 border-amber-500/35 text-slate-100 shadow-[0_0_15px_rgba(245,158,11,0.08)]',
    success:
      'bg-slate-900 border-emerald-500/35 text-slate-100 shadow-[0_0_15px_rgba(16,185,129,0.08)]',
    danger:
      'bg-slate-900 border-red-500/35 text-slate-100 shadow-[0_0_15px_rgba(239,68,68,0.08)]',
    data: 'bg-slate-950/80 border-slate-800 text-slate-100 font-mono text-xs',
  };

  const hoverClasses = hoverable || onClick
    ? 'hover:border-slate-700 hover:shadow-md cursor-pointer transform-gpu hover:-translate-y-0.5'
    : '';

  return (
    <div
      id={id}
      onClick={onClick}
      className={`${baseClasses} ${variantMap[variant]} ${hoverClasses} ${className}`}
    >
      {children}
    </div>
  );
};

export interface CardHeaderProps {
  children?: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  statusBadge?: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  children,
  title,
  subtitle,
  icon,
  action,
  statusBadge,
  className = '',
}) => {
  if (children) {
    return (
      <div className={`p-4 sm:p-5 border-b border-slate-800/70 ${className}`}>
        {children}
      </div>
    );
  }

  return (
    <div
      className={`p-4 sm:p-5 border-b border-slate-800/70 flex items-start justify-between gap-3 ${className}`}
    >
      <div className="flex items-start gap-3 min-w-0">
        {icon && (
          <div className="p-2 rounded-lg bg-slate-800/80 text-cyan-400 border border-slate-700/60 shrink-0 mt-0.5">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {title && (
              <h3 className="text-sm sm:text-base font-bold text-slate-100 tracking-tight truncate">
                {title}
              </h3>
            )}
            {statusBadge}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-0.5 leading-normal">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

export interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export const CardBody: React.FC<CardBodyProps> = ({
  children,
  className = '',
  noPadding = false,
}) => {
  return (
    <div className={`${noPadding ? 'p-0' : 'p-4 sm:p-5'} ${className}`}>
      {children}
    </div>
  );
};

export interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  className = '',
}) => {
  return (
    <div
      className={`p-3 sm:p-4 bg-slate-950/40 border-t border-slate-800/70 text-xs text-slate-400 flex items-center justify-between gap-2 ${className}`}
    >
      {children}
    </div>
  );
};
