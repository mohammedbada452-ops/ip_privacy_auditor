export interface GeoIPResult {
  geo: {
    country: string;
    countryCode: string;
    region: string;
    city: string;
    postalCode: string;
    latitude: number | null;
    longitude: number | null;
    timezone: string;
  };
  network: {
    isp: string;
    organization: string;
    asn: string;
    isMobile: boolean | null;
    isProxy: boolean | null;
    isVpn: boolean | null;
    isTor: boolean | null;
    isHosting: boolean | null;
    provider: string;
    providerStatus: 'VERIFIED' | 'UNAVAILABLE' | 'FALLBACK';
  };
}

export interface IGeoIPProvider {
  readonly name: string;
  lookup(ip: string): Promise<GeoIPResult>;
}
