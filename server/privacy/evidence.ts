export type EvidenceProvenance =
  | 'server_observed'
  | 'client_observed_unverified'
  | 'derived'
  | 'provider_observed';

export type EvidenceState = 'CONFIRMED' | 'NOT_DETECTED' | 'UNKNOWN' | 'UNAVAILABLE';

export interface EvidenceItem {
  id: string;
  state: EvidenceState;
  provenance: EvidenceProvenance;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  source: 'ip' | 'headers' | 'browser' | 'system';
  value?: unknown;
  explanation: string;
}

export interface EvidenceSummary {
  total: number;
  confirmed: number;
  notDetected: number;
  unknown: number;
  unavailable: number;
  unverifiedClientObservations: number;
}

export function summarizeEvidence(items: EvidenceItem[]): EvidenceSummary {
  return items.reduce<EvidenceSummary>((acc, item) => {
    acc.total += 1;
    if (item.state === 'CONFIRMED') acc.confirmed += 1;
    else if (item.state === 'NOT_DETECTED') acc.notDetected += 1;
    else if (item.state === 'UNKNOWN') acc.unknown += 1;
    else acc.unavailable += 1;
    if (item.provenance === 'client_observed_unverified') acc.unverifiedClientObservations += 1;
    return acc;
  }, { total: 0, confirmed: 0, notDetected: 0, unknown: 0, unavailable: 0, unverifiedClientObservations: 0 });
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
