/**
 * Central Terminology & Semantic Concept Glossary
 * FIX 7: Authoritative definitions and state semantics
 */

export interface GlossaryTerm {
  term: string;
  category: 'SCORE' | 'RISK' | 'PROTECTION' | 'PROVENANCE' | 'STATE';
  definition: string;
  technicalRule: string;
}

export const PRIVACY_GLOSSARY: Record<string, GlossaryTerm> = {
  Risk: {
    term: 'Risk',
    category: 'RISK',
    definition: 'A technical observation indicating potential surveillance, correlation, or leak vulnerability.',
    technicalRule: 'Must be verified by specific deterministic signals; never inferred without evidence.',
  },
  Exposure: {
    term: 'Exposure',
    category: 'RISK',
    definition: 'Direct disclosure of hardware, network, or session identifiers to remote servers or scripts.',
    technicalRule: 'E.g., unmasked GPU models, raw IP leaks via WebRTC, or high-entropy client hints.',
  },
  Deduction: {
    term: 'Deduction',
    category: 'SCORE',
    definition: 'A mathematical point penalty subtracted from the baseline 100-point Privacy Score.',
    technicalRule: 'Score = max(0, 100 - sum(abs(points))). Must trace 1:1 to an active deduction factor.',
  },
  Protection: {
    term: 'Protection',
    category: 'PROTECTION',
    definition: 'A positively verified active defense or shield mitigating tracking.',
    technicalRule: 'Must prove an active mechanism (e.g. GPC: 1, Tor/VPN tunnel, WebRTC mDNS, Canvas noise).',
  },
  Observed: {
    term: 'Observed',
    category: 'PROVENANCE',
    definition: 'A telemetry signal received or detected during the active scan.',
    technicalRule: 'Reflects raw evidence without assuming malicious or defensive intent.',
  },
  Detected: {
    term: 'Detected',
    category: 'STATE',
    definition: 'A risk or specific configuration state positively verified in the client request or browser profile.',
    technicalRule: 'Carries high or medium verification confidence backed by payload evidence.',
  },
  Protected: {
    term: 'Protected',
    category: 'STATE',
    definition: 'The factor is actively shielded by an enabled browser setting, extension, or network tunnel.',
    technicalRule: 'Assigned ONLY when active defensive evidence is present.',
  },
  Unavailable: {
    term: 'Unavailable',
    category: 'PROVENANCE',
    definition: 'The diagnostic signal could not be gathered due to browser restrictions or missing APIs.',
    technicalRule: 'Must NOT be counted as 0 or fabricated; represented as null/Unavailable.',
  },
  Unknown: {
    term: 'Unknown',
    category: 'PROVENANCE',
    definition: 'The true value cannot be definitively established from available evidence.',
    technicalRule: 'Must NOT be inferred or assumed safe; displayed honestly as Unknown.',
  },
  Infrastructure: {
    term: 'Infrastructure',
    category: 'PROVENANCE',
    definition: 'Signals introduced by trusted hosting, reverse proxies, or CDN edge infrastructure.',
    technicalRule: 'Must NOT penalize the user score or be flagged as user vulnerability.',
  },
  Educational: {
    term: 'Educational',
    category: 'STATE',
    definition: 'Informational signals provided for transparency without scoring penalties.',
    technicalRule: 'Points deduction = 0.',
  },
  Resolved: {
    term: 'Resolved',
    category: 'STATE',
    definition: 'A previously penalized deduction factor that is now fixed in the latest scan.',
    technicalRule: 'Transitions from active penalty to 0 points; potential score recovered.',
  },
  Improved: {
    term: 'Improved',
    category: 'STATE',
    definition: 'A penalty factor whose severity or point penalty has decreased relative to previous scan.',
    technicalRule: 'E.g., deduction reduced from -15 to -5.',
  },
  Unchanged: {
    term: 'Unchanged',
    category: 'STATE',
    definition: 'A factor whose status and point penalty remain identical across consecutive scans.',
    technicalRule: 'Delta = 0.',
  },
  Worsened: {
    term: 'Worsened',
    category: 'STATE',
    definition: 'A factor whose point penalty or risk status has escalated relative to previous scan.',
    technicalRule: 'Deduction increased.',
  },
};
