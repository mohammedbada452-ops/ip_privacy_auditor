import React from 'react';
import type { SeverityLevel } from '../../tokens';
import { Badge } from './Badge';
import { AlertOctagon, AlertTriangle, Info } from 'lucide-react';

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
    { variant: 'danger' | 'warning' | 'info' | 'neutral'; label: string; icon: React.ReactNode; className?: string }
  > = {
    critical: { variant: 'danger', label: 'CRITICAL', icon: <AlertOctagon className="w-3 h-3" aria-hidden="true" />, className: 'font-bold' },
    high: { variant: 'warning', label: 'HIGH RISK', icon: <AlertTriangle className="w-3 h-3" aria-hidden="true" />, className: '!bg-orange-500/10 !text-orange-300 !border-orange-400/30 font-semibold' },
    medium: { variant: 'warning', label: 'MEDIUM RISK', icon: <AlertTriangle className="w-3 h-3" aria-hidden="true" /> },
    low: { variant: 'info', label: 'LOW RISK', icon: <Info className="w-3 h-3" aria-hidden="true" /> },
    info: { variant: 'neutral', label: 'INFO', icon: <Info className="w-3 h-3" aria-hidden="true" /> },
  };

  const config = severityConfig[severity];

  return (
    <Badge variant={config.variant} size={size} icon={config.icon} dot className={`${config.className || ''} ${className}`.trim()}>
      {config.label}
    </Badge>
  );
};
