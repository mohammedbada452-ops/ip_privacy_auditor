import { validateIp } from '../utils/ipExtractor';

export interface ReverseDnsResult {
  status: 'MEASURED' | 'NOT_MEASURED' | 'UNAVAILABLE' | 'ERROR';
  names: string[];
  resolver: string | null;
  dnssecValidated: boolean | null;
  note: string;
}

interface DohAnswer { type?: number; data?: string }
interface DohPayload { Status?: number; AD?: boolean; Answer?: DohAnswer[] }

function reverseName(ip: string): string {
  if (ip.includes(':')) {
    const hex = ip.split('::').length === 2
      ? expandIpv6(ip)
      : ip;
    return `${hex.replace(/:/g, '').split('').reverse().join('.')}.ip6.arpa`;
  }
  return `${ip.split('.').reverse().join('.')}.in-addr.arpa`;
}

function expandIpv6(ip: string): string {
  const parts = ip.split('::');
  const left = parts[0] ? parts[0].split(':') : [];
  const right = parts[1] ? parts[1].split(':') : [];
  const missing = 8 - left.length - right.length;
  return [...left, ...Array(Math.max(0, missing)).fill('0'), ...right].map((x) => x.padStart(4, '0')).join(':');
}

class ReverseDnsService {
  private cache = new Map<string, { data: ReverseDnsResult; expiresAt: number }>();
  private readonly ttlMs = 60 * 60 * 1000;
  private readonly maxEntries = 1000;

  public async lookup(ip: string): Promise<ReverseDnsResult> {
    const validation = validateIp(ip);
    if (!validation.isValid) throw new Error('Invalid IP address format.');
    if (!validation.isPublic) return { status: 'NOT_MEASURED', names: [], resolver: null, dnssecValidated: null, note: 'Reverse DNS is only queried for publicly routable IP addresses.' };
    const key = validation.normalizedIp;
    const now = Date.now();
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > now) {
      this.cache.delete(key);
      this.cache.set(key, cached);
      return cached.data;
    }
    if (cached) this.cache.delete(key);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    try {
      const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(reverseName(key))}&type=PTR`;
      const response = await fetch(url, { headers: { Accept: 'application/dns-json' }, signal: controller.signal });
      if (!response.ok) throw new Error(`DoH HTTP ${response.status}`);
      const text = await response.text();
      if (text.length > 100_000) throw new Error('DoH response exceeds safe payload limit.');
      const payload = JSON.parse(text) as DohPayload;
      const names = (payload.Answer || [])
        .filter((item) => item.type === 12 && typeof item.data === 'string')
        .map((item) => item.data!.replace(/\.$/, ''))
        .filter((value, index, list) => value.length <= 253 && list.indexOf(value) === index)
        .slice(0, 10);
      const result: ReverseDnsResult = {
        status: names.length ? 'MEASURED' : 'UNAVAILABLE',
        names,
        resolver: 'Cloudflare 1.1.1.1 DoH',
        dnssecValidated: typeof payload.AD === 'boolean' ? payload.AD : null,
        note: names.length ? 'Reverse DNS records resolved through Cloudflare DNS over HTTPS.' : 'No PTR record was returned for this address.',
      };
      this.cache.delete(key);
      this.cache.set(key, { data: result, expiresAt: Date.now() + this.ttlMs });
      while (this.cache.size > this.maxEntries) {
        const oldestKey = this.cache.keys().next().value as string | undefined;
        if (!oldestKey) break;
        this.cache.delete(oldestKey);
      }
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[Reverse DNS] lookup failed: ${message}`);
      return { status: 'ERROR', names: [], resolver: 'Cloudflare 1.1.1.1 DoH', dnssecValidated: null, note: 'Reverse DNS is temporarily unavailable; existing IP and privacy results are unaffected.' };
    } finally { clearTimeout(timeoutId); }
  }
}

export const reverseDnsService = new ReverseDnsService();
