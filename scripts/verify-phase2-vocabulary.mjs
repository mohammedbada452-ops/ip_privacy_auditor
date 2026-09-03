import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const required = [
  'src/lib/signalState.ts',
  'src/features/home/components/PrivacyScoreHero.tsx',
  'src/features/browser/components/CanvasCard.tsx',
  'src/features/browser/components/WebGlCard.tsx',
  'src/features/home/components/SmartRecommendationsSection.tsx',
  'src/features/home/components/UnifiedProblemCenter.tsx',
  'src/features/home/components/WhyNotHigherSection.tsx',
];
for (const rel of required) {
  if (!fs.existsSync(path.join(root, rel))) throw new Error(`Missing required file: ${rel}`);
}

const stateSource = read('src/lib/signalState.ts');
for (const state of ['CONFIRMED', 'DETECTED', 'NOT_DETECTED', 'UNAVAILABLE', 'INFERRED', 'REVIEW_NEEDED']) {
  if (!stateSource.includes(`'${state}'`)) throw new Error(`Canonical state missing: ${state}`);
}

const hero = read('src/features/home/components/PrivacyScoreHero.tsx');
if (!hero.includes('Why is coverage incomplete?') || !hero.includes('score-evidence-breakdown')) {
  throw new Error('Evidence breakdown UI not found');
}

const recommendation = read('src/features/home/components/SmartRecommendationsSection.tsx');
if (!recommendation.includes('t.ui.viewCanonicalFinding') && !recommendation.includes('View canonical finding')) throw new Error('Canonical finding reference missing');

for (const rel of ['src/features/home/components/UnifiedProblemCenter.tsx', 'src/features/home/components/WhyNotHigherSection.tsx']) {
  if (!read(rel).includes('data-single-source-of-truth="true"')) throw new Error(`Single source marker missing: ${rel}`);
}

console.log('Phase 2 vocabulary/evidence checks passed.');
