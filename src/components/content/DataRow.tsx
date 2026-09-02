import React from 'react';

export interface DataRowProps {
  label: React.ReactNode;
  value: React.ReactNode;
  isMono?: boolean;
  status?: React.ReactNode;
  description?: string;
  className?: string;
  action?: React.ReactNode;
}

export const DataRow: React.FC<DataRowProps> = ({
  label,
  value,
  isMono = false,
  status,
  description,
  className = '',
  action,
}) => {
  return (
    <div
      className={`py-2.5 px-3 rounded-lg bg-slate-950/40 border border-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm ${className}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-300">{label}</span>
          {status}
        </div>
        {description && (
          <p className="text-[11px] text-slate-500 mt-0.5">{description}</p>
        )}
      </div>

      <div className="flex items-start gap-2 min-w-0 max-w-full sm:max-w-[62%] self-start sm:self-auto">
        <span
          className={`min-w-0 break-words [overflow-wrap:anywhere] text-start text-slate-100 font-medium ${
            isMono ? 'font-mono text-cyan-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800' : ''
          }`}
        >
          {value}
        </span>
        {action}
      </div>
    </div>
  );
};
