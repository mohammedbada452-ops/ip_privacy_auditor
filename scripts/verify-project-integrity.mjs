import fs from 'node:fs';
import path from 'node:path';

const failures = [];
const read = (p) => fs.readFileSync(p, 'utf8');
const mustContain = (p, needle) => { if (!read(p).includes(needle)) failures.push(`${p}: missing ${needle}`); };
const mustNotContain = (p, needle) => { if (read(p).includes(needle)) failures.push(`${p}: unexpected ${needle}`); };

mustContain('src/features/headers/components/HeaderOverviewCard.tsx', 'hasHeaderSecurityScore');
mustContain('src/features/headers/components/HeadersIntelligenceView.tsx', 'headerSecurityScore={data.headerSecurityScore}');
mustContain('src/components/layout/Footer.tsx', 'Owner access');
mustNotContain('src/components/layout/Header.tsx', "'/admin'");
mustNotContain('src/components/navigation/MobileNav.tsx', "'/admin'");
mustNotContain('src/components/navigation/MobileNav.tsx', "'/admin/dashboard'");

const aggregator = read('src/features/home/utils/problemAggregator.ts');
const evidenceStateMatches = aggregator.match(/evidenceState:/g) || [];
if (evidenceStateMatches.length > 1) failures.push('problemAggregator.ts: duplicate evidenceState key still present');

const ip = read('server/utils/ipExtractor.ts');
if ((ip.match(/const isZero =/g) || []).length !== 1) failures.push('ipExtractor.ts: isZero declaration count is not exactly one');

const engine = read('server/privacy/PrivacyEngine.ts');
if (!engine.includes("evidenceState === 'CONFIRMED' || f.evidenceState === 'NOT_DETECTED'")) failures.push('PrivacyEngine.ts: confidence is not based on assessable evidence only');

if (failures.length) {
  console.error('PROJECT INTEGRITY: FAIL');
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log('PROJECT INTEGRITY: PASS');
