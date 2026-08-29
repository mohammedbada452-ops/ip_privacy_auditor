import type {
  HeaderItem,
  MissingHeaderItem,
  HeaderCategory,
  HeaderPrivacyStatus,
  HeaderPrivacySeverity,
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

export type {
  HeaderItem,
  MissingHeaderItem,
  HeaderCategory,
  HeaderPrivacyStatus,
  HeaderPrivacySeverity,
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

export type HeaderCategoryFilter = 'ALL' | HeaderCategory;

export type HeaderSortField = 'default' | 'name' | 'category' | 'severity' | 'status';
export type HeaderSortOrder = 'asc' | 'desc';

export interface HeaderFilterState {
  category: HeaderCategoryFilter;
  searchQuery: string;
  sortField: HeaderSortField;
  sortOrder: HeaderSortOrder;
  showOnlyRisks: boolean;
}
