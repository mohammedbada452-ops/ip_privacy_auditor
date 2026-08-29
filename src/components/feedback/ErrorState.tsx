import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../actions/Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  compact?: boolean;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Signal Analysis Error',
  message,
  onRetry,
  compact = false,
  className = '',
}) => {
  if (compact) {
    return (
      <div
        className={`p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center justify-between gap-3 ${className}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span className="truncate">{message}</span>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-[11px] font-mono text-red-300 hover:text-white underline shrink-0 cursor-pointer"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`p-6 sm:p-8 rounded-xl bg-slate-900 border border-red-500/30 text-center max-w-md mx-auto shadow-xl ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto mb-4">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-bold text-slate-100 mb-2">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-400 mb-6 font-mono leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800 text-left overflow-x-auto">
        {message}
      </p>
      {onRetry && (
        <Button
          variant="danger"
          size="sm"
          onClick={onRetry}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Re-Analyze Request
        </Button>
      )}
    </div>
  );
};
