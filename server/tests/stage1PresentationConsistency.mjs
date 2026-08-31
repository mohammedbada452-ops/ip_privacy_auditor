import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const overview = fs.readFileSync(path.join(root, 'src/features/browser/components/BrowserOverviewCard.tsx'), 'utf8');
const webrtc = fs.readFileSync(path.join(root, 'src/features/browser/components/WebRtcCard.tsx'), 'utf8');
const timeline = fs.readFileSync(path.join(root, 'src/context/UnifiedScanContext.tsx'), 'utf8');

assert.match(overview, /const canvasHash = canvasData\?\.canvas\?\.hash/);
assert.match(overview, /const webglHardwareHash = webglData\?\.webgl\?\.hardwareHash/);
assert.match(overview, /t\.browser\.webrtcNoLeak/);
assert.doesNotMatch(overview, /'mDNS \/ Protected'/);
assert.doesNotMatch(webrtc, /: t\.browser\.webrtcProtected\}/);
assert.match(timeline, /ipCheckRes\.observationScope \|\| ipCheckRes\.classification \|\| 'UNKNOWN'/);
assert.match(timeline, /ipCheckRes\.observationSource \|\| ipCheckRes\.ipSource \|\| 'SERVER_OBSERVED'/);
assert.doesNotMatch(timeline, /\$\{ipCheckRes\.observationScope\}, \${ipCheckRes\.observationSource}\}/);

console.log('[PASS] Stage 1 presentation consistency invariants');
