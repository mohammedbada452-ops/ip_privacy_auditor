import type {
  PrivacyEngineInput,
  PrivacyFactor,
  PrivacyDeduction,
  PrivacyScoreBreakdown,
  PrivacyScoreTier,
  PrivacyScoreAnalysis,
} from './types';
import { FactorRegistry } from './factors/FactorRegistry';
import { finalizeEvidenceSummary, getEvidenceWeight, summarizeEvidence, type EvidenceItem } from './evidence';
import type { CanonicalCollectorResult, CanonicalCollectorStatus } from '@packages/api-contract';

export class PrivacyEngine {
  private registry: FactorRegistry;

  constructor(registry?: FactorRegistry) {
    this.registry = registry || new FactorRegistry();
  }

  public evaluate(input: PrivacyEngineInput): PrivacyScoreAnalysis {
    // 1. Evaluate all registered factors
    const factors = this.registry.evaluateAll(input).map((factor) => {
      const provenance = factor.provenance || (factor.source === 'browser' ? 'client_observed_unverified' : factor.source === 'ip' && input.ipDetails?.network?.providerStatus === 'VERIFIED' ? 'provider_observed' : factor.source === 'ip' || factor.source === 'headers' ? 'server_observed' : 'derived');
      const evidenceState = factor.evidenceState || (factor.available ? 'CONFIRMED' : 'UNAVAILABLE');
      const confidence = provenance === 'client_observed_unverified' && factor.confidence === 'HIGH' ? 'MEDIUM' : (factor.confidence || 'LOW');
      const classification = factor.classification || (factor.category === 'SECURITY' || factor.category === 'AUTOMATION' ? 'SECURITY' : factor.category === 'FINGERPRINT' ? 'FINGERPRINTING_SURFACE' : factor.category === 'HEADERS' ? 'PRIVACY_EXPOSURE' : 'INFORMATIONAL');
      const observed = evidenceState === 'CONFIRMED' || evidenceState === 'NOT_DETECTED';
      const scored = observed && evidenceState === 'CONFIRMED' && factor.points < 0;
      const scoreImpact = scored ? factor.points : 0;
      return {
        ...factor,
        points: scoreImpact,
        scoreImpact,
        provenance,
        evidenceState,
        confidence,
        classification,
        observed,
        scored,
        metadata: { ...(factor.metadata || {}), scoreEligible: scored, aggregateEligible: provenance !== 'client_observed_unverified' || scored },
      };
    });

    // 2. Negative points are legal only for confirmed evidence.
    const deductions: PrivacyDeduction[] = factors
      .filter((f) => f.scored && f.scoreImpact! < 0)
      .map((f) => ({
        id: f.id,
        category: f.category,
        factor: f.name,
        points: f.scoreImpact ?? 0,
        rawPoints: f.scoreImpact ?? 0,
        severity: f.severity,
        source: f.source,
        reason: f.reason,
        recommendation: f.recommendation,
        confidence: f.confidence || 'HIGH',
      }));

    // 3. Category points calculation
    let networkDeduction = 0;
    let headerDeduction = 0;
    let fingerprintDeduction = 0;
    let securityDeduction = 0;

    for (const factor of factors) {
      if (factor.scored && (factor.scoreImpact ?? 0) < 0) {
        switch (factor.category) {
          case 'NETWORK':
            networkDeduction += factor.points;
            break;
          case 'HEADERS':
            headerDeduction += factor.points;
            break;
          case 'FINGERPRINT':
            fingerprintDeduction += factor.points;
            break;
          case 'SECURITY':
          case 'AUTOMATION':
            securityDeduction += factor.points;
            break;
        }
      }
    }

    const networkScore = Math.max(0, Math.min(100, 100 + networkDeduction));
    const headerScore = Math.max(0, Math.min(100, 100 + headerDeduction));
    const fingerprintScore = Math.max(0, Math.min(100, 100 + fingerprintDeduction));
    const securityScore = Math.max(0, Math.min(100, 100 + securityDeduction));

    const breakdown: PrivacyScoreBreakdown = {
      networkScore,
      headerScore,
      fingerprintScore,
      securityScore,
    };

    // 4. Overall score calculation (bounded 0 to 100)
    const totalDeductions = deductions.reduce((sum, d) => sum + d.points, 0);
    const rawScore = 100 + totalDeductions;
    const privacyScore = Math.max(0, Math.min(100, rawScore));

    // 5. Tier classification
    let tier: PrivacyScoreTier = 'EXCELLENT';
    if (privacyScore < 40) {
      tier = 'CRITICAL';
    } else if (privacyScore < 70) {
      tier = 'MODERATE';
    } else if (privacyScore < 85) {
      tier = 'GOOD';
    } else {
      tier = 'EXCELLENT';
    }

    // 6. Canonical evidence inventory and verification completeness.
    const evidenceItems: EvidenceItem[] = factors.map((factor) => {
      const metadata = factor.metadata || {};
      const capabilityStatus = String(metadata.capabilityStatus || metadata.supportStatus || '').toUpperCase();
      const excludedFromCoverage = capabilityStatus === 'UNSUPPORTED' || metadata.unsupported === true;
      return {
        id: factor.id,
        state: factor.evidenceState || (factor.available ? 'CONFIRMED' : 'UNAVAILABLE'),
        provenance: factor.provenance || 'derived',
        confidence: factor.confidence || 'LOW',
        source: factor.source,
        value: factor.currentValue,
        explanation: factor.reason,
        weight: getEvidenceWeight({ source: factor.source, classification: factor.classification, metadata }),
        excludedFromCoverage,
        exclusionReason: excludedFromCoverage ? 'UNSUPPORTED' : undefined,
      };
    });
    const evidenceSummary = finalizeEvidenceSummary(summarizeEvidence(evidenceItems));
    const verificationCoveragePct = evidenceSummary.weightedCoveragePct;
    const verificationStatus: 'COMPLETE' | 'PARTIAL' = evidenceSummary.unknown === 0 && evidenceSummary.unavailable === 0 ? 'COMPLETE' : 'PARTIAL';
    // Confidence describes the quality of evidence that was actually assessable.
    // UNAVAILABLE / UNKNOWN checks affect coverage, not confidence, because their
    // absence is not evidence of a bad measurement.
    const assessableConfidenceValues = factors
      .filter((f) => f.evidenceState === 'CONFIRMED' || f.evidenceState === 'NOT_DETECTED')
      .map((f) => f.confidence || 'LOW');
    const overallConfidence: 'HIGH' | 'MEDIUM' | 'LOW' = assessableConfidenceValues.length === 0
      ? 'LOW'
      : assessableConfidenceValues.every((c) => c === 'HIGH')
        ? 'HIGH'
        : assessableConfidenceValues.some((c) => c === 'LOW')
          ? 'LOW'
          : 'MEDIUM';
    const summary = this.buildSummary(privacyScore, tier, deductions, evidenceSummary, verificationStatus, verificationCoveragePct);

    const canonicalFindings: CanonicalCollectorResult[] = factors.map((factor) => {
      const status: CanonicalCollectorStatus = factor.evidenceState === 'CONFIRMED' || factor.evidenceState === 'NOT_DETECTED'
        ? 'SUCCESS'
        : factor.evidenceState === 'UNKNOWN'
          ? 'ERROR'
          : 'UNAVAILABLE';
      return {
        signal: factor.id,
        status,
        value: factor.currentValue,
        classification: factor.classification || 'INFORMATIONAL',
        severity: factor.severity,
        confidence: factor.confidence || 'LOW',
        scoreImpact: factor.scoreImpact || 0,
        evidence: factor.evidenceState === 'CONFIRMED' || factor.evidenceState === 'NOT_DETECTED',
        provenance: factor.provenance,
        source: factor.source,
        explanation: factor.reason,
      };
    });

    return {
      privacyScore,
      tier,
      summary,
      verificationStatus,
      verificationCoveragePct,
      overallConfidence,
      scoreDisclaimer: verificationStatus === 'PARTIAL' ? 'Some checks could not be verified. The score reflects confirmed evidence only and must not be interpreted as proof of complete safety.' : undefined,
      deductions,
      breakdown,
      factors,
      canonicalFindings,
      evidenceSummary,
    };
  }

