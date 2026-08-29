import React from 'react';

export interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  variant?: 'text' | 'circular' | 'rectangular';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height,
  variant = 'rectangular',
}) => {
  const variantClasses = {
    text: 'rounded h-4 w-full',
    circular: 'rounded-full',
    rectangular: 'rounded-xl',
  };

  const style = {
    width: width,
    height: height,
  };

  return (
    <div
      style={style}
      className={`animate-pulse bg-slate-800/70 border border-slate-700/30 ${variantClasses[variant]} ${className}`}
    />
  );
};
