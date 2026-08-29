import React from 'react';
import { Skeleton } from './Skeleton';

export interface LoadingStateProps {
  message?: string;
  variant?: 'spinner' | 'skeleton' | 'card';
  count?: number;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Analyzing signals...',
  variant = 'spinner',
  count = 3,
  className = '',
}) => {
  if (variant === 'skeleton') {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} height="48px" className="w-full" />
        ))}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4 ${className}`}>
        <Skeleton height="24px" width="40%" />
        <Skeleton height="16px" width="80%" />
        <Skeleton height="80px" width="100%" />
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className="relative flex items-center justify-center mb-4">
        <div className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
        <div className="absolute w-6 h-6 border-2 border-slate-700 border-b-cyan-300 rounded-full animate-spin direction-reverse" />
      </div>
      <p className="text-xs font-mono text-cyan-400/90 tracking-wider uppercase animate-pulse">
        {message}
      </p>
    </div>
  );
};
