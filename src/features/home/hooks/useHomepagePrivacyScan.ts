import { useMemo } from 'react';
import { useUnifiedScan } from '../../../context/UnifiedScanContext';
import type { HomepagePrivacyData, StageStep } from '../types';

export interface UseHomepagePrivacyScanResult extends HomepagePrivacyData {
  steps: StageStep[];
  scanId: string | null;
  recheck: () => Promise<void>;
  clearHistory: () => void;
}

export function useHomepagePrivacyScan(): UseHomepagePrivacyScanResult {
  const {
    currentSnapshot,
    previousSnapshot,
    history,
    stage,
    steps,
    isScanning,
    isRechecking,
    error,
    scoreDelta,
    previousScore,
    isPartial,
    partialReason,
    runFullAudit,
    clearHistory,
  } = useUnifiedScan();

  const data: HomepagePrivacyData = useMemo(() => {
    return {
      ipCheck: currentSnapshot?.network?.ipCheck ?? null,
      ipDetails: currentSnapshot?.network?.ipDetails ?? null,
      networkIntelligence: currentSnapshot?.network?.intelligence ?? null,
      browserProfile: currentSnapshot?.browser?.profile ?? null,
      headersData: currentSnapshot?.headers?.data ?? null,
      privacyAnalysis: currentSnapshot?.privacyAnalysis ?? null,
      previousAnalysis: previousSnapshot?.privacyAnalysis ?? null,
      previousScore: previousScore,
      scoreDelta: scoreDelta,
      stage: stage,
      isScanning: isScanning,
      isRechecking: isRechecking,
      error: error,
      isPartial: isPartial || (currentSnapshot?.isPartial ?? false),
      partialReason: partialReason || currentSnapshot?.partialReason || null,
      scanTimestamp: currentSnapshot?.timestamp ?? null,
      timingMetrics: currentSnapshot?.timingMetrics ?? {
        networkDurationMs: 0,
        browserDurationMs: 0,
        headersDurationMs: 0,
        scoringDurationMs: 0,
        totalDurationMs: 0,
      },
      timelineStages: currentSnapshot?.timelineStages ?? [],
      unifiedRisks: currentSnapshot?.unifiedRisks ?? [],
      riskSummary: currentSnapshot?.riskSummary ?? {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        bySource: { browser: 0, network: 0, headers: 0 },
      },
      recommendations: currentSnapshot?.recommendations ?? [],
      remediationFindings: currentSnapshot?.remediationFindings ?? [],
      remediationSummary: currentSnapshot?.remediationSummary ?? {
        total: 0,
        actionable: 0,
        infrastructureControlled: 0,
        educational: 0,
        unavailable: 0,
        resolvedCount: 0,
        byCategory: { network: 0, browser: 0, headers: 0, privacyControls: 0 },
      },
      consistencyObservations: currentSnapshot?.consistencyObservations ?? [],
      history: history,
    };
  }, [
    currentSnapshot,
    previousSnapshot,
    history,
    stage,
    isScanning,
    isRechecking,
    error,
    scoreDelta,
    previousScore,
    isPartial,
    partialReason,
  ]);

  const recheck = async () => {
    await runFullAudit(true);
  };

  return {
    ...data,
    scanId: currentSnapshot?.scanId ?? null,
    steps,
    recheck,
    clearHistory,
  };
}
