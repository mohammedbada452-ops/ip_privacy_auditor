import type {
  IpCheckResponse,
  IpDetailsResponse,
  IpNetworkIntelligenceResponse,
  PrivacyScoreAnalysis,
  PrivacyFactor,
  PrivacyScoreTier,
} from '@packages/api-contract';
import type { BrowserProfile, WebRtcData } from '../browser/types';
import type { HeadersAnalysisResponse } from '../headers/types';

export type { PrivacyScoreTier, BrowserProfile, WebRtcData };

export interface PlatformContext {
  browserFamily: 'CHROME' | 'FIREFOX' | 'SAFARI' | 'EDGE' | 'BRAVE' | 'OTHER';
  browserName: string;
  osFamily: 'MACOS' | 'WINDOWS' | 'LINUX' | 'ANDROID' | 'IOS' | 'OTHER';
  osName: string;
  isMobile: boolean;
}

export type ScanStage =
  | 'IDLE'
  | 'COLLECTING_IP'
  | 'COLLECTING_BROWSER'
  | 'COLLECTING_HEADERS'
  | 'EVALUATING'
  | 'COMPLETE'
  | 'PARTIAL'
  | 'ERROR';

export type StageProgressStatus = 'pending' | 'active' | 'complete' | 'warning' | 'error';

export interface StageStep {
  id: 'ip' | 'browser' | 'headers' | 'evaluating';
  labelKey: string;
  status: StageProgressStatus;
  durationMs?: number;
}

export type TimelineStageStatus = 'completed' | 'warning' | 'issue_found' | 'unavailable' | 'running' | 'pending';

export interface TimelineStageItem {
  id: 'network' | 'browser' | 'headers' | 'scoring';
  titleKey: string;
  status: TimelineStageStatus;
  durationMs: number;
  summary: string;
  details: string[];
  findingsCount: number;
  risksCount: number;
}

export type RiskSource = 'browser' | 'network' | 'headers';
export type RiskSeverity = 'critical' | 'high' | 'medium' | 'low';
export type RiskConfidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type ConfidenceRating = 'HIGH' | 'MEDIUM' | 'LOW';

export interface UnifiedRiskItem {
  id: string;
  title: string;
  source: RiskSource;
  severity: RiskSeverity;
  scoreImpact: number;
  evidence: string;
  impact: string;
  solution: string;
  remediationActor: string;
  confidence?: RiskConfidence;
  category?: string;
  anchorRoute?: string;
  evidenceState?: 'CONFIRMED' | 'NOT_DETECTED' | 'UNKNOWN' | 'UNAVAILABLE';
  provenance?: 'server_observed' | 'client_observed_unverified' | 'derived' | 'provider_observed';
}

export interface UnifiedRiskSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  bySource: {
    browser: number;
    network: number;
    headers: number;
  };
}

export type FindingCategory = 'NETWORK' | 'BROWSER' | 'HEADERS' | 'PRIVACY_CONTROLS';

export type ResponsibleActor =
  | 'USER'
  | 'BROWSER'
  | 'DEVICE'
  | 'NETWORK'
  | 'ISP'
  | 'WEBSITE'
  | 'SERVER'
  | 'HOSTING_PROVIDER'
  | 'UNAVAILABLE'
  | 'EDUCATIONAL';

export type ActionabilityType =
  | 'ACTIONABLE_NOW'
  | 'ACTIONABLE_BROWSER'
  | 'ACTIONABLE_DEVICE'
  | 'ACTIONABLE_NETWORK'
  | 'ACTIONABLE_WEBSITE'
  | 'ACTIONABLE_HOSTING'
  | 'EDUCATIONAL_ONLY'
  | 'NOT_ACTIONABLE'
  | 'UNKNOWN';

export type RemediationConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export type ResolutionState =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'UNCHANGED'
  | 'IMPROVED'
  | 'WORSENED'
  | 'UNAVAILABLE'
  | 'NOT_VERIFIABLE';

export interface RemediationStep {
  stepNumber: number;
  title: string;
  instruction: string;
  codeSnippet?: string;
  platform?: string;
}

