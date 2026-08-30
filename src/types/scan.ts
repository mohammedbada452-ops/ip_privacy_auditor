import type {
  IpCheckResponse,
  IpDetailsResponse,
  IpNetworkIntelligenceResponse,
  PrivacyScoreAnalysis,
  PrivacyDeduction,
  PrivacyFactor,
  PrivacyScoreTier,
} from '@packages/api-contract';
import type { BrowserProfile } from '../features/browser/types';
import type { HeadersAnalysisResponse } from '../features/headers/types';
import type {
  UnifiedRiskItem,
  UnifiedRiskSummary,
  SmartRecommendation,
  RemediationFinding,
  RemediationSummary,
  ConsistencyObservation,
  TimelineStageItem,
  StageTimingMetrics,
  ScoreHistoryEntry,
  ScanStage,
  StageStep,
} from '../features/home/types';

export type ScanStatus = 'IDLE' | 'SCANNING' | 'COMPLETE' | 'PARTIAL' | 'ERROR';

export type SubsystemStatus = 'COMPLETE' | 'PARTIAL' | 'ERROR' | 'UNAVAILABLE';

export interface NetworkSubsystemSnapshot {
  ipCheck: IpCheckResponse | null;
  ipDetails: IpDetailsResponse | null;
  /** Additive multi-provider cross-check; never used to alter the canonical privacy score. */
  intelligence: IpNetworkIntelligenceResponse | null;
  durationMs: number;
  status: SubsystemStatus;
}

export interface BrowserSubsystemSnapshot {
  profile: BrowserProfile | null;
  durationMs: number;
  failedCollectors: string[];
  status: SubsystemStatus;
}

export interface HeadersSubsystemSnapshot {
  data: HeadersAnalysisResponse | null;
  durationMs: number;
  status: SubsystemStatus;
}

/**
 * Authoritative immutable audit snapshot.
 * Each complete audit run produces exactly one unified ScanSnapshot instance with a unique scanId.
 */
export interface ScanSnapshot {
  scanId: string;
  timestamp: number;
  network: NetworkSubsystemSnapshot;
  browser: BrowserSubsystemSnapshot;
  headers: HeadersSubsystemSnapshot;
  privacyAnalysis: PrivacyScoreAnalysis | null;
  deductions: PrivacyDeduction[];
  factors: PrivacyFactor[];
  unifiedRisks: UnifiedRiskItem[];
  riskSummary: UnifiedRiskSummary;
  recommendations: SmartRecommendation[];
  remediationFindings: RemediationFinding[];
  remediationSummary: RemediationSummary;
  consistencyObservations: ConsistencyObservation[];
  timelineStages: TimelineStageItem[];
  timingMetrics: StageTimingMetrics;
  status: ScanStatus;
  isPartial: boolean;
  partialReason: string | null;
  error: string | null;
}

export interface UnifiedScanContextValue {
  // Current authoritative scan snapshot
  currentSnapshot: ScanSnapshot | null;
  // Previous snapshot for comparison (if any)
  previousSnapshot: ScanSnapshot | null;
  // History of completed scan summaries
  history: ScoreHistoryEntry[];
  // Status flags
  stage: ScanStage;
  steps: StageStep[];
  isScanning: boolean;
  isRechecking: boolean;
  error: string | null;
  scoreDelta: number | null;
  previousScore: number | null;
  isPartial: boolean;
  partialReason: string | null;

  // Actions
  runFullAudit: (isRecheck?: boolean) => Promise<ScanSnapshot | null>;
  recheckSignals: () => Promise<ScanSnapshot | null>;
  recheckHeaders: () => Promise<ScanSnapshot | null>;
  recheckFinding: (findingId: string) => Promise<ScanSnapshot | null>;
  clearHistory: () => void;
  dismissComparison: () => void;
}
