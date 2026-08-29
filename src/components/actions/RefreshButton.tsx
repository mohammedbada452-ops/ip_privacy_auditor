import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from './Button';

export interface RefreshButtonProps {
  onRefresh: () => void | Promise<void>;
  isRefreshing?: boolean;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const RefreshButton: React.FC<RefreshButtonProps> = ({
  onRefresh,
  isRefreshing = false,
  label = 'Refresh Scan',
  size = 'sm',
  className = '',
}) => {
  return (
    <Button
      variant="secondary"
      size={size}
      isLoading={isRefreshing}
      onClick={onRefresh}
      leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />}
      className={className}
    >
      {label}
    </Button>
  );
};
