export type EvidenceProvenance =
  | 'server_observed'
  | 'client_observed_unverified'
  | 'derived'
  | 'provider_observed';

export type EvidenceState = 'CONFIRMED' | 'NOT_DETECTED' | 'UNKNOWN' | 'UNAVAILABLE';

export type EvidenceSource = 'ip' | 'headers' | 'browser' | 'system';

export interface EvidenceItem {
  id: string;
  state: EvidenceState;
  provenance: EvidenceProvenance;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  source: EvidenceSource;
  value?: unknown;
  explanation: string;
  /** Relative evidentiary importance used only for coverage, never for score. */
  weight?: number;
  /** Explicitly excluded from the coverage denominator when a capability is not applicable. */
  excludedFromCoverage?: boolean;
  /** Reason for exclusion, if present. */
  exclusionReason?: 'UNSUPPORTED';
}

export interface EvidenceSummary {
  total: number;
  confirmed: number;
  notDetected: number;
  unknown: number;
  unavailable: number;
  unverifiedClientObservations: number;
  weightedTotal: number;
  weightedAssessable: number;
  weightedCoveragePct: number;
  excludedUnsupported: number;
}

/**
 * Default evidentiary weights. These weights express how useful a measurement is
 * for coverage accounting, not how much it affects the privacy score.
 * Explicit per-factor metadata.evidenceWeight can override the defaults.
 */
export function getEvidenceWeight(input: {
  source: EvidenceSource;
  classification?: string | null;
  metadata?: Record<string, unknown>;
}): number {
  const explicit = Number(input.metadata?.evidenceWeight);
  if (Number.isFinite(explicit) && explicit > 0) return Math.min(5, explicit);

  const sourceWeight: Record<EvidenceSource, number> = {
    ip: 1.25,
    headers: 1.0,
    browser: 1.0,
    system: 0.9,
  };

  const classificationWeight: Record<string, number> = {
    SECURITY: 1.1,
    PRIVACY_EXPOSURE: 1.1,
    FINGERPRINTING_SURFACE: 1.0,
    CONFIGURATION: 0.9,
    INFORMATIONAL: 0.8,
  };

  return Math.min(
    3,
    Math.max(0.5, (sourceWeight[input.source] ?? 1) * (classificationWeight[input.classification || ''] ?? 1))
  );
}

export function summarizeEvidence(items: EvidenceItem[]): EvidenceSummary {
  return items.reduce<EvidenceSummary>((acc, item) => {
    acc.total += 1;
    if (item.provenance === 'client_observed_unverified') acc.unverifiedClientObservations += 1;

    const weight = Math.max(0, Number(item.weight ?? 1));
    if (item.excludedFromCoverage) {
      acc.excludedUnsupported += 1;
      return acc;
    }

    if (item.state === 'CONFIRMED') acc.confirmed += 1;
    else if (item.state === 'NOT_DETECTED') acc.notDetected += 1;
    else if (item.state === 'UNKNOWN') acc.unknown += 1;
    else acc.unavailable += 1;

    acc.weightedTotal += weight;
    if (item.state === 'CONFIRMED' || item.state === 'NOT_DETECTED') {
      acc.weightedAssessable += weight;
    }
    return acc;
  }, {
    total: 0,
    confirmed: 0,
    notDetected: 0,
    unknown: 0,
    unavailable: 0,
    unverifiedClientObservations: 0,
    weightedTotal: 0,
    weightedAssessable: 0,
    weightedCoveragePct: 0,
    excludedUnsupported: 0,
  });
}

export function finalizeEvidenceSummary(summary: EvidenceSummary): EvidenceSummary {
  return {
    ...summary,
    weightedCoveragePct: summary.weightedTotal > 0
      ? Math.round((summary.weightedAssessable / summary.weightedTotal) * 100)
      : 0,
  };
}

export function inferEvidenceState(available: boolean, detected: boolean, explicit?: EvidenceState): EvidenceState {
  if (explicit) return explicit;
  if (!available) return 'UNAVAILABLE';
  return detected ? 'CONFIRMED' : 'NOT_DETECTED';
}

export function inferProvenance(source: EvidenceItem['source'], hasFingerprint: boolean, providerStatus?: string): EvidenceProvenance {
  if (source === 'browser' && hasFingerprint) return 'client_observed_unverified';
  if (source === 'ip' && providerStatus === 'VERIFIED') return 'provider_observed';
  if (source === 'ip' || source === 'headers') return 'server_observed';
  return 'derived';
}