export interface RemediationFinding {
  id: string;
  title: string;
  category: FindingCategory;
  severity: RiskSeverity;
  confidence: RiskConfidence;
  detectionConfidence?: RiskConfidence;
  remediationConfidence: RemediationConfidence;
  status: ResolutionState;
  scoreImpact: number;
  potentialRecoveryPts: number;
  responsibleActor: ResponsibleActor;
  actionability: ActionabilityType;
  evidence: string;
  impactExplanation: string;
  expectedOutcome: string;
  steps: RemediationStep[];
  affectedFactorIds: string[];
  isMultiFactor: boolean;
  isInfrastructure: boolean;
  anchorRoute?: string;
  targetAnchor?: string;
  deepDiveLabel?: string;
  platformAwareTag?: string;
}

export interface RemediationSummary {
  total: number;
  actionable: number;
  infrastructureControlled: number;
  educational: number;
  unavailable: number;
  resolvedCount: number;
  byCategory: {
    network: number;
    browser: number;
    headers: number;
    privacyControls: number;
  };
}

export interface ConsistencyObservation {
  id: string;
  type: 'TIMEZONE' | 'LANGUAGE';
  title: string;
  status: 'MATCH' | 'MISMATCH' | 'UNAVAILABLE';
  networkValue: string;
  browserValue: string;
  explanation: string;
  privacyRelevance: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface RecommendationFixItem {
  id: string;
  title: string;
  description?: string;
  expectedImprovementPts: number;
  actor: 'BROWSER SETTING' | 'NETWORK/VPN' | 'HEADER/EXTENSION' | 'USER ACTION';
}

export interface SmartRecommendation {
  id: string;
  title: string;
  description: string;
  sourceCategory: 'browser' | 'network' | 'headers' | 'composite';
  priority: 'high' | 'medium' | 'low';
  estimatedScoreBoost: number;
  steps: string[];
  fixes?: RecommendationFixItem[];
  actionLabel?: string;
  targetAnchor?: string;
  targetRoute?: string;
}

export interface ScoreHistoryEntry {
  id: string;
  timestamp: number;
  score: number;
  previousScore?: number;
  tier: PrivacyScoreTier;
  issuesCount: number;
  label: string;
  isPartial: boolean;
  scoreDelta?: number;
  fixedIssues?: string[];
  remainingIssues?: string[];
  newIssues?: string[];
}

export interface StageTimingMetrics {
  networkDurationMs: number;
  browserDurationMs: number;
  headersDurationMs: number;
  scoringDurationMs: number;
  totalDurationMs: number;
}

export interface HomepagePrivacyData {
  ipCheck: IpCheckResponse | null;
  ipDetails: IpDetailsResponse | null;
  /** Additive multi-provider cross-check; never used to alter the canonical privacy score. */
  networkIntelligence: IpNetworkIntelligenceResponse | null;
  browserProfile: BrowserProfile | null;
  headersData: HeadersAnalysisResponse | null;
  privacyAnalysis: PrivacyScoreAnalysis | null;
  previousAnalysis: PrivacyScoreAnalysis | null;
  previousScore: number | null;
  scoreDelta: number | null;
  stage: ScanStage;
  isScanning: boolean;
  isRechecking: boolean;
  error: string | null;
  isPartial: boolean;
  partialReason: string | null;
  scanTimestamp: number | null;
  timingMetrics: StageTimingMetrics;
  timelineStages: TimelineStageItem[];
  unifiedRisks: UnifiedRiskItem[];
  riskSummary: UnifiedRiskSummary;
  recommendations: SmartRecommendation[];
  remediationFindings: RemediationFinding[];
  remediationSummary: RemediationSummary;
  consistencyObservations: ConsistencyObservation[];
  history: ScoreHistoryEntry[];
}

export interface RemediationFactorDetails {
  factor: PrivacyFactor;
  deductionPoints: number;
  guidanceText: string;
  actionType: 'browser_setting' | 'extension' | 'network_vpn' | 'informational' | 'deep_dive';
  targetRoute?: string;
}
