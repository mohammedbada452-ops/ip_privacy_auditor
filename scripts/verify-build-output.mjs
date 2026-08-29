import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const required = ['index.html'];

if (!fs.existsSync(dist) || !fs.statSync(dist).isDirectory()) {
  throw new Error('Cloudflare build output directory dist/ was not created. Run the frontend build before deploy.');
}

for (const file of required) {
  const target = path.join(dist, file);
  if (!fs.existsSync(target) || fs.statSync(target).size === 0) {
    throw new Error(`Cloudflare build output is incomplete: dist/${file} is missing or empty.`);
  }
}

const hasAssets = fs.readdirSync(dist).length > 0;
if (!hasAssets) throw new Error('Cloudflare build output dist/ is empty.');
console.log(`PASS: Cloudflare build output is ready (${fs.readdirSync(dist).length} top-level entries).`);
