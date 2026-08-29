import type { GeoIPResult, IGeoIPProvider } from './IGeoIPProvider';
import { validateIp } from '../../utils/ipExtractor';

interface IpInfoLitePayload {
  ip?: string;
  asn?: string;
  as_name?: string;
  as_domain?: string;
  country_code?: string;
  country?: string;
  continent_code?: string;
  continent?: string;
}

export class IpInfoLiteProvider implements IGeoIPProvider {
  public readonly name = 'IPinfo Lite';
  private readonly token: string;
  private readonly timeoutMs: number;
  private readonly baseUrl = 'https://api.ipinfo.io/lite';

  constructor(options: { token?: string; timeoutMs?: number } = {}) {
    this.token = (options.token || process.env.IPINFO_TOKEN || '').trim();
    this.timeoutMs = options.timeoutMs || 5000;
  }

  public async lookup(ip: string): Promise<GeoIPResult> {
    const validation = validateIp(ip);
    if (!validation.isValid) throw new Error(`Invalid IP address format: '${ip}'`);
    if (!validation.isPublic) {
      return {
        geo: { country: 'Private Network', countryCode: 'PRIVATE', region: '', city: '', postalCode: '', latitude: null, longitude: null, timezone: '' },
        network: { isp: 'Private Network', organization: 'Local Scope', asn: '—', isMobile: null, isProxy: null, isVpn: null, isTor: null, isHosting: null, provider: this.name, providerStatus: 'FALLBACK' },
      };
    }
    if (!this.token) throw new Error('IPinfo Lite token is not configured.');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl}/${encodeURIComponent(validation.normalizedIp)}?token=${encodeURIComponent(this.token)}`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`IPinfo Lite HTTP ${response.status}`);
      const text = await response.text();
      if (text.length > 50000) throw new Error('IPinfo Lite response exceeds maximum safe payload size.');
      const data = JSON.parse(text) as IpInfoLitePayload;
      if (typeof data.ip === 'string') {
        const returnedIp = validateIp(data.ip);
        if (!returnedIp.isValid || returnedIp.normalizedIp !== validation.normalizedIp) {
          throw new Error('IPinfo Lite returned data for a different IP address.');
        }
      }
      const countryCode = typeof data.country_code === 'string' && /^[A-Za-z]{2}$/.test(data.country_code) ? data.country_code.toUpperCase() : 'XX';
      return {
        geo: {
          country: typeof data.country === 'string' && data.country.trim() ? data.country : 'Unknown',
          countryCode,
          region: '',
          city: '',
          postalCode: '',
          latitude: null,
          longitude: null,
          timezone: '',
        },
        network: {
          isp: typeof data.as_name === 'string' && data.as_name.trim() ? data.as_name : 'Unknown',
          organization: typeof data.as_name === 'string' && data.as_name.trim() ? data.as_name : 'Unknown',
          asn: typeof data.asn === 'string' && /^AS?\d+$/i.test(data.asn.trim()) ? (data.asn.toUpperCase().startsWith('AS') ? data.asn.toUpperCase() : `AS${data.asn.trim()}`) : '—',
          isMobile: null,
          isProxy: null,
          isVpn: null,
          isTor: null,
          isHosting: null,
          provider: this.name,
          providerStatus: 'VERIFIED',
        },
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') throw new Error(`IPinfo Lite request timed out after ${this.timeoutMs}ms`);
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
