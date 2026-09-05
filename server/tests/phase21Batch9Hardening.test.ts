import assert from 'node:assert/strict';
import fs from 'node:fs';

const privacy = fs.readFileSync('server/services/privacyService.ts', 'utf8');
assert.match(privacy, /GeoIP provider unavailable/, 'GeoIP failures should be observable without exposing request data');
assert.match(privacy, /Scan persistence failed/, 'Persistence failures should be observable without blocking the scan');
assert.match(privacy, /error instanceof Error \? error\.name : 'UnknownError'/, 'Only safe error metadata should be logged');
assert.doesNotMatch(privacy, /console\.warn\([^\n]*extracted\.ip/, 'IP must never be logged by privacyService failure telemetry');

const config = fs.readFileSync('server/config.ts', 'utf8');
assert.match(config, /'admin' \+ new Date\(\)\.getUTCFullYear\(\)/, 'Weak admin password check should not expire into a stale year');
assert.match(config, /'adminsecurity' \+ new Date\(\)\.getUTCFullYear\(\) \+ '!'/, 'Security password default should track the current year');

console.log('Phase 21 Batch 9 hardening checks: PASS');
