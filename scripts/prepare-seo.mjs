import { readFile, writeFile } from 'node:fs/promises';

const origin = (process.env.VITE_PUBLIC_ORIGIN || '').trim().replace(/\/$/, '');

// SEO files are generated only when a real public origin is known. On the first
// Cloudflare deployment the origin may not be known yet, so emit a safe robots.txt
// without a stale hostname and intentionally omit sitemap.xml until configured.
if (!origin) {
  await writeFile('public/robots.txt', 'User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n', 'utf8');
  try { await (await import('node:fs/promises')).unlink('public/sitemap.xml'); } catch {}
  console.log('[SEO] VITE_PUBLIC_ORIGIN not set; generated hostname-free robots.txt and skipped sitemap.xml.');
  process.exit(0);
}

if (!/^https:\/\/[^\s/]+(?:\/[^\s]*)?$/.test(origin) || origin.includes('YOUR_PRODUCTION_DOMAIN')) {
  throw new Error('VITE_PUBLIC_ORIGIN must be a real HTTPS URL when provided.');
}

for (const name of ['robots.txt', 'sitemap.xml']) {
  const template = await readFile(`public/${name}.template`, 'utf8');
  await writeFile(`public/${name}`, template.replaceAll('__PUBLIC_ORIGIN__', origin), 'utf8');
}
console.log(`[SEO] Prepared robots.txt and sitemap.xml for ${origin}`);
