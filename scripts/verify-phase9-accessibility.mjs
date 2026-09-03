import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const failures = [];
const assert = (ok, msg) => { if (!ok) failures.push(msg); };

const appShell = read('src/components/layout/AppShell.tsx');
assert(appShell.includes('href="#main-content"'), 'Missing skip link target');
assert(appShell.includes('id="main-content"') && appShell.includes('tabIndex={-1}'), 'Main landmark is not keyboard focusable');
assert(appShell.includes('aria-live="polite"') && appShell.includes('aria-atomic="true"'), 'Route loading status missing live semantics');

const header = read('src/components/layout/Header.tsx');
assert(header.includes('aria-current={isActive ? \'page\' : undefined}'), 'Desktop active navigation missing aria-current');
assert(!header.includes('<h1 className="text-sm sm:text-base'), 'Global header still owns a page-level h1');

const mobile = read('src/components/navigation/MobileNav.tsx');
assert(mobile.includes('aria-current={isActive ? \'page\' : undefined}'), 'Mobile active navigation missing aria-current');

const remediation = read('src/features/home/components/PrivacyRemediationCenter.tsx');
assert(!remediation.includes('role="button"'), 'Remediation still uses custom role=button');
assert(!remediation.includes('aria-label={t.ui.toggleFindingDetails}'), 'Legacy nested toggle button remains in remediation');
assert(remediation.includes('aria-expanded={isExpanded}') && remediation.includes('aria-controls={`finding-details-${finding.id}`}'), 'Remediation expansion semantics incomplete');
assert(!remediation.includes('bg-white') && !remediation.includes('dark:bg-white'), 'Stale light-mode white surface remains in remediation');

const unified = read('src/features/home/components/UnifiedProblemCenter.tsx');
assert(!unified.includes('role="button"'), 'Unified Problem Center still uses custom role=button');
assert(unified.includes('aria-expanded={isExpanded}') && unified.includes('aria-controls={`risk-details-${risk.id}`}'), 'Unified risk expansion semantics incomplete');

const browserProblems = read('src/features/browser/components/ProblemCenterSection.tsx');
assert(!browserProblems.includes('role="button"'), 'Browser Problem Center still uses container role=button');

const toggle = read('src/components/form/Toggle.tsx');
assert(toggle.includes('role="switch"') && toggle.includes('aria-checked={checked}'), 'Toggle switch semantics missing');
assert(toggle.includes('aria-labelledby={accessibleLabel || !label ? undefined : labelId}'), 'Toggle fallback accessible name missing');

for (const lang of ['en','es','fr','pt','tr','ar']) {
  const text = read(`src/i18n/locales/${lang}.ts`);
  assert(text.includes('skipToMain:'), `skipToMain missing in ${lang}`);
}

// Detect obvious custom interactive containers left in source (allow admin scroll region role).
const srcDir = path.join(root, 'src');
function walk(dir) {
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name)]);
}
const sourceFiles = walk(srcDir).filter(f => /\.(tsx|ts)$/.test(f));
for (const file of sourceFiles) {
  const text = fs.readFileSync(file,'utf8');
  if (text.includes('role="button"')) failures.push(`Custom role=button remains in ${path.relative(root,file)}`);
}

if (failures.length) {
  console.error('PHASE9 ACCESSIBILITY VERIFICATION: FAIL');
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log('PHASE9 ACCESSIBILITY VERIFICATION: PASS');
