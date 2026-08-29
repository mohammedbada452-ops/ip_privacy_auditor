import type { PrivacyScoreAnalysis } from '@packages/api-contract';

export interface ScanDiffResult {
  scoreDelta: number;
  fixed: string[];
  newRisks: string[];
  unchanged: string[];
  changed: Array<{ id: string; name: string; beforePoints: number; afterPoints: number }>;
}

export function diffScanAnalyses(previous: PrivacyScoreAnalysis | null, current: PrivacyScoreAnalysis | null): ScanDiffResult {
  const before = new Map((previous?.factors || []).map((f) => [f.id, f]));
  const after = new Map((current?.factors || []).map((f) => [f.id, f]));
  const fixed: string[] = [];
  const newRisks: string[] = [];
  const unchanged: string[] = [];
  const changed: ScanDiffResult['changed'] = [];

  for (const [id, currentFactor] of after) {
    const previousFactor = before.get(id);
    const wasRisk = Boolean(previousFactor?.evidenceState === 'CONFIRMED' && previousFactor.detected && previousFactor.points < 0);
    const isRisk = Boolean(currentFactor.evidenceState === 'CONFIRMED' && currentFactor.detected && currentFactor.points < 0);
    if (!previousFactor && isRisk) {
      newRisks.push(currentFactor.name);
      continue;
    }
    if (previousFactor && wasRisk && !isRisk) {
      fixed.push(currentFactor.name);
      continue;
    }
    if (previousFactor && isRisk && wasRisk) {
      if (previousFactor.points !== currentFactor.points || previousFactor.evidenceState !== currentFactor.evidenceState) {
        changed.push({ id, name: currentFactor.name, beforePoints: previousFactor.points, afterPoints: currentFactor.points });
      } else {
        unchanged.push(currentFactor.name);
      }
    }
  }

  return {
    scoreDelta: current && previous ? current.privacyScore - previous.privacyScore : 0,
    fixed,
    newRisks,
    unchanged,
    changed,
  };
}
