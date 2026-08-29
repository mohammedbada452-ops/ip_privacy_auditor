/**
 * Evidence-backed browser problem projection.
 * IMPORTANT: scoring is owned exclusively by PrivacyEngine. This module only
 * projects canonical scored findings into actionable browser UI records.
 */
import type { BrowserProfile, ConfidenceLevel } from '../types';
import type { PrivacyScoreAnalysis, PrivacyFactor } from '@packages/api-contract';

export type RemediationType =
  | 'DIRECT_USER_ACTION'
  | 'BROWSER_SETTING'
  | 'SYSTEM_SETTING'
  | 'WEBSITE_ADMIN_CONFIG'
  | 'NETWORK_PROVIDER_CONFIG'
  | 'EDUCATIONAL_ONLY'
  | 'NOT_ACTIONABLE';

export type SignalStatus =
  | 'DETECTED' | 'NOT_DETECTED' | 'PROTECTED' | 'SUSPECTED' | 'UNKNOWN'
  | 'UNAVAILABLE' | 'BLOCKED' | 'FAILED' | 'TIMEOUT';

export interface BrowserProblem {
  id: string;
  signalName: string;
  category: 'GRAPHICS' | 'NETWORK' | 'HARDWARE' | 'AUTOMATION' | 'IDENTITY' | 'STORAGE';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  status: SignalStatus;
  points: number;
  confidence: ConfidenceLevel;
  whatWeFound: string;
  whyItMatters: string;
  evidence: string;
  howToImprove: string;
  remediationType: RemediationType;
  whatHappensAfterFix: string;
  targetSectionId: string;
}

export interface SignalTransition {
  id: string;
  name: string;
  category: string;
  beforeStatus: string;
  afterStatus: string;
  improved: boolean;
}

function factorToProblem(factor: PrivacyFactor): BrowserProblem | null {
  const scoreImpact = factor.scoreImpact ?? factor.points;
  if (!(factor.scored && factor.evidenceState === 'CONFIRMED' && scoreImpact < 0)) return null;

  const category = factor.category === 'FINGERPRINT' ? 'GRAPHICS' :
    factor.category === 'NETWORK' ? 'NETWORK' :
      factor.category === 'SECURITY' ? 'AUTOMATION' :
        factor.category === 'HEADERS' ? 'IDENTITY' : 'HARDWARE';
  const statusMap: Record<string, SignalStatus> = {
    DANGER: 'DETECTED', WARNING: 'DETECTED', DETECTED: 'DETECTED',
  };

  return {
    id: factor.id,
    signalName: factor.name,
    category,
    severity: factor.severity,
    status: statusMap[factor.status] || 'DETECTED',
    points: scoreImpact,
    confidence: factor.confidence || 'LOW',
    whatWeFound: factor.description,
    whyItMatters: factor.reason,
    evidence: factor.currentValue == null ? factor.reason : String(factor.currentValue),
    howToImprove: factor.recommendation || 'Apply the recommended safeguard and run the audit again.',
    remediationType: factor.category === 'NETWORK' ? 'NETWORK_PROVIDER_CONFIG' : factor.category === 'HEADERS' ? 'WEBSITE_ADMIN_CONFIG' : 'BROWSER_SETTING',
    whatHappensAfterFix: `Resolving this confirmed finding removes ${Math.abs(scoreImpact)} point(s) from the canonical deduction set; the final score is recalculated by the PrivacyEngine.`,
    targetSectionId:
      factor.id.includes('WEBRTC') ? 'webrtc' :
        factor.id.includes('WEBGL') ? 'webgl' :
          factor.id.includes('CANVAS') ? 'canvas' :
            factor.id.includes('AUDIO') ? 'audio' : 'problem-center',
  };
}

export function extractBrowserProblems(
  _profile: BrowserProfile,
  analysis: PrivacyScoreAnalysis | null
): BrowserProblem[] {
  return (analysis?.factors || [])
    .map(factorToProblem)
    .filter((problem): problem is BrowserProblem => problem !== null)
    .sort((a, b) => a.points - b.points);
}

export function detectSignalTransitions(
  prevProfile: BrowserProfile,
  newProfile: BrowserProfile,
  prevAnalysis: PrivacyScoreAnalysis | null,
  newAnalysis: PrivacyScoreAnalysis | null
): SignalTransition[] {
  const transitions: SignalTransition[] = [];
  const prevById = new Map((prevAnalysis?.factors || []).map((f) => [f.id, f]));
  const nextById = new Map((newAnalysis?.factors || []).map((f) => [f.id, f]));

  for (const [id, prev] of prevById) {
    const next = nextById.get(id);
    if (!next) continue;
    const before = prev.evidenceState || 'UNKNOWN';
    const after = next.evidenceState || 'UNKNOWN';
    if (before === after && (prev.scoreImpact ?? prev.points) === (next.scoreImpact ?? next.points)) continue;
    transitions.push({
      id,
      name: prev.name,
      category: prev.category,
      beforeStatus: `${before} (${prev.scoreImpact ?? prev.points} pts)`,
      afterStatus: `${after} (${next.scoreImpact ?? next.points} pts)`,
      improved: Math.abs(next.scoreImpact ?? next.points) < Math.abs(prev.scoreImpact ?? prev.points),
    });
  }

  // Profiles are retained in the signature to keep the public API stable.
  void prevProfile;
  void newProfile;
  return transitions;
}
