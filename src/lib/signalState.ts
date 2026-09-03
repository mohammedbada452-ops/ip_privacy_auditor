export type CanonicalSignalState =
  | 'CONFIRMED'
  | 'DETECTED'
  | 'NOT_DETECTED'
  | 'UNAVAILABLE'
  | 'INFERRED'
  | 'REVIEW_NEEDED';

export interface CanonicalSignalPresentation {
  state: CanonicalSignalState;
  label: string;
  description: string;
}

/**
 * Canonicalizes the many legacy collector statuses into one semantic vocabulary.
 * Presentation components may still provide localized labels, but the internal
 * state remains stable across Browser/IP/Header findings.
 */
export function canonicalizeSignalState(input: {
  evidenceState?: string | null;
  provenance?: string | null;
  status?: string | null;
  available?: boolean;
  observed?: boolean;
}): CanonicalSignalState {
  if (input.available === false || input.evidenceState === 'UNAVAILABLE') return 'UNAVAILABLE';
  if (input.evidenceState === 'CONFIRMED') return 'CONFIRMED';
  if (input.evidenceState === 'NOT_DETECTED') return 'NOT_DETECTED';
  if (input.evidenceState === 'UNKNOWN') return 'REVIEW_NEEDED';
  if (input.provenance === 'derived') return 'INFERRED';
  if (input.status === 'DANGER' || input.status === 'WARNING' || input.status === 'DETECTED') return 'DETECTED';
  if (input.observed === true || input.status === 'INFO' || input.status === 'SAFE') return 'CONFIRMED';
  return 'REVIEW_NEEDED';
}

import type { Translations } from '../i18n/types';

export function getCanonicalSignalLabel(state: CanonicalSignalState, t: Translations): string {
  const labels = t.common.signalState;
  switch (state) {
    case 'CONFIRMED': return labels.confirmed;
    case 'DETECTED': return labels.detected;
    case 'NOT_DETECTED': return labels.notDetected;
    case 'UNAVAILABLE': return labels.unavailable;
    case 'INFERRED': return labels.inferred;
    case 'REVIEW_NEEDED': return labels.reviewNeeded;
    default: return labels.reviewNeeded;
  }
}

export function canonicalStateToBadgeStatus(state: CanonicalSignalState): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
  switch (state) {
    case 'CONFIRMED': return 'info';
    case 'DETECTED': return 'warning';
    case 'NOT_DETECTED': return 'success';
    case 'UNAVAILABLE': return 'neutral';
    case 'INFERRED': return 'info';
    case 'REVIEW_NEEDED': return 'warning';
    default: return 'neutral';
  }
}

export const CANONICAL_SIGNAL_META: Record<CanonicalSignalState, Omit<CanonicalSignalPresentation, 'state'>> = {
  CONFIRMED: {
    label: 'Confirmed',
    description: 'The signal was directly observed or explicitly verified.',
  },
  DETECTED: {
    label: 'Detected',
    description: 'The signal was observed in the current measurement.',
  },
  NOT_DETECTED: {
    label: 'Not detected',
    description: 'The check ran successfully and the signal was not observed.',
  },
  UNAVAILABLE: {
    label: 'Unavailable',
    description: 'The check could not be measured in this environment.',
  },
  INFERRED: {
    label: 'Inferred',
    description: 'The result is derived from other available evidence rather than a direct measurement.',
  },
  REVIEW_NEEDED: {
    label: 'Review needed',
    description: 'The available evidence is incomplete or ambiguous and needs review.',
  },
};
