import React from 'react';

interface Props {
  message?: string;
}

export const LoadingBoundary: React.FC<Props> = ({ message = 'Loading system components...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 min-h-[200px]">
      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3"></div>
      <p className="text-xs font-mono text-slate-400">{message}</p>
    </div>
  );
};
