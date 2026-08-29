import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const errors = [];
const expect = (condition, message) => { if (!condition) errors.push(message); };

const pg = read('server/db/postgresRepository.ts');
const api = read('server/routes/admin.ts');
const ui = read('src/routes/AdminDashboard.tsx');
const types = read('server/db/types.ts');

expect(pg.includes("AVG(verification_coverage_pct) FILTER (WHERE verification_status = 'COMPLETE')"), 'Average coverage must use COMPLETE audits only.');
expect(pg.includes("COUNT(*) FILTER (WHERE network_intelligence_status = 'VERIFIED' AND is_vpn = TRUE AND verification_status = 'COMPLETE')"), 'VPN count must require verified network intelligence and COMPLETE audit.');
expect(pg.includes("COUNT(*) FILTER (WHERE webrtc_evidence_state = 'CONFIRMED' AND is_webrtc_leak = TRUE AND verification_status = 'COMPLETE')"), 'WebRTC leak count must require confirmed evidence and COMPLETE audit.');
expect(pg.includes("WHERE verification_status = 'COMPLETE'\n      GROUP BY score_tier"), 'Score tiers must use COMPLETE audits only.');
expect(api.includes('vpnDetections: stats.vpnDetections ?? 0'), 'Events endpoint must use canonical VPN detection count.');
expect(api.includes('webRtcLeaks: stats.webRtcConfirmedLeaks ?? 0'), 'Events endpoint must use canonical confirmed WebRTC leak count.');
expect(ui.includes('routeCounts: Object.fromEntries((data.routeBreakdown || []).map'), 'Pageview route breakdown must be normalized for the UI.');
expect(ui.includes("scan.verificationStatus === 'COMPLETE'"), 'Clean scan badge must require COMPLETE verification.');
expect(ui.includes("'PARTIAL' : 'UNVERIFIED'"), 'Incomplete/unknown scan rows must not be shown as clean.');
expect(ui.includes('scoreDistributionTotal'), 'Score distribution must use canonical complete-score denominator.');
expect(ui.includes('Audit Data Quality'), 'Dashboard must not claim operational health from completion rate alone.');
expect(types.includes('vpnDetections?: number;'), 'Canonical VPN detection count must exist in the analytics type.');
expect(types.includes('webRtcConfirmedLeaks?: number;'), 'Canonical WebRTC confirmed leak count must exist in the analytics type.');

if (errors.length) {
  console.error('ADMIN METRICS INTEGRITY: FAIL');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log('ADMIN METRICS INTEGRITY: PASS');
