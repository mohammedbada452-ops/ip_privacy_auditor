/**
 * WebRTC Privacy Detector
 * Classifies ICE candidate results into distinct privacy states with explainability.
 */

import type { WebRtcData, WebRtcStatus, ConfidenceLevel } from '../types';

export interface WebRtcDetectionOutcome {
  status: WebRtcStatus;
  leakDetected: boolean;
  confidence: ConfidenceLevel;
  summary: string;
  recommendation?: string;
}

export function detectWebRtcLeak(data: WebRtcData | null): WebRtcDetectionOutcome {
  if (!data || data.status === 'UNAVAILABLE') {
    return {
      status: 'UNAVAILABLE',
      leakDetected: false,
      confidence: 'HIGH',
      summary: 'WebRTC is not available or disabled in this browser.',
    };
  }

  if (data.status === 'BLOCKED') {
    return {
      status: 'BLOCKED',
      leakDetected: false,
      confidence: 'HIGH',
      summary: 'WebRTC connection creation was blocked by browser permissions or privacy extensions.',
    };
  }

  if (data.status === 'TIMEOUT') {
    return {
      status: 'TIMEOUT',
      leakDetected: false,
      confidence: 'MEDIUM',
      summary: 'WebRTC candidate gathering reached timeout threshold without discovering candidates.',
    };
  }

  if (data.localIps && data.localIps.length > 0) {
    return {
      status: 'LEAK_DETECTED',
      leakDetected: true,
      confidence: 'HIGH',
      summary: `WebRTC leaked internal private network address (${data.localIps.join(', ')}).`,
      recommendation: 'Disable WebRTC in your browser or enable mDNS host candidate obfuscation.',
    };
  }

  if (data.mdnsCandidates && data.mdnsCandidates.length > 0) {
    return {
      status: 'PROTECTED',
      leakDetected: false,
      confidence: 'HIGH',
      summary: 'Browser uses mDNS candidate obfuscation (.local) to protect local LAN IP addresses.',
    };
  }

  if (data.publicIps && data.publicIps.length > 0) {
    return {
      status: 'PUBLIC_CANDIDATE_REVIEW',
      leakDetected: false,
      confidence: 'MEDIUM',
      summary: `Public ICE candidate(s) observed (${data.publicIps.join(', ')}). This is a review signal, not a confirmed public-IP leak without correlation to an independently observed egress address.`,
    };
  }

  return {
    status: 'NO_LEAK',
    leakDetected: false,
    confidence: 'HIGH',
    summary: 'No private/local IP leaks detected via WebRTC candidate gathering.',
  };
}
