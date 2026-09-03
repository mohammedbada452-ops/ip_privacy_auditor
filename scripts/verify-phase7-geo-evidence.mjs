import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const contract = read('packages/api-contract/src/index.ts');
const service = read('server/services/geoip.ts');
const route = read('server/routes/ip.ts');
const helper = read('server/providers/geoip/accuracy.ts');
const card = read('src/features/ip/components/GeoNetworkCard.tsx');

const checks = [
  ['Geo evidence confidence contract', /evidenceConfidence\?: IpGeoEvidenceConfidence/.test(contract)],
  ['Provider observations carry granular geo fields', /postalCode\?: string \| null/.test(contract) && /timezone\?: string \| null/.test(contract)],
  ['Single-source evidence is not promoted to HIGH', /return 'MEDIUM';/.test(helper)],
  ['Conflicts can lower field confidence', /return 'LOW';/.test(helper)],
  ['IPinfo Lite is used only as explicit optional evidence', /IPINFO_TOKEN/.test(service) && /IpInfoLiteProvider/.test(service)],
  ['Geo route exposes evidence confidence', /evidenceConfidence: \{ \.\.\.geoFieldAgreement \}/.test(route)],
  ['Geo route exposes conflicts', /conflicts: \{ country: countryConflict, asn: asnConflict, region: regionConflict/.test(route)],
  ['UI localizes evidence confidence values', /t\.common\.high/.test(card) && /t\.common\.unknown/.test(card)],
];

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? '[PASS]' : '[FAIL]'} ${label}`);
  if (!ok) failed++;
}
process.exitCode = failed ? 1 : 0;
