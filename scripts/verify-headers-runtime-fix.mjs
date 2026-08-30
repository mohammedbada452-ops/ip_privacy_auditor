import fs from 'node:fs';
const file = 'src/features/headers/components/HeaderOverviewCard.tsx';
const source = fs.readFileSync(file, 'utf8');
const propDeclared = /headerSecurityScore\s*=\s*100/.test(source);
const propRendered = /formatNumber\(headerSecurityScore\)/.test(source);
if (!propDeclared || !propRendered) {
  throw new Error('Header security score prop is not safely declared/rendered.');
}
console.log('HEADER_RUNTIME_FIX_CHECK: PASS');
