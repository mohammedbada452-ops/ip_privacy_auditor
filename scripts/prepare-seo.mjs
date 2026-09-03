import { readFile, writeFile } from 'node:fs/promises';

const DEFAULT_ORIGIN = 'https://ip-privacy-auditor.mohammedbad452.workers.dev';
const origin = (process.env.VITE_PUBLIC_ORIGIN || DEFAULT_ORIGIN).trim().replace(/\/$/, '');

// A verified production origin is available for this release. CI/CD can override it
// with VITE_PUBLIC_ORIGIN when the deployment identity changes.
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

// Keep the original HTML SEO-complete for crawlers/bots that do not execute the SPA.
// React still upgrades these values client-side on navigation.
const indexPath = 'index.html';
let indexHtml = await readFile(indexPath, 'utf8');
indexHtml = indexHtml.replaceAll('%VITE_PUBLIC_ORIGIN%', origin);
indexHtml = indexHtml.replace('href="/"', `href="${origin}/"`);
indexHtml = indexHtml.replace(
  /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
  `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': ['WebApplication', 'SoftwareApplication'],
    name: 'PrivaSec',
    url: origin + '/',
    applicationCategory: 'SecurityApplication',
    operatingSystem: 'Any',
    description: 'Free, evidence-based privacy and browser intelligence auditing for IP, network, browser signals, HTTP headers, and exposure.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    isAccessibleForFree: true,
  })}</script>`
);
await writeFile(indexPath, indexHtml, 'utf8');
console.log(`[SEO] Prepared robots.txt, sitemap.xml and crawler-ready index metadata for ${origin}`);
