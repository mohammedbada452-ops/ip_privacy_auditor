import type { PrivacyScoreAnalysis } from '@packages/api-contract';
import type { ScoreHistoryEntry, UnifiedRiskItem } from '../types';

export function buildShareReport(analysis: PrivacyScoreAnalysis, risks: UnifiedRiskItem[], history?: ScoreHistoryEntry[]): string {
  const confirmed = risks.filter((r) => r.evidenceState === 'CONFIRMED').slice(0, 8);
  const latest = history?.[0];
  const lines = [
    `PrivaSec Verified Privacy Audit — ${analysis.privacyScore}/100 (${analysis.tier})`,
    `Coverage: ${analysis.verificationCoveragePct ?? 0}% | Confidence: ${analysis.overallConfidence ?? 'LOW'}`,
    `Confirmed findings: ${confirmed.length}`,
    `Evidence: ${analysis.evidenceSummary?.confirmed ?? 0} confirmed, ${analysis.evidenceSummary?.unknown ?? 0} unknown, ${analysis.evidenceSummary?.unavailable ?? 0} unavailable`,
    latest?.scoreDelta != null ? `Change since previous audit: ${latest.scoreDelta > 0 ? '+' : ''}${latest.scoreDelta} points` : '',
    ...confirmed.map((r) => `• ${r.title} — ${r.severity.toUpperCase()} (-${r.scoreImpact})`),
    '',
    'No raw IP address, cookie, fingerprint hash, or admin token is included in this share report.',
  ];
  return lines.filter(Boolean).join('\n');
}

export async function shareOrCopyReport(report: string): Promise<'shared' | 'copied' | 'unsupported'> {
  try {
    if (navigator.share) {
      await navigator.share({ title: 'PrivaSec Privacy Audit', text: report });
      return 'shared';
    }
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(report);
      return 'copied';
    }
  } catch {
    return 'unsupported';
  }
  return 'unsupported';
}