  private buildSummary(score: number, tier: PrivacyScoreTier, deductions: PrivacyDeduction[], evidenceSummary: ReturnType<typeof summarizeEvidence>, verificationStatus: 'COMPLETE' | 'PARTIAL', coveragePct: number): string {
    if (deductions.length === 0) {
      return verificationStatus === 'PARTIAL'
        ? `No significant risks were confirmed (${score}/100). Verification coverage is ${coveragePct}%; ${evidenceSummary.unknown + evidenceSummary.unavailable} checks could not be verified. This is not proof of complete safety.`
        : 'Excellent privacy posture. No significant privacy disclosures or network risk factors detected.';
    }

    const topDeduction = [...deductions].sort((a, b) => Math.abs(b.points) - Math.abs(a.points))[0];

    switch (tier) {
      case 'EXCELLENT':
        return `Privacy score ${score}/100 based on score-eligible evidence. Primary observation: ${topDeduction.factor}.`;
      case 'GOOD':
        return `Solid privacy configuration (${score}/100) with minor disclosure factors. Key item: ${topDeduction.factor}.`;
      case 'MODERATE':
        return `Moderate exposure detected (${score}/100). Primary privacy impact: ${topDeduction.factor} (${topDeduction.points} pts).`;
      case 'CRITICAL':
        return `Severe privacy risk (${score}/100) with critical disclosure factors. Immediate action recommended for: ${topDeduction.factor}.`;
      default:
        return `Privacy score ${score}/100 based on score-eligible evidence.`;
    }
  }
}
