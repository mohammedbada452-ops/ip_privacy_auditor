import fs from 'node:fs';
import assert from 'node:assert/strict';

const admin = fs.readFileSync(new URL('../../src/routes/AdminDashboard.tsx', import.meta.url), 'utf8');
const copy = fs.readFileSync(new URL('../../src/components/data/CopyValue.tsx', import.meta.url), 'utf8');
const showcase = fs.readFileSync(new URL('../../src/routes/DesignSystemShowcase.tsx', import.meta.url), 'utf8');
const problem = fs.readFileSync(new URL('../../src/features/home/components/UnifiedProblemCenter.tsx', import.meta.url), 'utf8');

assert.match(admin, /activeTab === 'securityLogs'\) fetchLogs\(\)/, 'Security Logs tab must refresh through the matching tab id.');
assert.match(admin, /aria-label=\{t\.admin\.scansTable\.tierFilter \|\| 'Scan tier filter'\}/, 'Admin scan tier select needs an accessible label.');
assert.match(admin, /aria-label=\{t\.admin\.logsTable\.eventFilter \|\| 'Security event filter'\}/, 'Admin event select needs an accessible label.');
assert.match(copy, /resetCopiedTimerRef/, 'CopyValue must retain and clean up its timer.');
assert.match(copy, /clearTimeout\(resetCopiedTimerRef\.current\)/, 'CopyValue must clear its timer on unmount/retrigger.');
assert.match(showcase, /refreshTimerRef|feedbackTimerRef/, 'Design System demo timers must be tracked for cleanup.');
assert.match(problem, /aria-label=\{t\.home\.unifiedRisks\.searchPlaceholder\}/, 'Problem center search input needs an accessible label.');

console.log('PASS: Phase 16 UI hardening regression guard');
