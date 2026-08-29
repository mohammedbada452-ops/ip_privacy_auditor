import React from 'react';

export interface MetadataProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const Metadata: React.FC<MetadataProps> = ({
  label,
  value,
  icon,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-1.5 text-xs font-mono text-slate-400 ${className}`}>
      {icon && <span className="text-slate-500 shrink-0">{icon}</span>}
      <span className="text-slate-500">{label}:</span>
      <span className="text-slate-200 font-medium">{value}</span>
    </div>
  );
};
