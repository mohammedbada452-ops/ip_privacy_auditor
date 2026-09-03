import { stat, readdir } from 'node:fs/promises';
import path from 'node:path';

const dist = path.resolve('dist');
try { await stat(dist); } catch { console.error('[PERF] dist/ missing; run the production build first.'); process.exit(1); }

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else files.push(full);
  }
  return files;
}

const files = await walk(dist);
const assets = files.filter((file) => /\.(?:js|css)$/i.test(file));
const js = assets.filter((file) => file.endsWith('.js'));
const totalJs = (await Promise.all(js.map(async (file) => (await stat(file)).size))).reduce((a,b)=>a+b,0);
const largestJs = Math.max(0, ...(await Promise.all(js.map(async (file) => (await stat(file)).size))));

const MAX_LARGEST_JS = 650 * 1024;
const MAX_TOTAL_JS = 2.5 * 1024 * 1024;

console.log(`[PERF] JS chunks: ${js.length}`);
console.log(`[PERF] largest JS: ${(largestJs/1024).toFixed(1)} KiB`);
console.log(`[PERF] total JS: ${(totalJs/1024).toFixed(1)} KiB`);

if (largestJs > MAX_LARGEST_JS) throw new Error(`Largest JS chunk exceeds ${MAX_LARGEST_JS/1024} KiB budget.`);
if (totalJs > MAX_TOTAL_JS) throw new Error(`Total JS exceeds ${MAX_TOTAL_JS/1024} KiB budget.`);
console.log('[PERF] Performance budget: PASS');
