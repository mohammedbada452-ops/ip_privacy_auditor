/**
 * useBrowserIntelligence Hook
 * Consumes the authoritative UnifiedScanContext to ensure cross-page snapshot consistency.
 */

import { useMemo, useCallback } from 'react';
import { useUnifiedScan } from '../../../context/UnifiedScanContext';
import type { BrowserProfile } from '../types';
import type { PrivacyScoreAnalysis } from '@packages/api-contract';

export interface UseBrowserIntelligenceState {
  isScanning: boolean;
  isAnalyzing: boolean;
  isRechecking: boolean;
  profile: BrowserProfile | null;
  privacyAnalysis: PrivacyScoreAnalysis | null;
  previousProfile: BrowserProfile | null;
  previousAnalysis: PrivacyScoreAnalysis | null;
  failedCollectors: string[];
  error: string | null;
  scanId: string | null;
}

export function useBrowserIntelligence() {
  const {
    currentSnapshot,
    previousSnapshot,
    stage,
    isScanning,
    isRechecking,
    error,
    runFullAudit,
    dismissComparison,
  } = useUnifiedScan();

  const state: UseBrowserIntelligenceState = useMemo(() => {
    const profile = currentSnapshot?.browser?.profile ?? null;
    const privacyAnalysis = currentSnapshot?.privacyAnalysis ?? null;
    const previousProfile = previousSnapshot?.browser?.profile ?? null;
    const previousAnalysis = previousSnapshot?.privacyAnalysis ?? null;
    const failedCollectors = currentSnapshot?.browser?.failedCollectors ?? [];

    const isAnalyzing = isScanning && stage === 'EVALUATING';
    const isActuallyScanning = isScanning && stage !== 'EVALUATING';

    return {
      isScanning: isActuallyScanning,
      isAnalyzing,
      isRechecking,
      profile,
      privacyAnalysis,
      previousProfile,
      previousAnalysis,
      failedCollectors,
      error,
      scanId: currentSnapshot?.scanId ?? null,
    };
  }, [currentSnapshot, previousSnapshot, stage, isScanning, isRechecking, error]);

  const scanAndAnalyze = useCallback(
    async (isRecheck = false) => {
      const snapshot = await runFullAudit(isRecheck);
      if (snapshot) {
        return {
          profile: snapshot.browser.profile,
          analysis: snapshot.privacyAnalysis,
        };
      }
      return null;
    },
    [runFullAudit]
  );

  return {
    ...state,
    scanAndAnalyze,
    clearComparison: dismissComparison,
  };
}
