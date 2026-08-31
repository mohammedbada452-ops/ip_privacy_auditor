import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { apiClient } from '@packages/api-client';
import { browserOrchestrator } from '../features/browser/orchestrator/BrowserOrchestrator';
import type {
  IpCheckResponse,
  IpDetailsResponse,
  IpNetworkIntelligenceResponse,
  PrivacyScoreAnalysis,
} from '@packages/api-contract';
import type { BrowserProfile, WebRtcData } from '../features/browser/types';
import type { HeadersAnalysisResponse } from '../features/headers/types';
import type {
  StageStep,
  ScanStage,
  TimelineStageItem,
  StageTimingMetrics,
  ScoreHistoryEntry,
} from '../features/home/types';
import type {
  ScanSnapshot,
  UnifiedScanContextValue,
  SubsystemStatus,
} from '../types/scan';
import { aggregateUnifiedRisks } from '../features/home/utils/problemAggregator';
import { generateSmartRecommendations } from '../features/home/utils/recommendationEngine';
import { generateRemediationFindings } from '../features/home/utils/remediationEngine';
import { diffScanAnalyses } from '../features/home/utils/scanDiff';
import {
  getScoreHistory,
  saveScoreHistoryEntry,
  clearScoreHistory,
} from '../features/home/utils/historyStorage';

const UnifiedScanContext = createContext<UnifiedScanContextValue | null>(null);

