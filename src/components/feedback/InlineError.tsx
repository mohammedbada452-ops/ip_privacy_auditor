import React from 'react';
import { AlertCircle } from 'lucide-react';

export interface InlineErrorProps {
  message?: string;
  className?: string;
}

export const InlineError: React.FC<InlineErrorProps> = ({ message, className = '' }) => {
  if (!message) return null;

  return (
    <div className={`flex items-center gap-1.5 text-xs text-red-400 font-medium mt-1 ${className}`}>
      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
};
