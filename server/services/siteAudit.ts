import type { SiteAuditResponse, SiteAuditHeaderFinding, SiteTrackerSignal } from '@packages/api-contract';

const MAX_HTML_BYTES = 240_000;
const TIMEOUT_MS = 8_000;
const MAX_REDIRECTS = 3;
const TRACKER_HOST_PATTERNS = [
  /google-analytics\.(?:com|com\.[a-z.]+)$/i,
  /googletagmanager\.com$/i,
  /doubleclick\.net$/i,
  /googlesyndication\.com$/i,
  /googleadservices\.com$/i,
  /connect\.facebook\.net$/i,
  /facebook\.net$/i,
  /analytics\.twitter\.com$/i,
  /static\.hotjar\.com$/i,
  /hotjar\.com$/i,
  /clarity\.ms$/i,
  /segment\.io$/i,
  /segment\.com$/i,
  /mixpanel\.com$/i,
];

function isForbiddenHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true;
  if (h.endsWith('.test') || h.endsWith('.invalid') || h.endsWith('.example')) return true;
  if (/^(127\.|10\.|192\.168\.|169\.254\.)/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return true;
  if (h === '::1' || h === '0.0.0.0') return true;
  if (/^fc/i.test(h) || /^fd/i.test(h) || /^fe8/i.test(h) || /^fe9/i.test(h) || /^fea/i.test(h) || /^feb/i.test(h)) return true;
  return false;
}

function validateTarget(input: string): URL {
  const trimmed = input.trim();
  const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  if (url.protocol !== 'https:') throw new Error('Only HTTPS website audits are supported.');
  if (url.username || url.password) throw new Error('Userinfo in website URLs is not allowed.');
  if (url.port && url.port !== '443') throw new Error('Only the default HTTPS port is supported.');
  if (isForbiddenHostname(url.hostname)) throw new Error('Private, local, or reserved hostnames cannot be audited.');
  url.hash = '';
  return url;
}

function readSafeText(response: Response): Promise<string> {
  if (!response.body) return Promise.resolve('');
  const reader = response.body.getReader();
  return (async () => {
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (total < MAX_HTML_BYTES) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;
      const remaining = MAX_HTML_BYTES - total;
      const chunk = value.byteLength > remaining ? value.slice(0, remaining) : value;
      chunks.push(chunk);
      total += chunk.byteLength;
      if (chunk.byteLength < value.byteLength) break;
    }
    const joined = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.byteLength; }
    return new TextDecoder().decode(joined);
  })();
}

function headerFinding(headers: Headers, name: string, secure: boolean, recommendation: string): SiteAuditHeaderFinding {
  const value = headers.get(name);
  return { name, present: Boolean(value), value: value || null, secure, recommendation };
}

