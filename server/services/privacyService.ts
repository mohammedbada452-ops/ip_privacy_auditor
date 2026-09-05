import type { Request } from 'express';
import { extractClientIp } from '../utils/ipExtractor';
import { geoIPService } from './geoip';
import { PrivacyEngine } from '../privacy/PrivacyEngine';
import { dbRepository } from '../db/repository';
import type {
  BrowserFingerprintInput,
  PrivacyScoreAnalysis,
  IpCheckResponse,
  IpDetailsResponse,
} from '@packages/api-contract';

export class PrivacyService {
  private engine: PrivacyEngine;

  constructor(engine?: PrivacyEngine) {
    this.engine = engine || new PrivacyEngine();
  }

  public async evaluateRequest(
    req: Request,
    fingerprint?: BrowserFingerprintInput | null
  ): Promise<PrivacyScoreAnalysis> {
    // 1. Extract IP & headers using Stage 5 utility
    const extracted = extractClientIp(req);

    const headers = {
      userAgent: (req.headers['user-agent'] as string) || null,
      secGpc: (req.headers['sec-gpc'] as string) || null,
      dnt: (req.headers['dnt'] as string) || null,
      acceptLanguage: (req.headers['accept-language'] as string) || null,
      connection: (req.headers['connection'] as string) || null,
    };

    const connectionFlags = {
      hasProxyHeaders: extracted.hasProxyHeaders,
      isInfrastructureProxy: extracted.isInfrastructureProxy,
      viaHeader: extracted.viaHeader,
    };

    const ipCheck: IpCheckResponse = {
      ip: extracted.ip,
      ipVersion: extracted.version,
      isPrivate: extracted.isPrivate,
      headers,
      connectionFlags,
      publicIpStatus: extracted.observationScope === 'PUBLIC' && extracted.isAuthoritativeForClientEgress ? 'MEASURED' : 'NOT_MEASURED',
      classification: extracted.observationScope,
      observationSource: extracted.observationSource,
      isAuthoritativeForClientEgress: extracted.isAuthoritativeForClientEgress,
      ipSource: extracted.ipSource,
      connectionType: extracted.connectionType,
      localAddress: extracted.localAddress,
      publicIp: extracted.publicIp,
      publicIpConfidence: extracted.publicIpConfidence,
    };

    // 2. Fetch GeoIP & network details using Stage 5 service (handles caching, fallback safely)
    let ipDetails: IpDetailsResponse | null = null;
    if (ipCheck.observationScope === 'PUBLIC' && ipCheck.isAuthoritativeForClientEgress) {
      try {
        const details = await geoIPService.getDetails(ipCheck.ip);
        ipDetails = {
          ip: ipCheck.ip,
          measurementStatus: details.network.providerStatus === 'VERIFIED' ? 'MEASURED' : 'UNKNOWN',
          geo: details.geo,
          network: details.network,
        };
      } catch (error) {
        // Provider failure is unknown, never a safe result. Keep the connection evidence intact.
        ipDetails = null;
        console.warn('[privacyService] GeoIP provider unavailable', {
          name: error instanceof Error ? error.name : 'UnknownError',
        });
      }
    }

    // 3. Extract custom header map from req.headers
    const customHeaders: Record<string, string | string[] | undefined> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      customHeaders[key.toLowerCase()] = typeof value === 'string' || Array.isArray(value) ? value : undefined;
    }

    // 4. Run pure PrivacyEngine evaluation
    const analysis = this.engine.evaluate({
      ipCheck,
      ipDetails,
      fingerprint,
      customHeaders,
    });

    // 5. Asynchronously persist anonymized scan record to Stage 11 Database
    try {
      const countryCode = ipDetails?.geo?.countryCode || 'XX';
      const city = ipDetails?.geo?.city || 'Unknown';
      const isp = ipDetails?.network?.isp || 'Unknown ISP';
      const isVpn = ipDetails?.network?.isVpn ?? null;
      const isProxy = ipDetails?.network?.isProxy ?? null;
      const isTor = ipDetails?.network?.isTor ?? null;
      const hasWebRtcLocal = Array.isArray(fingerprint?.webRtc?.localIps) && fingerprint.webRtc.localIps.length > 0;
      const webRtcEvidenceState = fingerprint?.webRtc
        ? (hasWebRtcLocal ? 'CONFIRMED' : 'NOT_DETECTED')
        : 'UNAVAILABLE';
      const isWebRtcLeak = fingerprint?.webRtc ? hasWebRtcLocal : null;
      
      let userAgentCategory = 'Desktop Browser';
      const ua = (req.headers['user-agent'] || '').toLowerCase();
      if (ua.includes('mobile')) userAgentCategory = ua.includes('safari') ? 'Safari/Mobile' : 'Chrome/Mobile';
      else if (ua.includes('firefox')) userAgentCategory = 'Firefox/Desktop';
      else if (ua.includes('safari') && !ua.includes('chrome')) userAgentCategory = 'Safari/Desktop';
      else if (ua.includes('edg')) userAgentCategory = 'Edge/Desktop';
      else userAgentCategory = 'Chrome/Desktop';

      await dbRepository.recordScanSessionAsync({
        ipHash: dbRepository.anonymizeIp(extracted.ip),
        countryCode,
        city,
        isp,
        isVpn,
        isProxy,
        isTor,
        isWebRtcLeak,
        networkIntelligenceStatus: ipDetails?.network?.providerStatus || 'UNAVAILABLE',
        webRtcEvidenceState,
        privacyScore: analysis.privacyScore,
        scoreTier: analysis.tier as any,
        userAgentCategory,
        verificationStatus: analysis.verificationStatus || 'PARTIAL',
        verificationCoveragePct: analysis.verificationCoveragePct ?? 0,
        overallConfidence: analysis.overallConfidence || 'LOW',
      });
    } catch (error) {
      // Persistence is deliberately non-blocking. Log only error class/name; never log scan content, IPs, or identifiers.
      console.warn('[privacyService] Scan persistence failed', {
        name: error instanceof Error ? error.name : 'UnknownError',
      });
    }

    return analysis;
  }
}

export const privacyService = new PrivacyService();
