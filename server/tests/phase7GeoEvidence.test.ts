import assert from 'node:assert/strict';
import { calculateGeoFieldAgreement, hasMaterialGeoConflict } from '../providers/geoip/accuracy';

const one = { countryCode: 'US', asn: 'AS15169', city: 'Ashburn' };
const same = { countryCode: 'US', asn: 'AS15169', city: 'Ashburn' };
const different = { countryCode: 'DE', asn: 'AS3320', city: 'Berlin' };

const single = calculateGeoFieldAgreement([one], 1);
assert.equal(single.country, 'MEDIUM', 'A single verified source must not be presented as high-confidence consensus.');
assert.equal(single.asn, 'MEDIUM');

const agreement = calculateGeoFieldAgreement([one, same], 2);
assert.equal(agreement.country, 'HIGH', 'Independent agreement raises country evidence quality.');
assert.equal(agreement.asn, 'HIGH');

const conflict = calculateGeoFieldAgreement([one, different], 2);
assert.equal(conflict.country, 'LOW', 'Conflicting country evidence lowers confidence.');
assert.equal(conflict.asn, 'LOW');
assert.equal(hasMaterialGeoConflict(one, different), true, 'Material geographic/network conflicts are detected.');
assert.equal(hasMaterialGeoConflict(one, same), false, 'Matching observations do not create false conflicts.');

console.log('[PASS] Phase 7 geo evidence confidence and conflict semantics');
