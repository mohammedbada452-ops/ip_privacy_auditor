import React from 'react';
import { Link } from '../../router/Router';

export interface NavItemProps {
  to: string;
  label: string;
  icon?: React.ReactNode;
  isActive?: boolean;
  badge?: React.ReactNode;
  className?: string;
}

export const NavItem: React.FC<NavItemProps> = ({
  to,
  label,
  icon,
  isActive = false,
  badge,
  className = '',
}) => {
  return (
    <Link
      to={to}
      className={`px-3 py-2.5 min-h-10 rounded-lg text-sm font-sans font-medium flex items-center justify-between gap-2 transition-all duration-150 ${
        isActive
          ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-semibold shadow-sm'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
      } ${className}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {icon && <span className={isActive ? 'text-cyan-400' : 'text-slate-500'}>{icon}</span>}
        <span className="truncate">{label}</span>
      </div>
      {badge && <span className="shrink-0">{badge}</span>}
    </Link>
  );
};
