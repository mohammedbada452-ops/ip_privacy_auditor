import React from 'react';

export interface KeyValueProps {
  label: string;
  value: React.ReactNode;
  isMono?: boolean;
  vertical?: boolean;
  className?: string;
  copyable?: boolean;
}

export const KeyValue: React.FC<KeyValueProps> = ({
  label,
  value,
  isMono = true,
  vertical = false,
  className = '',
}) => {
  return (
    <div
      className={`flex ${
        vertical ? 'flex-col gap-1' : 'flex-row items-center justify-between gap-2'
      } text-xs ${className}`}
    >
      <span className="text-slate-400 font-medium shrink-0">{label}</span>
      <span
        className={`text-slate-100 ${
          isMono ? 'font-mono text-cyan-300' : 'font-sans'
        } truncate`}
      >
        {value}
      </span>
    </div>
  );
};
