import type { PrivacyScoreTier } from '@packages/api-contract';

export interface ScoreTierConfig {
  tier: PrivacyScoreTier;
  minScore: number;
  maxScore: number;
  labelKey: string;
  defaultLabel: string;
  colorClass: string;
  badgeVariant: 'success' | 'info' | 'warning' | 'danger';
  bgGradient: string;
  borderColor: string;
}

export const SCORE_TIER_CONFIGS: Record<PrivacyScoreTier, ScoreTierConfig> = {
  EXCELLENT: {
    tier: 'EXCELLENT',
    minScore: 85,
    maxScore: 100,
    labelKey: 'common.tierExcellent',
    defaultLabel: 'Excellent Privacy',
    colorClass: 'text-emerald-400',
    badgeVariant: 'success',
    bgGradient: 'from-emerald-500/20 to-teal-500/10',
    borderColor: 'border-emerald-500/30',
  },
  GOOD: {
    tier: 'GOOD',
    minScore: 70,
    maxScore: 84,
    labelKey: 'common.tierGood',
    defaultLabel: 'Good Protection',
    colorClass: 'text-cyan-400',
    badgeVariant: 'info',
    bgGradient: 'from-cyan-500/20 to-blue-500/10',
    borderColor: 'border-cyan-500/30',
  },
  MODERATE: {
    tier: 'MODERATE',
    minScore: 40,
    maxScore: 69,
    labelKey: 'common.tierModerate',
    defaultLabel: 'Moderate Exposure',
    colorClass: 'text-amber-400',
    badgeVariant: 'warning',
    bgGradient: 'from-amber-500/20 to-orange-500/10',
    borderColor: 'border-amber-500/30',
  },
  CRITICAL: {
    tier: 'CRITICAL',
    minScore: 0,
    maxScore: 39,
    labelKey: 'common.tierCritical',
    defaultLabel: 'Critical Exposure',
    colorClass: 'text-rose-400',
    badgeVariant: 'danger',
    bgGradient: 'from-rose-500/20 to-red-500/10',
    borderColor: 'border-rose-500/30',
  },
};

/**
 * Authoritative mapping of numerical privacy score (0-100) to PrivacyScoreTier.
 * Standardizes tier classification across all pages and services.
 */
export function getScoreTierFromScore(score: number): PrivacyScoreTier {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  if (clamped < 40) return 'CRITICAL';
  if (clamped < 70) return 'MODERATE';
  if (clamped < 85) return 'GOOD';
  return 'EXCELLENT';
}

/**
 * Returns complete standardized tier display metadata.
 */
export function getScoreTierConfig(scoreOrTier: number | PrivacyScoreTier): ScoreTierConfig {
  const tier = typeof scoreOrTier === 'number' ? getScoreTierFromScore(scoreOrTier) : scoreOrTier;
  return SCORE_TIER_CONFIGS[tier] || SCORE_TIER_CONFIGS.GOOD;
}