export const UnifiedScanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentSnapshot, setCurrentSnapshot] = useState<ScanSnapshot | null>(null);
  const [previousSnapshot, setPreviousSnapshot] = useState<ScanSnapshot | null>(null);
  const [history, setHistory] = useState<ScoreHistoryEntry[]>(() => getScoreHistory());

  const [stage, setStage] = useState<ScanStage>('IDLE');
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [isRechecking, setIsRechecking] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [scoreDelta, setScoreDelta] = useState<number | null>(null);
  const [previousScore, setPreviousScore] = useState<number | null>(null);
  const [isPartial, setIsPartial] = useState<boolean>(false);
  const [partialReason, setPartialReason] = useState<string | null>(null);

  const [steps, setSteps] = useState<StageStep[]>([
    { id: 'ip', labelKey: 'home.scanStages.ip', status: 'pending' },
    { id: 'browser', labelKey: 'home.scanStages.browser', status: 'pending' },
    { id: 'headers', labelKey: 'home.scanStages.headers', status: 'pending' },
    { id: 'evaluating', labelKey: 'home.scanStages.evaluating', status: 'pending' },
  ]);

  const hasStartedInitialScan = useRef<boolean>(false);
  const isExecutingScanRef = useRef<boolean>(false);
  const scanRunIdRef = useRef<number>(0);
  const latestSnapshotRef = useRef<ScanSnapshot | null>(null);

  // Synchronize ref
  useEffect(() => {
    latestSnapshotRef.current = currentSnapshot;
  }, [currentSnapshot]);

  const runFullAudit = useCallback(async (isRecheck = false): Promise<ScanSnapshot | null> => {
    // Generate unique run ID to avoid race conditions
    scanRunIdRef.current += 1;
    const runId = scanRunIdRef.current;
    isExecutingScanRef.current = true;

    const scanStartTimestamp = performance.now();
    const uniqueScanId = `scan_${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`}`;
    const scanEpochTimestamp = Date.now();

    // Prepare steps
    setSteps([
      { id: 'ip', labelKey: 'home.scanStages.ip', status: 'active' },
      { id: 'browser', labelKey: 'home.scanStages.browser', status: 'pending' },
      { id: 'headers', labelKey: 'home.scanStages.headers', status: 'pending' },
      { id: 'evaluating', labelKey: 'home.scanStages.evaluating', status: 'pending' },
    ]);

    setStage('COLLECTING_IP');
    setIsScanning(!isRecheck);
    setIsRechecking(isRecheck);
    setError(null);

    let ipCheckRes: IpCheckResponse | null = null;
    let ipDetailsRes: IpDetailsResponse | null = null;
    let networkIntelligenceRes: IpNetworkIntelligenceResponse | null = null;
    let browserProfileRes: BrowserProfile | null = null;
    let headersRes: HeadersAnalysisResponse | null = null;
    let partialDetected = false;
    let localPartialReason: string | null = null;

    let networkDuration = 0;
    let browserDuration = 0;
    let headersDuration = 0;
    let scoringDuration = 0;

    let networkStatus: SubsystemStatus = 'COMPLETE';
    let browserStatus: SubsystemStatus = 'COMPLETE';
    let headersStatus: SubsystemStatus = 'COMPLETE';
    let failedCollectors: string[] = [];

    try {
      // -------------------------------------------------------------
      // Step 1: Collect IP & Network details
      // -------------------------------------------------------------
      const netStart = performance.now();
      try {
        const [ipCheck, ipDetails, networkIntelligence] = await Promise.all([
          apiClient.getIp(),
          apiClient.getIpDetails().catch(() => null),
          apiClient.getIpNetworkIntelligence().catch(() => null),
        ]);
        ipCheckRes = ipCheck;
        ipDetailsRes = ipDetails;
        networkIntelligenceRes = networkIntelligence;
        networkDuration = Math.round(performance.now() - netStart);
        networkStatus = ipCheck ? 'COMPLETE' : 'PARTIAL';

        if (scanRunIdRef.current === runId) {
          setSteps((prev) =>
            prev.map((s) => (s.id === 'ip' ? { ...s, status: 'complete', durationMs: networkDuration } : s))
          );
        }
      } catch (err) {
        console.warn('IP collection encountered an issue:', err);
        networkDuration = Math.round(performance.now() - netStart);
        networkStatus = 'UNAVAILABLE';
        partialDetected = true;
        localPartialReason = 'IP intelligence service unavailable';
        if (scanRunIdRef.current === runId) {
          setSteps((prev) =>
            prev.map((s) => (s.id === 'ip' ? { ...s, status: 'warning', durationMs: networkDuration } : s))
          );
        }
      }

      // -------------------------------------------------------------
      // Step 2: Collect Browser Signals
      // -------------------------------------------------------------
      if (scanRunIdRef.current === runId) {
        setStage('COLLECTING_BROWSER');
        setSteps((prev) =>
          prev.map((s) => (s.id === 'browser' ? { ...s, status: 'active' } : s))
        );
      }

      const browserStart = performance.now();
      try {
        browserProfileRes = await browserOrchestrator.collectAll();
        browserDuration = Math.round(performance.now() - browserStart);
        failedCollectors = Object.entries(browserProfileRes.collectorStatuses || {})
          .filter(([_, st]) => st === 'ERROR' || st === 'TIMEOUT' || st === 'BLOCKED')
          .map(([name]) => name);

        browserStatus = failedCollectors.length > 0 ? 'PARTIAL' : 'COMPLETE';

        if (scanRunIdRef.current === runId) {
          setSteps((prev) =>
            prev.map((s) => (s.id === 'browser' ? { ...s, status: 'complete', durationMs: browserDuration } : s))
          );
        }
      } catch (err) {
        console.warn('Browser intelligence collection issue:', err);
        browserDuration = Math.round(performance.now() - browserStart);
        browserStatus = 'UNAVAILABLE';
        partialDetected = true;
        localPartialReason = localPartialReason || 'Browser signals partially unavailable';
        if (scanRunIdRef.current === runId) {
          setSteps((prev) =>
            prev.map((s) => (s.id === 'browser' ? { ...s, status: 'warning', durationMs: browserDuration } : s))
          );
        }
      }

      // -------------------------------------------------------------
      // Step 3: Collect HTTP Headers
      // -------------------------------------------------------------
      if (scanRunIdRef.current === runId) {
        setStage('COLLECTING_HEADERS');
        setSteps((prev) =>
          prev.map((s) => (s.id === 'headers' ? { ...s, status: 'active' } : s))
        );
      }

      const headersStart = performance.now();
      try {
        headersRes = await apiClient.getHeaders();
        headersDuration = Math.round(performance.now() - headersStart);
        headersStatus = 'COMPLETE';

        if (scanRunIdRef.current === runId) {
          setSteps((prev) =>
            prev.map((s) => (s.id === 'headers' ? { ...s, status: 'complete', durationMs: headersDuration } : s))
          );
        }
      } catch (err) {
        console.warn('Headers collection issue:', err);
        headersDuration = Math.round(performance.now() - headersStart);
        headersStatus = 'UNAVAILABLE';
        partialDetected = true;
        localPartialReason = localPartialReason || 'HTTP headers collection unavailable';
        if (scanRunIdRef.current === runId) {
          setSteps((prev) =>
            prev.map((s) => (s.id === 'headers' ? { ...s, status: 'warning', durationMs: headersDuration } : s))
          );
        }
      }

      // -------------------------------------------------------------
      // Step 4: Evaluate with Privacy Engine
      // -------------------------------------------------------------
      if (scanRunIdRef.current === runId) {
        setStage('EVALUATING');
        setSteps((prev) =>
          prev.map((s) => (s.id === 'evaluating' ? { ...s, status: 'active' } : s))
        );
      }

      const scoringStart = performance.now();
      let analysis: PrivacyScoreAnalysis;

      if (browserProfileRes && browserProfileRes.fingerprintPayload) {
        analysis = await apiClient.analyzeBrowser({
          fingerprint: browserProfileRes.fingerprintPayload,
        });
      } else {
        analysis = await apiClient.getPrivacyScore();
      }

      scoringDuration = Math.round(performance.now() - scoringStart);

      // Verify concurrency: If a newer scan was started, drop this result safely
      if (scanRunIdRef.current !== runId) {
        return null;
      }

      setSteps((prev) =>
        prev.map((s) => (s.id === 'evaluating' ? { ...s, status: 'complete', durationMs: scoringDuration } : s))
      );

      const totalDuration = Math.round(performance.now() - scanStartTimestamp);
      const timingMetrics: StageTimingMetrics = {
        networkDurationMs: networkDuration,
        browserDurationMs: browserDuration,
        headersDurationMs: headersDuration,
        scoringDurationMs: scoringDuration,
        totalDurationMs: totalDuration,
      };

      // Aggregate unified risks
      const { risks: unifiedRisks, summary: riskSummary } = aggregateUnifiedRisks({ privacyAnalysis: analysis });

      // Generate smart recommendations
      const recommendations = generateSmartRecommendations(unifiedRisks);

      // Generate remediation center findings & consistency observations
      const previousAnalysis = latestSnapshotRef.current?.privacyAnalysis ?? null;
      void diffScanAnalyses(previousAnalysis, analysis);
      const {
        findings: remediationFindings,
        summary: remediationSummary,
        consistencyObservations,
      } = generateRemediationFindings({
        privacyAnalysis: analysis,
        previousAnalysis,
        ipCheck: ipCheckRes,
        ipDetails: ipDetailsRes,
        browserProfile: browserProfileRes,
        headersData: headersRes,
      });

      // Build Timeline Stages
      const webrtcGroup = browserProfileRes?.groups?.WEBRTC?.data as WebRtcData | undefined;
      const canvasHash = browserProfileRes?.fingerprintPayload?.canvasHash;
      const fpWebgl = browserProfileRes?.fingerprintPayload?.webgl;

      const timelineStages: TimelineStageItem[] = [
        {
          id: 'network',
          titleKey: 'home.timeline.networkStageTitle',
          status: !ipCheckRes
            ? 'unavailable'
            : riskSummary.bySource.network > 0
              ? 'issue_found'
              : 'completed',
          durationMs: networkDuration,
          summary: ipCheckRes
            ? `${ipCheckRes.ip} (${ipCheckRes.observationScope || ipCheckRes.classification || 'UNKNOWN'}, ${ipCheckRes.observationSource || ipCheckRes.ipSource || 'SERVER_OBSERVED'})`
            : 'Network endpoint unreachable',
          details: [
            ipCheckRes ? ((ipCheckRes.observationScope || ipCheckRes.classification) === 'PUBLIC' ? 'Public address observed by the server' : `${ipCheckRes.observationScope || ipCheckRes.classification || 'UNKNOWN'} address observed`) : 'Address unavailable',
            ipDetailsRes?.network?.isp ? `ISP: ${ipDetailsRes.network.isp}` : 'Network provider intelligence unavailable',
            ipDetailsRes?.network?.isProxy ? 'Proxy / Intermediary active' : ipDetailsRes?.network?.isProxy === null ? 'Proxy status unavailable' : 'No transparent proxy confirmed',
          ],
          findingsCount: ipDetailsRes ? 3 : 1,
          risksCount: riskSummary.bySource.network,
        },
        {
          id: 'browser',
          titleKey: 'home.timeline.browserStageTitle',
          status: !browserProfileRes
            ? 'unavailable'
            : riskSummary.bySource.browser > 0
              ? 'issue_found'
              : 'completed',
          durationMs: browserDuration,
          summary: browserProfileRes
            ? `${browserProfileRes.summary?.totalSignalsEvaluated || 18} hardware signals audited`
            : 'Browser probes blocked',
          details: [
            canvasHash && canvasHash !== 'Unavailable' ? 'Canvas 2D signature observed' : 'Canvas not measured',
            fpWebgl?.renderer && fpWebgl.renderer !== 'Unavailable' ? `GPU: ${fpWebgl.renderer.slice(0, 30)}` : 'WebGL Not measured',
            !webrtcGroup ? 'WebRTC exposure check unavailable' : webrtcGroup.localIps?.length ? 'Local WebRTC candidate exposure observed' : 'No local WebRTC address exposure observed',
          ],
          findingsCount: browserProfileRes?.summary?.totalSignalsEvaluated || 0,
          risksCount: riskSummary.bySource.browser,
        },
        {
          id: 'headers',
          titleKey: 'home.timeline.headersStageTitle',
          status: !headersRes
            ? 'unavailable'
            : riskSummary.bySource.headers > 0
              ? 'issue_found'
              : 'completed',
          durationMs: headersDuration,
          summary: headersRes
            ? `${headersRes.summary?.totalReceived || 0} HTTP headers evaluated`
            : 'HTTP transport analysis unavailable',
          details: [
            headersRes?.clientHintsAnalysis?.highEntropy?.length
              ? `${headersRes.clientHintsAnalysis.highEntropy.length} high-entropy client hints`
              : 'Standard entropy client hints',
            headersRes?.cookieSecurity?.isProtected ? 'Cookie identifiers masked' : 'Cookie security state unavailable',
            headersRes?.headers?.some((h) => h.canonicalName === 'Sec-GPC') ? 'Sec-GPC: 1 active' : 'Sec-GPC not observed',
          ],
          findingsCount: headersRes?.summary?.totalReceived || 0,
          risksCount: riskSummary.bySource.headers,
        },
        {
          id: 'scoring',
          titleKey: 'home.timeline.scoringStageTitle',
          status: 'completed',
          durationMs: scoringDuration,
          summary: `Privacy Score: ${analysis.privacyScore}/100 (${analysis.tier})${analysis.verificationStatus === 'PARTIAL' ? ' — verification incomplete' : ''}`,
          details: [
            `Deductions applied: ${analysis.deductions?.length || 0}`,
            `Risk factors tracked: ${analysis.factors?.length || 0}`,
            `Defensive score: ${analysis.privacyScore}%`,
          ],
          findingsCount: analysis.factors?.length || 0,
          risksCount: unifiedRisks.length,
        },
      ];

      // Save to localStorage history
      const label = isRecheck ? 'Audit Recheck' : 'Complete Audit';
      const activeTitles = unifiedRisks.filter((r) => r.evidenceState === 'CONFIRMED').map((r) => r.title);
      const updatedHistory = saveScoreHistoryEntry(
        analysis.privacyScore,
        analysis.tier,
        unifiedRisks.length,
        label,
        partialDetected,
        activeTitles,
        uniqueScanId,
        scanEpochTimestamp
      );

      // Construct immutable unified ScanSnapshot
      const effectivePartial = partialDetected || analysis.verificationStatus === 'PARTIAL';
      if (analysis.verificationStatus === 'PARTIAL' && !localPartialReason) {
        localPartialReason = analysis.scoreDisclaimer || 'One or more audit checks could not be verified.';
      }
      const newSnapshot: ScanSnapshot = {
        scanId: uniqueScanId,
        timestamp: scanEpochTimestamp,
        network: {
          ipCheck: ipCheckRes,
          ipDetails: ipDetailsRes,
          intelligence: networkIntelligenceRes,
          durationMs: networkDuration,
          status: networkStatus,
        },
        browser: {
          profile: browserProfileRes,
          durationMs: browserDuration,
          failedCollectors,
          status: browserStatus,
        },
        headers: {
          data: headersRes,
          durationMs: headersDuration,
          status: headersStatus,
        },
        privacyAnalysis: analysis,
        deductions: analysis.deductions || [],
        factors: analysis.factors || [],
        unifiedRisks,
        riskSummary,
        recommendations,
        remediationFindings,
        remediationSummary,
        consistencyObservations,
        timelineStages,
        timingMetrics,
        status: effectivePartial ? 'PARTIAL' : 'COMPLETE',
        isPartial: effectivePartial,
        partialReason: localPartialReason,
        error: null,
      };

      const prevScore = latestSnapshotRef.current?.privacyAnalysis?.privacyScore ?? null;
      const currentScoreVal = analysis.privacyScore;
      const delta = prevScore !== null ? currentScoreVal - prevScore : null;

      // Update state atomically
      if (latestSnapshotRef.current) {
        setPreviousSnapshot(latestSnapshotRef.current);
      }
      setCurrentSnapshot(newSnapshot);
      setHistory(updatedHistory);
      setPreviousScore(prevScore);
      setScoreDelta(delta);
      setStage(effectivePartial ? 'PARTIAL' : 'COMPLETE');
      setIsScanning(false);
      setIsRechecking(false);
      setIsPartial(effectivePartial);
      setPartialReason(localPartialReason);

      return newSnapshot;
    } catch (err: unknown) {
      console.error('Unified Privacy Scan error:', err);
      if (scanRunIdRef.current !== runId) return null;

      const msg = err instanceof Error ? err.message : 'Privacy analysis failed';

      setSteps((prev) =>
        prev.map((s) => (s.status === 'active' ? { ...s, status: 'error' } : s))
      );

      setStage('ERROR');
      setIsScanning(false);
      setIsRechecking(false);
      setError(msg);
      return null;
    } finally {
      isExecutingScanRef.current = false;
    }
  }, []);

  // Run initial full audit on application boot
  useEffect(() => {
    if (!hasStartedInitialScan.current) {
      hasStartedInitialScan.current = true;
      runFullAudit(false);
    }
  }, [runFullAudit]);

  // Explicit recheck actions
  const recheckSignals = useCallback(async (): Promise<ScanSnapshot | null> => {
    return runFullAudit(true);
  }, [runFullAudit]);

  const recheckHeaders = useCallback(async (): Promise<ScanSnapshot | null> => {
    return runFullAudit(true);
  }, [runFullAudit]);

  const recheckFinding = useCallback(async (_findingId: string): Promise<ScanSnapshot | null> => {
    return runFullAudit(true);
  }, [runFullAudit]);

  const handleClearHistory = useCallback(() => {
    clearScoreHistory();
    setHistory([]);
  }, []);

  const dismissComparison = useCallback(() => {
    setPreviousSnapshot(null);
    setScoreDelta(null);
  }, []);

  const value: UnifiedScanContextValue = {
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
    recheckSignals,
    recheckHeaders,
    recheckFinding,
    clearHistory: handleClearHistory,
    dismissComparison,
  };

  return (
    <UnifiedScanContext.Provider value={value}>
      {children}
    </UnifiedScanContext.Provider>
  );
};

export function useUnifiedScan(): UnifiedScanContextValue {
  const context = useContext(UnifiedScanContext);
  if (!context) {
    throw new Error('useUnifiedScan must be used within a UnifiedScanProvider');
  }
  return context;
}
