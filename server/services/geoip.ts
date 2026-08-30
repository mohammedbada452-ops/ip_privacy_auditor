import type { GeoIPResult, IGeoIPProvider } from '../providers/geoip/IGeoIPProvider';
import { HackMyIPProvider } from '../providers/geoip/HackMyIPProvider';
import { FallbackGeoIPProvider } from '../providers/geoip/FallbackGeoIPProvider';
import { IpApiProvider } from '../providers/geoip/IpApiProvider';
import { MockGeoIPProvider } from '../providers/geoip/MockGeoIPProvider';
import { IpInfoLiteProvider } from '../providers/geoip/IpInfoLiteProvider';
import { validateIp } from '../utils/ipExtractor';
import { getRequestEnv } from '../config/requestEnv';

interface CacheEntry {
  data: GeoIPResult;
  expiresAt: number;
}

export function createDefaultGeoIPProvider(): IGeoIPProvider {
  const providerType = (getRequestEnv('GEOIP_PROVIDER') || 'hackmyip').toLowerCase().trim();
  if (providerType === 'mock' && !['test', 'development'].includes((getRequestEnv('NODE_ENV') || '').toLowerCase())) {
    throw new Error('Mock GeoIP provider is disabled outside test/development environments.');
  }

  switch (providerType) {
    case 'ipapi':
      return new IpApiProvider();
    case 'mock':
      return new MockGeoIPProvider();
    case 'fallback':
      return new FallbackGeoIPProvider();
    case 'ipinfo-lite':
      return new IpInfoLiteProvider();
    case 'hackmyip':
    default:
      return new HackMyIPProvider();
  }
}

export class GeoIPService {
  private provider: IGeoIPProvider;
  private fallbackProvider: IGeoIPProvider;
  private cache = new Map<string, CacheEntry>();
  private maxCacheSize = 1000;
  private ttlMs = 3600000; // 1 hour TTL

  constructor(provider?: IGeoIPProvider) {
    this.provider = provider || createDefaultGeoIPProvider();
    this.fallbackProvider = new FallbackGeoIPProvider();
  }

  public setProvider(provider: IGeoIPProvider): void {
    this.provider = provider;
  }

  public getProvider(): IGeoIPProvider {
    return this.provider;
  }

  /**
   * Look up network & GeoIP intelligence for target IP with bounded caching.
   * On provider failure, logs notice and safely delegates to FallbackGeoIPProvider.
   */
  public async getDetails(ip: string): Promise<GeoIPResult> {
    const validation = validateIp(ip);

    if (!validation.isValid) {
      throw new Error(`Invalid IP address format: '${ip}'`);
    }

    const normalizedIp = validation.normalizedIp;
    const now = Date.now();

    // Check bounded in-memory cache
    const cached = this.cache.get(normalizedIp);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    // Provider failure must remain UNKNOWN for public IP intelligence.
    let result: GeoIPResult;
    try {
      result = await this.provider.lookup(normalizedIp);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[GeoIPService] Provider '${this.provider.name}' failed: ${errMsg}`);

      // Optional free secondary source: IPinfo Lite. It requires only a free token
      // and intentionally supplements, rather than replaces, the current provider.
      if (getRequestEnv('IPINFO_TOKEN') && this.provider.name !== 'IPinfo Lite' && validation.isPublic) {
        try {
          result = await new IpInfoLiteProvider({ token: getRequestEnv('IPINFO_TOKEN') }).lookup(normalizedIp);
        } catch (secondaryErr: unknown) {
          const secondaryMessage = secondaryErr instanceof Error ? secondaryErr.message : String(secondaryErr);
          console.warn(`[GeoIPService] IPinfo Lite fallback failed: ${secondaryMessage}`);
          if (validation.isPrivate || validation.isLoopback || validation.isLinkLocal || validation.isCGNAT || validation.isReserved) {
            result = await this.fallbackProvider.lookup(normalizedIp);
          } else {
            throw new Error('Network intelligence providers unavailable; VPN, proxy, Tor and hosting status are unknown.');
          }
        }
      } else if (validation.isPrivate || validation.isLoopback || validation.isLinkLocal || validation.isCGNAT || validation.isReserved) {
        result = await this.fallbackProvider.lookup(normalizedIp);
      } else {
        throw new Error('Network intelligence provider unavailable; VPN, proxy, Tor and hosting status are unknown.');
      }
    }

    // Store in cache (maintain max cache size bound)
    if (this.cache.size >= this.maxCacheSize) {
      // Evict oldest entry
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(normalizedIp, {
      data: result,
      expiresAt: now + this.ttlMs,
    });

    return result;
  }


  public async getMultiSourceDetails(ip: string): Promise<{ primary: GeoIPResult; observations: Array<{ provider: string; status: 'VERIFIED' | 'UNAVAILABLE' | 'ERROR'; countryCode: string | null; country: string | null; asn: string | null }>; consensus: { countryCode: string | null; asn: string | null; agreement: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE' } }> {
    const validation = validateIp(ip);
    if (!validation.isValid) throw new Error(`Invalid IP address format: '${ip}'`);
    const normalizedIp = validation.normalizedIp;
    const observations: Array<{ provider: string; status: 'VERIFIED' | 'UNAVAILABLE' | 'ERROR'; countryCode: string | null; country: string | null; asn: string | null }> = [];
    const primary = await this.getDetails(normalizedIp);
    observations.push({
      provider: primary.network.provider || this.provider.name,
      status: primary.network.providerStatus === 'VERIFIED' ? 'VERIFIED' : 'UNAVAILABLE',
      countryCode: primary.geo.countryCode || null,
      country: primary.geo.country || null,
      asn: /^AS\d+$/i.test(primary.network.asn || '') ? primary.network.asn.toUpperCase() : null,
    });
    if (getRequestEnv('IPINFO_TOKEN') && validation.isPublic && this.provider.name !== 'IPinfo Lite') {
      try {
        const secondary = await new IpInfoLiteProvider({ token: getRequestEnv('IPINFO_TOKEN') }).lookup(normalizedIp);
        observations.push({ provider: 'IPinfo Lite', status: 'VERIFIED', countryCode: secondary.geo.countryCode || null, country: secondary.geo.country || null, asn: /^AS\d+$/i.test(secondary.network.asn || '') ? secondary.network.asn.toUpperCase() : null });
      } catch {
        observations.push({ provider: 'IPinfo Lite', status: 'ERROR', countryCode: null, country: null, asn: null });
      }
    }
    const valid = observations.filter((o) => o.status === 'VERIFIED');
    const countryCounts = new Map<string, number>();
    const asnCounts = new Map<string, number>();
    for (const o of valid) { if (o.countryCode && o.countryCode !== 'XX') countryCounts.set(o.countryCode, (countryCounts.get(o.countryCode) || 0) + 1); if (o.asn) asnCounts.set(o.asn, (asnCounts.get(o.asn) || 0) + 1); }
    const pick = (map: Map<string, number>) => [...map.entries()].sort((a,b)=>b[1]-a[1])[0] || null;
    const countryWinner = pick(countryCounts);
    const asnWinner = pick(asnCounts);
    const winnerVotes = Math.max(countryWinner?.[1] || 0, asnWinner?.[1] || 0);
    const agreement = valid.length < 2 ? 'LOW' : winnerVotes === valid.length ? 'HIGH' : winnerVotes >= 2 ? 'MEDIUM' : 'LOW';
    return { primary, observations, consensus: { countryCode: countryWinner?.[0] || null, asn: asnWinner?.[0] || null, agreement } };
  }
  public clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance for app routes
export const geoIpService = new GeoIPService();
export const geoIPService = geoIpService;

