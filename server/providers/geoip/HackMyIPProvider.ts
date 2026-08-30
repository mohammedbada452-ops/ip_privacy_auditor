import type { GeoIPResult, IGeoIPProvider } from './IGeoIPProvider';
import { validateIp } from '../../utils/ipExtractor';

interface HackMyIPLocation {
  city?: string;
  region?: string;
  country?: string;
  country_code?: string;
  country_name?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  postal_code?: string;
}

interface HackMyIPNetwork {
  asn?: number | string;
  isp?: string;
  org?: string;
  connection_type?: string;
}

interface HackMyIPPrivacy {
  hosting?: boolean;
  proxy?: boolean;
  mobile?: boolean;
  score?: number;
  grade?: string;
  type?: string;
  is_vpn?: boolean;
  is_datacenter?: boolean;
  is_residential?: boolean;
  is_proxy?: boolean;
  is_tor?: boolean;
  is_mobile?: boolean;
  is_hosting?: boolean;
}

interface HackMyIPResponse {
  success?: boolean;
  data?: {
    ip?: string;
    location?: HackMyIPLocation;
    network?: HackMyIPNetwork;
    privacy?: HackMyIPPrivacy;
  };
  error?: string;
  message?: string;
}

/**
 * HackMyIPProvider
 *
 * Primary production GeoIP provider using the secure HTTPS HackMyIP API.
 * Endpoint: https://hackmyip.com/api/lookup?ip={IP}
 *
 * Features:
 * - Direct HTTPS endpoint without requiring third-party API key signup
 * - Rich IPv4 & IPv6 geographic and ASN resolution
 * - Strict 5000ms AbortController bounded timeout
 * - Zero transmission of client fingerprint or cookies (only normalized IP)
 * - Safe response size and schema validation
 */
export class HackMyIPProvider implements IGeoIPProvider {
  public readonly name = 'HackMyIPProvider';
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: { baseUrl?: string; timeoutMs?: number } = {}) {
    this.baseUrl = options.baseUrl || 'https://hackmyip.com/api/lookup';
    this.timeoutMs = options.timeoutMs || 5000;
  }

  public async lookup(ip: string): Promise<GeoIPResult> {
    const validation = validateIp(ip);

    // Filter out non-routable / private ranges prior to external request
    if (!validation.isValid) {
      throw new Error(`Invalid IP address format: '${ip}'`);
    }

    if (validation.isPrivate || validation.isLoopback || validation.isLinkLocal || validation.isCGNAT || validation.isReserved) {
      return {
        geo: {
          country: 'Private Network',
          countryCode: 'PRIVATE',
          region: '',
          city: '',
          postalCode: '',
          latitude: null,
          longitude: null,
          timezone: '',
        },
        network: {
          isp: 'Private Network',
          organization: 'Local Scope',
          asn: '—',
          isMobile: null,
          isProxy: null,
          isVpn: null,
          isTor: null,
          isHosting: null,
          providerStatus: 'FALLBACK',
          provider: this.name,
        },
      };
    }

    const normalizedIp = validation.normalizedIp;
    const url = `${this.baseUrl}?ip=${encodeURIComponent(normalizedIp)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'PrivacyAuditor-GeoIP/1.0',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HackMyIP Provider HTTP ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      // Cap response size check (protect memory)
      if (text.length > 50000) {
        throw new Error('HackMyIP Provider response exceeds maximum safe payload size');
      }

      let payload: HackMyIPResponse;
      try {
        payload = JSON.parse(text) as HackMyIPResponse;
      } catch {
        throw new Error('HackMyIP Provider returned malformed non-JSON response');
      }

      if (!payload || typeof payload !== 'object' || payload.success === false || !payload.data) {
        const errorMsg = payload?.error || payload?.message || 'Unsuccessful lookup response';
        throw new Error(`HackMyIP Lookup Failed: ${errorMsg}`);
      }

      const data = payload.data;
      if (data.ip) {
        const returnedIp = validateIp(String(data.ip));
        if (!returnedIp.isValid || returnedIp.normalizedIp !== normalizedIp) {
          throw new Error('HackMyIP Provider returned data for a different IP address.');
        }
      }
      const location = data.location || {};
      const network = data.network || {};
      const privacy = data.privacy || {};

      const isp = location && !network.isp && !network.org ? 'Unknown' : (network.isp || network.org || 'Unknown');
      const org = network.org || network.isp || isp;

      // Extract ASN with safe formatting
      let asnFormatted = '—';
      if (network.asn !== undefined && network.asn !== null && network.asn !== '' && network.asn !== 0 && network.asn !== '0') {
        const asnStr = String(network.asn).trim();
        asnFormatted = asnStr.toUpperCase().startsWith('AS') ? asnStr.toUpperCase() : `AS${asnStr}`;
      }

      // Explicit privacy signal evaluation (independent flags, zero cross-inference)
      const isHosting = typeof privacy.hosting === 'boolean' || typeof privacy.is_datacenter === 'boolean' || typeof privacy.is_hosting === 'boolean'
        ? Boolean(privacy.hosting || privacy.is_datacenter || privacy.is_hosting)
        : null;
      const isProxy = typeof privacy.proxy === 'boolean' || typeof privacy.is_proxy === 'boolean'
        ? Boolean(privacy.proxy || privacy.is_proxy)
        : null;
      const isVpn = typeof privacy.is_vpn === 'boolean' ? privacy.is_vpn : null;
      const isTor = typeof privacy.is_tor === 'boolean' ? privacy.is_tor : null;
      const isMobile = typeof privacy.mobile === 'boolean' || typeof privacy.is_mobile === 'boolean'
        ? Boolean(privacy.mobile || privacy.is_mobile)
        : null;

      const rawLatitude = Number(location.latitude);
      const rawLongitude = Number(location.longitude);
      const latitude = Number.isFinite(rawLatitude) && rawLatitude >= -90 && rawLatitude <= 90 ? rawLatitude : null;
      const longitude = Number.isFinite(rawLongitude) && rawLongitude >= -180 && rawLongitude <= 180 ? rawLongitude : null;
      const rawCountryCode = String(location.country_code || location.country || '').trim();
      const countryCode = /^[A-Za-z]{2}$/.test(rawCountryCode) ? rawCountryCode.toUpperCase() : 'XX';
      const countryName = String(location.country_name || '').trim() || countryCode;
      const rawPrivacyScore = Number(privacy.score);
      const privacyScore = Number.isFinite(rawPrivacyScore) && rawPrivacyScore >= 0 && rawPrivacyScore <= 100 ? Math.round(rawPrivacyScore) : null;
      const privacyGrade = String(privacy.grade || '').trim() || null;
      const networkType = String(privacy.type || network.connection_type || '').trim() || null;

      return {
        geo: {
          country: countryName || 'Unknown',
          countryCode,
          region: location.region || '',
          city: location.city || '',
          postalCode: location.postal_code || '',
          latitude,
          longitude,
          timezone: location.timezone || '',
        },
        network: {
          isp,
          organization: org,
          asn: asnFormatted,
          asOrganization: org || null,
          isMobile,
          isProxy,
          isVpn,
          isTor,
          isHosting,
          privacyScore,
          privacyGrade,
          networkType,
          provider: this.name,
          providerStatus: 'VERIFIED',
        },
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          throw new Error(`HackMyIP Provider request timed out after ${this.timeoutMs}ms`);
        }
        throw err;
      }
      throw new Error('Unknown error during HackMyIP provider lookup');
    }
  }
}
