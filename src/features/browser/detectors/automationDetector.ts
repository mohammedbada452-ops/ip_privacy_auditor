/**
 * Automation and Headless Browser Detector
 * Evaluates whether automated test frameworks or headless browsers are operating.
 */

import type { AutomationData, AutomationStatus, ConfidenceLevel } from '../types';

export interface AutomationDetectionOutcome {
  status: AutomationStatus;
  isAutomation: boolean;
  confidence: ConfidenceLevel;
  summary: string;
  recommendation?: string;
}

export function detectAutomation(data: AutomationData | null): AutomationDetectionOutcome {
  if (!data || data.status === 'UNKNOWN') {
    return {
      status: 'UNKNOWN',
      isAutomation: false,
      confidence: 'LOW',
      summary: 'Automation inspection was inconclusive or unavailable.',
    };
  }

  if (data.status === 'DETECTED') {
    return {
      status: 'DETECTED',
      isAutomation: true,
      confidence: data.confidence,
      summary: `Automated browser controller active (${data.automationSignals.join(', ')}).`,
      recommendation: 'Ensure your browser is running under normal user-interactive execution without automated driver flags.',
    };
  }

  if (data.status === 'SUSPECTED') {
    return {
      status: 'SUSPECTED',
      isAutomation: true,
      confidence: 'MEDIUM',
      summary: `Possible automation artifacts detected (${data.automationSignals.join(', ')}).`,
    };
  }

  return {
    status: 'NOT_DETECTED',
    isAutomation: false,
    confidence: 'HIGH',
    summary: 'Standard user-interactive browser session. No automation flags found.',
  };
}
