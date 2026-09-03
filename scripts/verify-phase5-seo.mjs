import { readFile, access } from 'node:fs/promises';

const must = (ok, message) => { if (!ok) throw new Error(message); };
const index = await readFile('index.html', 'utf8');
const worker = await readFile('worker/index.ts', 'utf8');
const robots = await readFile('public/robots.txt', 'utf8');
const sitemap = await readFile('public/sitemap.xml', 'utf8');

must(index.includes('<title>PrivaSec — Privacy & Browser Intelligence Auditor</title>'), 'index title missing');
must(index.includes('rel="canonical" href="https://ip-privacy-auditor.mohammedbad452.workers.dev/"'), 'absolute canonical missing from index');
must(index.includes('og:title') && index.includes('twitter:card'), 'social metadata missing');
must(index.includes('"@type":["WebApplication","SoftwareApplication"]'), 'application structured data missing');
must(index.includes('"price":"0"'), 'free offer structured data missing');
must(!index.includes('%VITE_PUBLIC_ORIGIN%'), 'unresolved VITE_PUBLIC_ORIGIN placeholder');
must(worker.includes('async function crawlerHtmlResponse'), 'Worker crawler HTML path missing');
for (const route of ['/', '/browser', '/headers', '/learn', '/privacy']) must(worker.includes(`'${route}'`), `SEO route missing: ${route}`);
must(worker.includes('crawlerHtmlResponse(request, env)'), 'crawler HTML response not wired');
must(robots.includes('Sitemap: https://ip-privacy-auditor.mohammedbad452.workers.dev/sitemap.xml'), 'robots sitemap missing');
for (const route of ['/', '/browser', '/headers', '/privacy', '/learn']) must(sitemap.includes(`https://ip-privacy-auditor.mohammedbad452.workers.dev${route}`), `sitemap URL missing: ${route}`);
await access('public/sitemap.xml');
console.log('PHASE5 SEO VERIFICATION: PASS');
