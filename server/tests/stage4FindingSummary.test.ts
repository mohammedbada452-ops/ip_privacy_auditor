import assert from 'node:assert/strict';

type Finding = { status: string; scoreImpact: number; isInfrastructure: boolean };

const findings: Finding[] = [
  { status: 'OPEN', scoreImpact: 3, isInfrastructure: false }, // WebGL deduction stored as magnitude
  { status: 'OPEN', scoreImpact: 0, isInfrastructure: false }, // User-Agent
  { status: 'OPEN', scoreImpact: 0, isInfrastructure: false }, // Canvas
  { status: 'OPEN', scoreImpact: 0, isInfrastructure: false }, // Audio
];

const scoreAffectingCount = findings.filter(
  (f) => f.status !== 'RESOLVED' && f.scoreImpact > 0
).length;
const informationalCount = findings.filter(
  (f) => f.status !== 'RESOLVED' && f.scoreImpact === 0 && !f.isInfrastructure
).length;

assert.equal(scoreAffectingCount, 1);
assert.equal(informationalCount, 3);

const resolved: Finding = { status: 'RESOLVED', scoreImpact: 3, isInfrastructure: false };
assert.equal(
  [resolved, ...findings].filter((f) => f.status !== 'RESOLVED' && f.scoreImpact > 0).length,
  1,
);

console.log('stage4FindingSummary: PASS');
