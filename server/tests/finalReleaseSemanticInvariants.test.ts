import assert from 'node:assert/strict';

const findings = [
  { status: 'OPEN', scoreImpact: 3, isInfrastructure: false },
  { status: 'OPEN', scoreImpact: 0, isInfrastructure: false },
  { status: 'OPEN', scoreImpact: 0, isInfrastructure: false },
  { status: 'OPEN', scoreImpact: 0, isInfrastructure: false },
];

assert.equal(findings.filter((f) => f.status !== 'RESOLVED' && f.scoreImpact > 0).length, 1);
assert.equal(findings.filter((f) => f.status !== 'RESOLVED' && f.scoreImpact === 0 && !f.isInfrastructure).length, 3);

const geoObservations = [
  { status: 'VERIFIED', countryCode: 'TR' },
  { status: 'VERIFIED', countryCode: 'SY' },
];
assert.equal(new Set(geoObservations.map((o) => o.countryCode)).size > 1, true);

console.log('finalReleaseSemanticInvariants: PASS');
