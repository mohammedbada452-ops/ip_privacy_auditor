import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { Button } from '../actions/Button';

export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  className = '',
}) => {
  return (
    <div
      className={`p-8 text-center rounded-xl bg-slate-900/60 border border-slate-800 border-dashed ${className}`}
    >
      <div className="w-10 h-10 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3 border border-slate-700/60">
        {icon || <ShieldAlert className="w-5 h-5 text-slate-500" />}
      </div>
      <h3 className="text-sm font-bold text-slate-200 mb-1">{title}</h3>
      <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">{description}</p>
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
