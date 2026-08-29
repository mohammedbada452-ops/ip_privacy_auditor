import type { GeoIPResult, IGeoIPProvider } from './IGeoIPProvider';
import { FallbackGeoIPProvider } from './FallbackGeoIPProvider';
import { validateIp } from '../../utils/ipExtractor';

export interface IpApiConfig {
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
}

interface IpApiResponsePayload {
  status: 'success' | 'fail';
  message?: string;
  country?: string;
  countryCode?: string;
  regionName?: string;
  city?: string;
  zip?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  isp?: string;
  org?: string;
  as?: string;
  mobile?: boolean;
  proxy?: boolean;
  hosting?: boolean;
  vpn?: boolean;
  tor?: boolean;
  query?: string;
}

export class IpApiProvider implements IGeoIPProvider {
  public readonly name = 'ip-api';
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly timeoutMs: number;
  private readonly fallbackProvider = new FallbackGeoIPProvider();

  constructor(config: IpApiConfig = {}) {
    this.baseUrl = config.baseUrl || 'https://ip-api.com/json/';
    this.apiKey = config.apiKey || process.env.GEOIP_API_KEY;
    this.timeoutMs = config.timeoutMs || 5000;
  }

  public toJSON() {
    return {
      name: this.name,
      baseUrl: this.baseUrl,
      timeoutMs: this.timeoutMs,
      hasApiKey: Boolean(this.apiKey),
    };
  }

  public async lookup(ip: string): Promise<GeoIPResult> {
    const validation = validateIp(ip);

    // Don't issue external requests for private, loopback, or invalid addresses
    if (!validation.isValid || validation.isPrivate) {
      return this.fallbackProvider.lookup(ip);
    }

    const fields = 'status,message,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as,mobile,proxy,hosting,vpn,tor,query';
    
    let url = `${this.baseUrl}${encodeURIComponent(ip)}?fields=${fields}`;
    if (this.apiKey) {
      url += `&key=${encodeURIComponent(this.apiKey)}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      let providerUsed: 'ip-api' | 'ipwho.is' = 'ip-api';
      let response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'PrivacyAuditor-GeoIP/1.0',
        },
      });

      // Never downgrade GeoIP transport to plaintext HTTP. If the primary provider rejects
      // the request (for example, a free-tier HTTPS restriction), use the secondary HTTPS provider.
      if (response.status === 403 && !this.apiKey && url.includes('ip-api.com')) {
        const secondaryUrl = `https://ipwho.is/${encodeURIComponent(ip)}`;
        providerUsed = 'ipwho.is';
        response = await fetch(secondaryUrl, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
      }

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`GeoIP Provider HTTP ${response.status}: ${response.statusText}`);
      }

      const rawJson = (await response.json()) as Record<string, unknown>;

      // Handle ipwho.is response format if secondary provider was invoked
      if (rawJson && typeof rawJson.success === 'boolean') {
        if (!rawJson.success) {
          throw new Error(`GeoIP Lookup Failed: ${rawJson.message || 'Unknown error'}`);
        }
        const conn = (rawJson.connection as Record<string, unknown>) || {};
        const tz = (rawJson.timezone as Record<string, unknown>) || {};
        const security = (rawJson.security as Record<string, unknown>) || {};
        const isp = String(conn.isp || '');
        const org = String(conn.org || isp);
        const hasBool = (v: unknown): v is boolean => typeof v === 'boolean';

        return {
          geo: {
            country: String(rawJson.country || 'Unknown'),
            countryCode: String(rawJson.country_code || 'XX'),
            region: String(rawJson.region || ''),
            city: String(rawJson.city || ''),
            postalCode: String(rawJson.postal || ''),
            latitude: typeof rawJson.latitude === 'number' ? rawJson.latitude : null,
            longitude: typeof rawJson.longitude === 'number' ? rawJson.longitude : null,
            timezone: String(tz.id || ''),
          },
          network: {
            isp,
            organization: org,
            asn: conn.asn ? `AS${conn.asn}` : '—',
            isMobile: hasBool(conn.mobile) ? conn.mobile as boolean : null,
            isProxy: hasBool(security.proxy) ? security.proxy as boolean : null,
            isVpn: hasBool(security.vpn) ? security.vpn as boolean : null,
            isTor: hasBool(security.tor) ? security.tor as boolean : null,
            isHosting: hasBool(security.hosting) ? security.hosting as boolean : null,
            provider: providerUsed,
            providerStatus: 'VERIFIED',
          },
        };
      }

      const data = rawJson as unknown as IpApiResponsePayload;

      if (data.status !== 'success') {
        throw new Error(`GeoIP Lookup Failed: ${data.message || 'Unknown error'}`);
      }

      // Format ASN cleanly (e.g. "AS13335 Cloudflare, Inc." -> "AS13335")
      let asn = '—';
      if (data.as) {
        const match = /^(AS\d+)/i.exec(data.as.trim());
        asn = match ? match[1] : data.as.split(' ')[0] || '—';
      }

      const isProxy = typeof data.proxy === 'boolean' ? data.proxy : null;
      const isHosting = typeof data.hosting === 'boolean' ? data.hosting : null;

      // VPN/Tor are only reported when the provider explicitly supplies those fields.
      // Never infer them from arbitrary ISP/organization text because that creates false positives.
      const isVpn = typeof data.vpn === 'boolean' ? data.vpn : null;
      const isTor = typeof data.tor === 'boolean' ? data.tor : null;

      return {
        geo: {
          country: data.country || 'Unknown',
          countryCode: data.countryCode || 'XX',
          region: data.regionName || '',
          city: data.city || '',
          postalCode: data.zip || '',
          latitude: typeof data.lat === 'number' ? data.lat : null,
          longitude: typeof data.lon === 'number' ? data.lon : null,
          timezone: data.timezone || '',
        },
        network: {
          isp: data.isp || '',
          organization: data.org || data.isp || '',
          asn,
          isMobile: typeof data.mobile === 'boolean' ? data.mobile : null,
          isProxy,
          isVpn,
          isTor,
          isHosting,
          provider: providerUsed,
          providerStatus: 'VERIFIED',
        },
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);

      // On timeout or external provider failure, return fallback gracefully
      const errorMessage = err instanceof Error ? err.message : 'Unknown network failure';
      console.warn(`[GeoIPService] Provider '${this.name}' failed: ${errorMessage}. Using fallback/unknown state.`);

      return this.fallbackProvider.lookup(ip);
    }
  }
}
