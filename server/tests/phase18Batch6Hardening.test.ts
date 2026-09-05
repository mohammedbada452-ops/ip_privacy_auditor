import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const npmrc = readFileSync('.npmrc', 'utf8');
assert.equal(npmrc.includes('audit=false'), false, 'npm audit must remain enabled');

const validator = readFileSync('server/utils/payloadValidator.ts', 'utf8');
assert.equal(validator.includes('// 5. Screen'), false, 'payload validator section numbering should be corrected');
assert.equal(validator.includes('// 6. Screen'), true, 'screen section should be numbered after hardware');

const loading = readFileSync('src/components/feedback/LoadingState.tsx', 'utf8');
assert.equal(loading.includes('direction-reverse'), false, 'non-standard direction-reverse utility must not be emitted');

const types = readFileSync('src/i18n/types.ts', 'utf8');
const commonStart = types.indexOf('  common: {');
const commonEnd = types.indexOf('  };', commonStart);
const common = types.slice(commonStart, commonEnd);
assert.equal(common.includes('skipToMain: string;'), true, 'common translation type must include skipToMain');

const admin = readFileSync('src/routes/AdminDashboard.tsx', 'utf8');
assert.equal(admin.includes('const refreshAll = useCallback'), true, 'refreshAll should be memoized');
assert.equal(admin.includes('[isAuthenticated, refreshAll]'), true, 'refreshAll effect must track its callback dependency');
assert.equal(admin.includes('scansSearch, scansCountry, scansTier'), true, 'scan search must be included in the active-tab effect dependencies');

console.log('PASS: Phase 18 Batch 6 hardening checks');
