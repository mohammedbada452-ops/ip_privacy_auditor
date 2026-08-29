import { ProductionGuard } from '../productionGuard';
import type { DatabaseRepository } from '../repository';

/**
 * Isolated Development Seed Fixtures
 * STRICTLY FOR NON-PRODUCTION DEVELOPMENT AND MANUAL UI TESTING.
 * Guarded against execution in production mode.
 */
export function loadDevelopmentSeeds(repository: DatabaseRepository): void {
  // Hard guard: reject immediately in production
  ProductionGuard.assertNoProductionSeedExecution('Development seed loader');

  const sampleCountries = ['US', 'DE', 'GB', 'FR', 'TR', 'BR', 'SA', 'CA', 'AU', 'JP', 'NL', 'SG'];
  const sampleCities: Record<string, string[]> = {
    US: ['San Francisco', 'New York', 'Ashburn', 'Chicago'],
    DE: ['Frankfurt', 'Berlin', 'Munich'],
    GB: ['London', 'Manchester'],
    FR: ['Paris', 'Marseille'],
    TR: ['Istanbul', 'Ankara'],
    BR: ['Sao Paulo', 'Rio de Janeiro'],
    SA: ['Riyadh', 'Jeddah'],
    CA: ['Toronto', 'Montreal'],
    AU: ['Sydney', 'Melbourne'],
    JP: ['Tokyo', 'Osaka'],
    NL: ['Amsterdam'],
    SG: ['Singapore'],
  };
  const sampleIsps = ['Cloudflare Inc.', 'Amazon Data Services', 'Comcast Cable', 'Deutsche Telekom', 'Turkcell', 'Claro Brasil', 'STC Saudi'];
  const sampleUa = ['Chrome/Desktop', 'Safari/Mobile', 'Firefox/Desktop', 'Edge/Desktop', 'Safari/Desktop', 'Chrome/Mobile'];

  const now = Date.now();
  for (let i = 0; i < 48; i++) {
    const countryCode = sampleCountries[i % sampleCountries.length];
    const cities = sampleCities[countryCode] || ['Capital City'];
    const city = cities[i % cities.length];
    const isp = sampleIsps[i % sampleIsps.length];
    const isVpn = (i % 3 === 0);
    const isProxy = (i % 4 === 0);
    const isTor = (i === 15 || i === 37);
    const isWebRtcLeak = (i % 7 === 0);
    const privacyScore = Math.max(25, Math.min(100, 85 - (isVpn ? 10 : 0) - (isProxy ? 15 : 0) - (isWebRtcLeak ? 20 : 0) + (i % 15)));
    
    let scoreTier: 'CRITICAL' | 'MODERATE' | 'GOOD' | 'EXCELLENT' = 'GOOD';
    if (privacyScore >= 85) scoreTier = 'EXCELLENT';
    else if (privacyScore >= 70) scoreTier = 'GOOD';
    else if (privacyScore >= 50) scoreTier = 'MODERATE';
    else scoreTier = 'CRITICAL';

    const dummyIp = `198.51.100.${(i * 5 + 1) % 250}`;

    repository.recordScanSession({
      ipHash: repository.anonymizeIp(dummyIp),
      countryCode,
      city,
      isp,
      isVpn,
      isProxy,
      isTor,
      isWebRtcLeak,
      networkIntelligenceStatus: 'VERIFIED',
      webRtcEvidenceState: isWebRtcLeak ? 'CONFIRMED' : 'NOT_DETECTED',
      privacyScore,
      scoreTier,
      userAgentCategory: sampleUa[i % sampleUa.length],
      verificationStatus: 'PARTIAL',
      verificationCoveragePct: 0,
      overallConfidence: 'LOW',
    });

    repository.recordPageView({
      route: ['/', '/browser', '/headers', '/design-system'][i % 4],
      language: ['en', 'es', 'fr', 'tr', 'pt', 'ar'][i % 6],
      userAgentCategory: sampleUa[i % sampleUa.length],
      durationMs: 120 + (i * 13) % 400,
    });

    repository.recordPerformanceMetric({
      endpoint: ['/api/ip', '/api/ip/details', '/api/privacy/score', '/api/analyze/browser', '/api/headers'][i % 5],
      method: i % 5 === 3 ? 'POST' : 'GET',
      statusCode: 200,
      responseTimeMs: 12 + (i * 7) % 45,
    });
  }
}
