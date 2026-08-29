import type { PrivacyScoreAnalysis } from '@packages/api-contract';
import type { UnifiedRiskItem, UnifiedRiskSummary, RiskSeverity, RiskConfidence } from '../types';

export function calculateCentralizedSeverity(_factorId: string, _category?: string, declaredSeverity?: string): RiskSeverity {
  if (declaredSeverity && ['critical','high','medium','low'].includes(declaredSeverity)) return declaredSeverity as RiskSeverity;
  return 'medium';
}

export function aggregateUnifiedRisks(params: { privacyAnalysis: PrivacyScoreAnalysis | null }): { risks: UnifiedRiskItem[]; summary: UnifiedRiskSummary } {
  const risksMap = new Map<string, UnifiedRiskItem>();
  for (const factor of params.privacyAnalysis?.factors || []) {
    if (!(factor.available && factor.detected && factor.points < 0 && factor.evidenceState === 'CONFIRMED')) continue;
    const source: 'browser'|'network'|'headers' = factor.category === 'NETWORK' || factor.source === 'ip' ? 'network' : factor.category === 'HEADERS' || factor.source === 'headers' ? 'headers' : 'browser';
    const confidence: RiskConfidence = factor.confidence || 'LOW';
    const scoreImpact = Math.abs(factor.points);
    risksMap.set(factor.id, {
      id: `factor_${factor.id}`,
      title: factor.name,
      source,
      severity: calculateCentralizedSeverity(factor.id, factor.category, factor.severity),
      scoreImpact,
      evidence: factor.currentValue == null ? factor.reason : String(factor.currentValue),
      impact: factor.reason,
      solution: factor.recommendation || 'Apply the recommended safeguard and run the audit again.',
      remediationActor: source === 'network' ? 'NETWORK/PROVIDER CONFIGURATION' : source === 'headers' ? 'BROWSER SETTING' : 'DIRECT USER ACTION',
      confidence,
      category: factor.category,
      anchorRoute: source === 'browser' ? '/browser' : source === 'headers' ? '/headers' : '/',
      evidenceState: factor.evidenceState,
      provenance: factor.provenance,
    });
  }
  const risks = Array.from(risksMap.values()).sort((a,b) => {
    const rank: Record<RiskSeverity, number> = { critical:4, high:3, medium:2, low:1 };
    return rank[b.severity] - rank[a.severity] || b.scoreImpact - a.scoreImpact;
  });
  return { risks, summary: {
    total: risks.length,
    critical: risks.filter(r => r.severity === 'critical').length,
    high: risks.filter(r => r.severity === 'high').length,
    medium: risks.filter(r => r.severity === 'medium').length,
    low: risks.filter(r => r.severity === 'low').length,
    bySource: {
      browser: risks.filter(r => r.source === 'browser').length,
      network: risks.filter(r => r.source === 'network').length,
      headers: risks.filter(r => r.source === 'headers').length,
    },
  }};
}
