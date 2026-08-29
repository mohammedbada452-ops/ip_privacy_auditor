import type {
  HeaderCategory,
  HeaderPrivacyStatus,
  HeaderPrivacySeverity,
  HeaderItem,
  MissingHeaderItem,
  HeaderSummaryStats,
  HeadersAnalysisResponse,
  HeaderScoreFactor,
  HeaderProblem,
  HeaderRemediationActor,
  HeaderCookieSecurity,
  HeaderClientHintItem,
  HeaderClientHintsAnalysis,
  PrivacyScoreTier,
} from '@packages/api-contract';

export type { RawHeaderEntry } from './HeaderCollector';

export type {
  HeaderCategory,
  HeaderPrivacyStatus,
  HeaderPrivacySeverity,
  HeaderItem,
  MissingHeaderItem,
  HeaderSummaryStats,
  HeadersAnalysisResponse,
  HeaderScoreFactor,
  HeaderProblem,
  HeaderRemediationActor,
  HeaderCookieSecurity,
  HeaderClientHintItem,
  HeaderClientHintsAnalysis,
  PrivacyScoreTier,
};

export type HeaderPrivacyTier = PrivacyScoreTier;

export interface HeaderDefinition {
  canonicalName: string;
  category: HeaderCategory;
  description: string;
  privacyImpact: string;
  defaultStatus: HeaderPrivacyStatus;
  severity: HeaderPrivacySeverity;
  riskPoints: number;
  recommendation?: string;
  isSensitive?: boolean;
  isStandard?: boolean;
  isClientHint?: boolean;
  isProxyHeader?: boolean;
  isPrivacyControl?: boolean;
  customEvaluator?: (value: string, allHeaders: Record<string, string>) => Partial<HeaderItem>;
}

export interface MissingHeaderDefinition {
  canonicalName: string;
  category: HeaderCategory;
  importance: 'recommended' | 'optional' | 'informative';
  description: string;
  purpose: string;
  recommendation: string;
  benefit: string;
  checkCondition: (headers: Record<string, string>) => boolean;
}
