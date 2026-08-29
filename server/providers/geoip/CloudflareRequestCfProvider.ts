import type { IGeoIPProvider, GeoIPResult } from './IGeoIPProvider';
import { validateIp } from '../../utils/ipExtractor';

/**
 * Uses Cloudflare's authoritative per-request `request.cf` metadata passed to
 * the Express adapter through internal headers by the Worker.
 * This is only intended for the current client request, not arbitrary IPs.
 */
export class CloudflareRequestCfProvider implements IGeoIPProvider {
  public readonly name = 'Cloudflare Edge';

  public constructor(private readonly headers: Record<string, string | string[] | undefined>) {}

  private stringValue(name: string): string {
    const value = this.headers[name.toLowerCase()];
    return Array.isArray(value) ? String(value[0] ?? '') : typeof value === 'string' ? value : '';
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

    if (process.env.PRIVASEC_CLOUDFLARE_EDGE !== 'true') {
      throw new Error('Cloudflare edge bridge is not active.');
    }

    const observedIp = this.stringValue('x-privasec-observed-ip');
    if (!observedIp || validateIp(observedIp).normalizedIp !== validation.normalizedIp) {
      throw new Error('Cloudflare edge metadata is not bound to the requested client IP.');
    }

    const countryCode = this.stringValue('x-privasec-cf-country').toUpperCase();
    const region = this.stringValue('x-privasec-cf-region');
    const city = this.stringValue('x-privasec-cf-city');
    const postalCode = this.stringValue('x-privasec-cf-postal-code');
    const timezone = this.stringValue('x-privasec-cf-timezone');
    const asnRaw = this.stringValue('x-privasec-cf-asn');
    const asOrg = this.stringValue('x-privasec-cf-as-organization');
    const latitudeRawText = this.stringValue('x-privasec-cf-latitude');
    const longitudeRawText = this.stringValue('x-privasec-cf-longitude');
    const latitudeRaw = latitudeRawText ? Number(latitudeRawText) : NaN;
    const longitudeRaw = longitudeRawText ? Number(longitudeRawText) : NaN;

    const hasAny = Boolean(countryCode || city || region || postalCode || timezone || asnRaw || asOrg || latitudeRawText || longitudeRawText);
    if (!hasAny) throw new Error('Cloudflare request.cf metadata is unavailable for this request.');

    const latitude = Number.isFinite(latitudeRaw) && latitudeRaw >= -90 && latitudeRaw <= 90 ? latitudeRaw : null;
    const longitude = Number.isFinite(longitudeRaw) && longitudeRaw >= -180 && longitudeRaw <= 180 ? longitudeRaw : null;
    const asnMatch = asnRaw.match(/^AS?(\d+)$/i);

    return {
      geo: {
        country: countryCode || 'Unknown',
        countryCode: /^[A-Z]{2}$/.test(countryCode) ? countryCode : 'XX',
        region,
        city,
        postalCode,
        latitude,
        longitude,
        timezone,
      },
      network: {
        isp: asOrg || 'Cloudflare-observed ASN',
        organization: asOrg || 'Cloudflare-observed ASN',
        asn: asnMatch ? `AS${asnMatch[1]}` : '—',
        isMobile: null,
        isProxy: null,
        isVpn: null,
        isTor: null,
        isHosting: null,
        provider: this.name,
        providerStatus: 'VERIFIED',
      },
    };
  }
}