function detectTrackers(html: string, target: URL): SiteTrackerSignal[] {
  const found = new Map<string, SiteTrackerSignal>();
  const urls: string[] = [];
  const attrRegex = /(?:src|href)\s*=\s*["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = attrRegex.exec(html)) && urls.length < 400) urls.push(match[1]);
  for (const raw of urls) {
    try {
      const u = new URL(raw, target);
      if (u.hostname === target.hostname) continue;
      for (const pattern of TRACKER_HOST_PATTERNS) {
        if (pattern.test(u.hostname)) {
          const key = u.hostname.toLowerCase();
          if (!found.has(key)) found.set(key, { host: key, category: categorizeTracker(key), evidence: 'Referenced by the fetched HTML as a third-party resource.' });
          break;
        }
      }
    } catch { /* Ignore malformed references. */ }
  }
  return [...found.values()].slice(0, 50);
}

function categorizeTracker(host: string): string {
  if (/analytics|tagmanager|segment|mixpanel|hotjar|clarity/.test(host)) return 'Analytics';
  if (/doubleclick|ads|googlesyndication|googleadservices/.test(host)) return 'Advertising';
  if (/facebook|twitter/.test(host)) return 'Social / Ads';
  return 'Tracking signal';
}

async function fetchWithRedirects(start: URL): Promise<{ response: Response; finalUrl: URL; redirectCount: number }> {
  let current = start;
  for (let i = 0; i <= MAX_REDIRECTS; i += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(current.toString(), {
        method: 'GET',
        redirect: 'manual',
        headers: {
          Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1',
          'User-Agent': 'PrivaSec-Site-Auditor/1.0',
          'Cache-Control': 'no-store',
        },
        signal: controller.signal,
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) return { response, finalUrl: current, redirectCount: i };
        const next = new URL(location, current);
        validateTarget(next.toString());
        current = next;
        continue;
      }
      return { response, finalUrl: current, redirectCount: i };
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error('The website exceeded the maximum redirect limit.');
}

export async function auditWebsite(input: string): Promise<SiteAuditResponse> {
  const target = validateTarget(input);
  const started = Date.now();
  const { response, finalUrl, redirectCount } = await fetchWithRedirects(target);
  const contentType = response.headers.get('content-type') || '';
  const contentLength = Number(response.headers.get('content-length') || '0');
  const html = /text\/html|application\/xhtml\+xml/i.test(contentType) && (!contentLength || contentLength <= MAX_HTML_BYTES)
    ? await readSafeText(response)
    : '';

  const headers: SiteAuditHeaderFinding[] = [
    headerFinding(response.headers, 'strict-transport-security', target.protocol === 'https:', 'Deploy HSTS with an appropriate max-age after validating subdomain readiness.'),
    headerFinding(response.headers, 'content-security-policy', true, 'Define a restrictive CSP for scripts, styles, frames, and connections.'),
    headerFinding(response.headers, 'permissions-policy', true, 'Limit powerful browser features to only what the site needs.'),
    headerFinding(response.headers, 'referrer-policy', true, 'Use a deliberate referrer policy such as strict-origin-when-cross-origin.'),
    headerFinding(response.headers, 'x-content-type-options', true, 'Set X-Content-Type-Options: nosniff.'),
    headerFinding(response.headers, 'cross-origin-opener-policy', true, 'Consider COOP when cross-origin isolation is required.'),
  ];
  const headerScore = Math.round((headers.filter((h) => h.present).length / headers.length) * 100);
  const trackers = html ? detectTrackers(html, finalUrl) : [];
  const privacyScore = Math.max(0, Math.min(100, Math.round(headerScore - trackers.length * 7)));
  const securityScore = Math.max(0, Math.min(100, headerScore - (response.url.startsWith('https://') ? 0 : 50)));

  const cookieHeader = response.headers.get('set-cookie');
  const cookies = cookieHeader ? cookieHeader.split(/,(?=[^;]+=[^;]+)/).slice(0, 20).map((value) => value.split(';', 1)[0].trim().split('=', 1)[0]) : [];
  const cookieFindings = cookies.map((name) => ({ name, secure: /secure/i.test(cookieHeader || ''), httpOnly: /httponly/i.test(cookieHeader || ''), sameSite: /samesite=/i.test(cookieHeader || '') }));

  return {
    input,
    finalUrl: finalUrl.toString(),
    status: response.status,
    ok: response.ok,
    contentType,
    responseTimeMs: Date.now() - started,
    redirectCount,
    headers,
    cookies: cookieFindings,
    trackers,
    scores: { privacy: privacyScore, security: securityScore, headers: headerScore },
    limitations: [
      'This is a server-side static audit of the fetched response.',
      'It does not execute page JavaScript, so browser-only trackers and runtime requests can be missed.',
      'Tracker findings are signature-based and are not a global threat-intelligence verdict.',
    ],
    evidence: { fetchedBytes: Math.min(MAX_HTML_BYTES, html.length), htmlAnalyzed: Boolean(html), source: 'server_fetched_response' },
  };
}
