import type { GeoIPResult, IGeoIPProvider } from './IGeoIPProvider';

export class MockGeoIPProvider implements IGeoIPProvider {
  public readonly name = 'MockGeoIPProvider';
  private shouldFail = false;
  private shouldTimeout = false;
  private customResult?: GeoIPResult;

  constructor(options: { shouldFail?: boolean; shouldTimeout?: boolean; customResult?: GeoIPResult } = {}) {
    this.shouldFail = Boolean(options.shouldFail);
    this.shouldTimeout = Boolean(options.shouldTimeout);
    this.customResult = options.customResult;
  }

  public setShouldFail(fail: boolean) {
    this.shouldFail = fail;
  }

  public setShouldTimeout(timeout: boolean) {
    this.shouldTimeout = timeout;
  }

  public setCustomResult(result?: GeoIPResult) {
    this.customResult = result;
  }

  public async lookup(ip: string): Promise<GeoIPResult> {
    if (this.shouldTimeout) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      throw new Error('MockGeoIPProvider: Request timed out');
    }

    if (this.shouldFail) {
      throw new Error('MockGeoIPProvider: Simulated provider error');
    }

    if (this.customResult) {
      return this.customResult;
    }

    return {
      geo: {
        country: 'United States',
        countryCode: 'US',
        region: 'California',
        city: 'San Francisco',
        postalCode: '94105',
        latitude: 37.7749,
        longitude: -122.4194,
        timezone: 'America/Los_Angeles',
      },
      network: {
        isp: 'Cloudflare Inc.',
        organization: 'Cloudflare',
        asn: 'AS13335',
        isMobile: false,
        isProxy: true,
        isVpn: false,
        isTor: false,
        isHosting: true,
        provider: this.name,
        providerStatus: 'VERIFIED'
      },
    };
  }
}
