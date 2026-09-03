import assert from 'node:assert/strict';
import { finalizeEvidenceSummary, getEvidenceWeight, summarizeEvidence } from '../privacy/evidence';

const items = [
  {
    id: 'ip', state: 'CONFIRMED' as const, provenance: 'server_observed' as const,
    confidence: 'HIGH' as const, source: 'ip' as const, explanation: '', weight: getEvidenceWeight({ source: 'ip', classification: 'SECURITY' }),
  },
  {
    id: 'browser', state: 'NOT_DETECTED' as const, provenance: 'client_observed_unverified' as const,
    confidence: 'MEDIUM' as const, source: 'browser' as const, explanation: '', weight: getEvidenceWeight({ source: 'browser', classification: 'FINGERPRINTING_SURFACE' }),
  },
  {
    id: 'unsupported', state: 'UNAVAILABLE' as const, provenance: 'derived' as const,
    confidence: 'LOW' as const, source: 'browser' as const, explanation: '', weight: 1, excludedFromCoverage: true, exclusionReason: 'UNSUPPORTED' as const,
  },
  {
    id: 'missing', state: 'UNAVAILABLE' as const, provenance: 'provider_observed' as const,
    confidence: 'LOW' as const, source: 'ip' as const, explanation: '', weight: getEvidenceWeight({ source: 'ip', classification: 'INFORMATIONAL' }),
  },
];

const summary = finalizeEvidenceSummary(summarizeEvidence(items));
assert.equal(summary.excludedUnsupported, 1);
assert.equal(summary.unavailable, 1);
assert.equal(summary.confirmed, 1);
assert.equal(summary.notDetected, 1);
assert.ok(summary.weightedTotal > summary.weightedAssessable);
assert.ok(summary.weightedCoveragePct >= 0 && summary.weightedCoveragePct < 100);
assert.equal(getEvidenceWeight({ source: 'browser', classification: 'INFORMATIONAL', metadata: { evidenceWeight: 4 } }), 4);
assert.equal(getEvidenceWeight({ source: 'browser', classification: 'INFORMATIONAL', metadata: { evidenceWeight: 99 } }), 5);
console.log('[PASS] weighted evidence coverage invariants');
