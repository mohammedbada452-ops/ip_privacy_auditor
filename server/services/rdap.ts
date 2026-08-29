import { validateIp } from '../utils/ipExtractor';

export interface RdapNetworkInfo {
  status: 'MEASURED' | 'NOT_MEASURED' | 'UNAVAILABLE' | 'ERROR';
  source: string | null;
  handle: string | null;
  name: string | null;
  country: string | null;
  startAddress: string | null;
  endAddress: string | null;
  cidr: string | null;
  networkType: string | null;
  note: string;
}

interface RdapPayload {
  handle?: string;
  name?: string;
  country?: string;
  startAddress?: string;
  endAddress?: string;
  ipVersion?: string;
  type?: string;
  cidr0_cidrs?: Array<{ v4prefix?: string; v6prefix?: string; length?: number }>;
  remarks?: Array<{ title?: string; description?: string[] }>;
}

class RdapService {
  private cache = new Map<string, { data: RdapNetworkInfo; expiresAt: number }>();
  private readonly ttlMs = 6 * 60 * 60 * 1000;
  private readonly maxEntries = 256;
  private readonly endpoint = 'https://rdap.org/ip/';

  public async lookup(ip: string): Promise<RdapNetworkInfo> {
    const validation = validateIp(ip);
    if (!validation.isValid) throw new Error('Invalid IP address format.');
    if (!validation.isPublic) {
      return { status: 'NOT_MEASURED', source: null, handle: null, name: null, country: null, startAddress: null, endAddress: null, cidr: null, networkType: null, note: 'RDAP registration data is only queried for publicly routable IP addresses.' };
    }
    const key = validation.normalizedIp;
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.data;
    if (cached) this.cache.delete(key);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    try {
      const response = await fetch(`${this.endpoint}${encodeURIComponent(key)}`, {
        headers: { Accept: 'application/rdap+json, application/json' },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`RDAP HTTP ${response.status}`);
      const text = await response.text();
      if (text.length > 200_000) throw new Error('RDAP response exceeds the safe payload limit.');
      const payload = JSON.parse(text) as RdapPayload;
      const cidr = payload.cidr0_cidrs?.[0]
        ? (payload.cidr0_cidrs[0].v4prefix || payload.cidr0_cidrs[0].v6prefix)
          ? `${payload.cidr0_cidrs[0].v4prefix || payload.cidr0_cidrs[0].v6prefix}/${payload.cidr0_cidrs[0].length ?? ''}`.replace(/\/$/, '')
          : null
        : null;
      const result: RdapNetworkInfo = {
        status: 'MEASURED',
        source: 'RDAP',
        handle: typeof payload.handle === 'string' ? payload.handle : null,
        name: typeof payload.name === 'string' ? payload.name : null,
        country: typeof payload.country === 'string' ? payload.country.toUpperCase() : null,
        startAddress: typeof payload.startAddress === 'string' ? payload.startAddress : null,
        endAddress: typeof payload.endAddress === 'string' ? payload.endAddress : null,
        cidr,
        networkType: typeof payload.type === 'string' ? payload.type : null,
        note: 'RDAP registration data comes from the authoritative registry service selected through the RDAP bootstrap ecosystem.',
      };
      this.cache.set(key, { data: result, expiresAt: Date.now() + this.ttlMs });
      if (this.cache.size > this.maxEntries) {
        const oldest = this.cache.keys().next().value;
        if (oldest) this.cache.delete(oldest);
      }
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[RDAP] lookup failed: ${message}`);
      return { status: 'ERROR', source: 'RDAP', handle: null, name: null, country: null, startAddress: null, endAddress: null, cidr: null, networkType: null, note: 'RDAP is temporarily unavailable; existing IP and privacy results are unaffected.' };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const rdapService = new RdapService();
