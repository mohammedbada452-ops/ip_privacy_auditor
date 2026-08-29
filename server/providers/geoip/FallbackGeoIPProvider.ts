import type { GeoIPResult, IGeoIPProvider } from './IGeoIPProvider';
import { validateIp } from '../../utils/ipExtractor';

export class FallbackGeoIPProvider implements IGeoIPProvider {
  public readonly name = 'FallbackGeoIPProvider';

  public async lookup(ip: string): Promise<GeoIPResult> {
    const validation = validateIp(ip);

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
          provider: this.name,
          providerStatus: 'FALLBACK',
        },
      };
    }

    return {
      geo: {
        country: 'Unavailable',
        countryCode: 'XX',
        region: '',
        city: '',
        postalCode: '',
        latitude: null,
        longitude: null,
        timezone: '',
      },
      network: {
        isp: 'Unavailable',
        organization: 'Unavailable',
        asn: '—',
        isMobile: null,
        isProxy: null,
        isVpn: null,
        isTor: null,
        isHosting: null,
        provider: this.name,
        providerStatus: 'UNAVAILABLE',
      },
    };
  }
}
