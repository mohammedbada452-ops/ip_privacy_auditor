import React from 'react';
import { getScoreTierConfig } from '../../lib/scoreTier';

export interface ScoreGaugeProps {
  score: number; // 0 to 100
  label?: string;
  tierLabel?: string;
  subtext?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showDeductions?: boolean;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({
  score,
  label = 'PRIVACY SCORE',
  tierLabel,
  subtext,
  size = 'md',
  className = '',
}) => {
  // Clamp score between 0 and 100
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));

  // Use the authoritative score-tier thresholds shared by the privacy engine.
  // This keeps the visual gauge, tier label, and backend classification aligned.
  const tierConfig = getScoreTierConfig(normalizedScore);
  const getColorScheme = () => {
    switch (tierConfig.tier) {
      case 'EXCELLENT':
        return {
          stroke: '#10B981',
          text: 'text-emerald-400',
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/20',
          defaultTier: tierConfig.defaultLabel,
        };
      case 'GOOD':
        return {
          stroke: '#22D3EE',
          text: 'text-cyan-300',
          bg: 'bg-cyan-500/10',
          border: 'border-cyan-500/20',
          defaultTier: tierConfig.defaultLabel,
        };
      case 'MODERATE':
        return {
          stroke: '#F59E0B',
          text: 'text-amber-400',
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/20',
          defaultTier: tierConfig.defaultLabel,
        };
      case 'CRITICAL':
      default:
        return {
          stroke: '#EF4444',
          text: 'text-rose-400',
          bg: 'bg-rose-500/10',
          border: 'border-rose-500/20',
          defaultTier: tierConfig.defaultLabel,
        };
    }
  };

  const scheme = getColorScheme();
  const tierText = tierLabel || scheme.defaultTier;

  // SVG Gauge calculations
  const dimensions = {
    sm: { size: 140, strokeWidth: 10, fontSize: 'text-2xl' },
    md: { size: 180, strokeWidth: 12, fontSize: 'text-4xl' },
    lg: { size: 240, strokeWidth: 16, fontSize: 'text-5xl' },
    xl: { size: 260, strokeWidth: 17, fontSize: 'text-6xl' },
  }[size] ?? { size: 180, strokeWidth: 12, fontSize: 'text-4xl' };

  const center = dimensions.size / 2;
  const radius = center - dimensions.strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;

  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`}>
      <div className="relative inline-flex items-center justify-center" style={{ width: dimensions.size, height: dimensions.size }}>
        <svg
          width={dimensions.size}
          height={dimensions.size}
          className="transform -rotate-90"
          aria-label={`Privacy Score: ${normalizedScore} out of 100`}
        >
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="#1E293B"
            strokeWidth={dimensions.strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke={scheme.stroke}
            strokeWidth={dimensions.strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center score details */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-semibold mb-0.5">
            {label}
          </span>
          <span className={`font-mono font-bold tracking-tight ${dimensions.fontSize} ${scheme.text}`}>
            {normalizedScore}
          </span>
          <span className="text-[10px] font-mono text-slate-500 mt-0.5">/ 100</span>
        </div>
      </div>

      {/* Tier Classification Badge */}
      <div className={`mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-mono font-semibold border ${scheme.bg} ${scheme.border} ${scheme.text}`}>
        {tierText}
      </div>

      {subtext && (
        <p className="text-xs text-slate-400 font-sans mt-2 max-w-xs leading-relaxed">
          {subtext}
        </p>
      )}
    </div>
  );
};
