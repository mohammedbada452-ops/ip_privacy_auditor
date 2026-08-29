import React from 'react';
import type { SeverityLevel } from '../../tokens';
import { Badge } from './Badge';

export interface SeverityBadgeProps {
  severity: SeverityLevel;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  severity,
  className = '',
  size = 'md',
}) => {
  const severityConfig: Record<
    SeverityLevel,
    { variant: 'danger' | 'warning' | 'info' | 'neutral'; label: string }
  > = {
    critical: { variant: 'danger', label: 'CRITICAL' },
    high: { variant: 'danger', label: 'HIGH RISK' },
    medium: { variant: 'warning', label: 'MEDIUM RISK' },
    low: { variant: 'info', label: 'LOW RISK' },
    info: { variant: 'neutral', label: 'INFO' },
  };

  const config = severityConfig[severity];

  return (
    <Badge variant={config.variant} size={size} dot className={className}>
      {config.label}
    </Badge>
  );
};
