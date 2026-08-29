import React from 'react';
import { Badge } from './Badge';
import type { SemanticStatus } from '../../tokens';

export interface StatusBadgeProps {
  status: SemanticStatus;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'md',
  className = '',
}) => {
  const defaultLabels: Record<SemanticStatus, string> = {
    neutral: 'NEUTRAL',
    success: 'SAFE',
    warning: 'WARNING',
    danger: 'EXPOSED',
    info: 'INFO',
    unknown: 'UNKNOWN',
    unavailable: 'UNAVAILABLE',
    detected: 'DETECTED',
    'not-detected': 'NOT DETECTED',
  };

  const textLabel = label || defaultLabels[status];

  return (
    <Badge variant={status} size={size} dot className={className}>
      {textLabel}
    </Badge>
  );
};
