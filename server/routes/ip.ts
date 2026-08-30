import { Router } from 'express';
import type { Request, Response } from 'express';
import type {
  ApiSuccessResponse,
  ApiErrorResponse,
  IpCheckResponse,
  IpDetailsResponse,
} from '@packages/api-contract';
import { extractClientIp, validateIp } from '../utils/ipExtractor';
import { geoIpService } from '../services/geoip';
import { ipReputationService } from '../services/ipReputation';
import { rdapService } from '../services/rdap';
import { reverseDnsService } from '../services/reverseDns';
import type { IpNetworkIntelligenceResponse } from '@packages/api-contract';
import { CloudflareRequestCfProvider } from '../providers/geoip/CloudflareRequestCfProvider';

const router = Router();

function getRequestHeaderMap(req: Request): Record<string, string | string[] | undefined> {
  return Object.fromEntries(Object.entries(req.headers).map(([key, value]) => [key.toLowerCase(), value]));
}

async function getCurrentClientGeoDetails(req: Request, ip: string): Promise<IpDetailsResponse | null> {
  const observedIp = req.headers['x-privasec-observed-ip'];
  const observed = typeof observedIp === 'string' ? observedIp.trim() : '';
  if (!observed || validateIp(observed).normalizedIp !== validateIp(ip).normalizedIp) return null;

  // For the current client IP, Cloudflare's request.cf metadata is authoritative for the
  // request path, while the configured GeoIP provider supplies the human-readable country,
  // city, ISP and privacy classification fields that request.cf does not expose.
  try {
    const cfProvider = new CloudflareRequestCfProvider(getRequestHeaderMap(req));
    const [cfResult, providerResult] = await Promise.all([
      cfProvider.lookup(ip).catch(() => null),
      geoIpService.getDetails(ip).catch(() => null),
    ]);

    if (!cfResult && !providerResult) return null;
    if (!providerResult) {
      return {
        ip,
        measurementStatus: cfResult?.network.providerStatus === 'VERIFIED' ? 'MEASURED' : 'UNKNOWN',
        geo: cfResult!.geo,
        network: cfResult!.network,
      };
    }
    if (!cfResult) {
      return {
        ip,
        measurementStatus: providerResult.network.providerStatus === 'VERIFIED' ? 'MEASURED' : 'UNKNOWN',
        geo: providerResult.geo,
        network: providerResult.network,
      };
    }

    const geo = {
      ...providerResult.geo,
      // request.cf is tied to this exact request; preserve its observed region/timezone
      // where the external provider does not supply a value.
      region: providerResult.geo.region || cfResult.geo.region,
      city: providerResult.geo.city || cfResult.geo.city,
      postalCode: providerResult.geo.postalCode || cfResult.geo.postalCode,
      timezone: providerResult.geo.timezone || cfResult.geo.timezone,
      latitude: providerResult.geo.latitude ?? cfResult.geo.latitude,
      longitude: providerResult.geo.longitude ?? cfResult.geo.longitude,
    };
    const network = {
      ...providerResult.network,
      // Keep the current-request ASN/org only when the provider has no value. This avoids
      // overwriting richer provider privacy flags (VPN/proxy/Tor/hosting/mobile).
      organization: providerResult.network.organization || cfResult.network.organization,
      isp: providerResult.network.isp || cfResult.network.isp,
      asn: providerResult.network.asn !== '—' ? providerResult.network.asn : cfResult.network.asn,
    };

    return {
      ip,
      measurementStatus: providerResult.network.providerStatus === 'VERIFIED' || cfResult.network.providerStatus === 'VERIFIED'
        ? 'MEASURED'
        : 'UNKNOWN',
      geo,
      network,
    };
  } catch {
    return null;
  }
}

/**
 * GET /api/ip
 * Returns client connection IP, version, private flag, request headers, and proxy flags.
 */
router.get('/ip', (req: Request, res: Response) => {
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

  const data: IpCheckResponse = {
    ip: extracted.ip,
    ipVersion: extracted.version,
    isPrivate: extracted.isPrivate,
    isAuthoritativeForClientEgress: extracted.isAuthoritativeForClientEgress,
    observationSource: extracted.observationSource,
    observationScope: extracted.observationScope,
    headers,
    connectionFlags,
    publicIpStatus: extracted.isPublic && extracted.isAuthoritativeForClientEgress ? 'MEASURED' : 'NOT_MEASURED',
    ipSource: extracted.ipSource,
    connectionType: extracted.connectionType,
    localAddress: extracted.localAddress,
    publicIp: extracted.publicIp,
    publicIpConfidence: extracted.publicIpConfidence,
    classification: extracted.observationScope,
  };

  const response: ApiSuccessResponse<IpCheckResponse> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.requestId || `req_${Date.now()}`,
      version: '1.0.0',
    },
  };

  res.status(200).json(response);
});

/**
 * GET /api/ip/details
 * Returns enriched network, GeoIP, ASN, and proxy/hosting intelligence for target or client IP.
 */
router.get('/ip/network-intelligence', async (req: Request, res: Response) => {
  const queryIp = req.query.ip as string | undefined;
  const targetIp = queryIp?.trim() || extractClientIp(req).ip;
  const validation = validateIp(targetIp);
  if (!validation.isValid) {
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: { code: 'INVALID_IP', message: 'Provided IP address is not valid.' },
      meta: { timestamp: new Date().toISOString(), requestId: req.requestId || `req_${Date.now()}`, version: '1.0.0' },
    };
    res.status(400).json(errorResponse);
    return;
  }

  const normalizedIp = validation.normalizedIp;
  const cfDetails = !queryIp ? await getCurrentClientGeoDetails(req, normalizedIp) : null;
  const [multiSource, reputation, rdap, reverseDns] = await Promise.all([
    geoIpService.getMultiSourceDetails(normalizedIp).catch((error) => ({ error: error instanceof Error ? error.message : 'GeoIP unavailable' })),
    ipReputationService.lookup(normalizedIp).catch(() => ({
      ip: normalizedIp, status: 'ERROR' as const, provider: null, abuseConfidenceScore: null, totalReports: null,
      lastReportedAt: null, usageType: null, isWhitelisted: null, countryCode: null, domain: null,
      confidence: 'UNKNOWN' as const, note: 'Reputation lookup failed; existing audit results are unaffected.',
    })),
    rdapService.lookup(normalizedIp),
    reverseDnsService.lookup(normalizedIp),
  ]);

  if ('error' in multiSource) {
    const response: ApiSuccessResponse<IpNetworkIntelligenceResponse> = {
      success: true,
      data: {
        ip: normalizedIp,
        geo: { country: 'Unavailable', countryCode: 'XX', region: '', city: '', postalCode: '', latitude: null, longitude: null, timezone: '' },
        network: { isp: 'Unavailable', organization: 'Unavailable', asn: '—', isMobile: null, isProxy: null, isVpn: null, isTor: null, isHosting: null, provider: 'UNAVAILABLE', providerStatus: 'UNAVAILABLE' },
        reputation,
        rdap,
        reverseDns,
        intelligenceConfidence: 'LOW',
        providers: ['RDAP', reverseDns.resolver || 'Cloudflare DNS over HTTPS', reputation.provider || 'Reputation unavailable'],
        providerObservations: [],
        consensus: { countryCode: null, asn: null, agreement: 'NONE' },
        note: 'Primary GeoIP data is unavailable; auxiliary intelligence remains separately reported and does not alter the canonical privacy score.',
      },
      meta: { timestamp: new Date().toISOString(), requestId: req.requestId || `req_${Date.now()}`, version: '1.0.0' },
    };
    res.status(200).json(response);
    return;
  }

  const details = multiSource.primary;
  if (cfDetails && cfDetails.network.providerStatus === 'VERIFIED' && cfDetails.geo.countryCode && details.geo.countryCode && cfDetails.geo.countryCode !== details.geo.countryCode) {
    console.warn('[GeoIP] Cloudflare edge and provider country disagreement', { edge: cfDetails.geo.countryCode, provider: details.geo.countryCode, ip: normalizedIp });
  }
  const providers = [details.network.provider || 'GeoIP'];
  if (cfDetails?.network.providerStatus === 'VERIFIED') providers.push(cfDetails.network.provider || 'Cloudflare Edge');
  if (reputation.provider) providers.push(reputation.provider);
  if (rdap.source) providers.push(rdap.source);
  if (reverseDns.resolver) providers.push(reverseDns.resolver);
  const measuredSignals = [details.network.providerStatus === 'VERIFIED', reputation.status === 'MEASURED', rdap.status === 'MEASURED', reverseDns.status === 'MEASURED'].filter(Boolean).length;
  const intelligenceConfidence: IpNetworkIntelligenceResponse['intelligenceConfidence'] = measuredSignals >= 3 ? 'HIGH' : measuredSignals >= 2 ? 'MEDIUM' : measuredSignals >= 1 ? 'LOW' : 'UNKNOWN';

  const response: ApiSuccessResponse<IpNetworkIntelligenceResponse> = {
    success: true,
    data: {
      ip: normalizedIp,
      geo: details.geo,
      network: details.network,
      reputation,
      rdap,
      reverseDns,
      intelligenceConfidence,
      providers: [...new Set(providers)],
      providerObservations: [
        ...(cfDetails?.network.providerStatus === 'VERIFIED' ? [{ provider: 'Cloudflare Edge', status: 'VERIFIED' as const, countryCode: cfDetails.geo.countryCode || null, country: cfDetails.geo.country || null, asn: /^AS\d+$/i.test(cfDetails.network.asn || '') ? cfDetails.network.asn.toUpperCase() : null }] : []),
        ...multiSource.observations,
      ],
      consensus: multiSource.consensus,
      note: 'Auxiliary network intelligence is independently sourced and does not change the canonical privacy score.',
    },
    meta: { timestamp: new Date().toISOString(), requestId: req.requestId || `req_${Date.now()}`, version: '1.0.0' },
  };
  res.status(200).json(response);
});

router.get('/ip/reputation', async (req: Request, res: Response) => {
  const queryIp = req.query.ip as string | undefined;
  const targetIp = queryIp?.trim() || extractClientIp(req).ip;
  const validation = validateIp(targetIp);
  if (!validation.isValid) {
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: { code: 'INVALID_IP', message: 'Provided IP address is not valid.' },
      meta: { timestamp: new Date().toISOString(), requestId: req.requestId || `req_${Date.now()}`, version: '1.0.0' },
    };
    res.status(400).json(errorResponse);
    return;
  }

  const data = await ipReputationService.lookup(validation.normalizedIp);
  const response: ApiSuccessResponse<typeof data> = {
    success: true,
    data,
    meta: { timestamp: new Date().toISOString(), requestId: req.requestId || `req_${Date.now()}`, version: '1.0.0' },
  };
  res.status(200).json(response);
});

router.get('/ip/details', async (req: Request, res: Response) => {
  const queryIp = req.query.ip as string | undefined;

  let targetIp: string;

  if (queryIp) {
    const validation = validateIp(queryIp);
    if (!validation.isValid) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: 'INVALID_IP',
          message: `Provided IP parameter '${queryIp}' is not a valid IPv4 or IPv6 address.`,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId || `req_${Date.now()}`,
          version: '1.0.0',
        },
      };
      res.status(400).json(errorResponse);
      return;
    }
    targetIp = queryIp.trim();
  } else {
    const extracted = extractClientIp(req);
    targetIp = extracted.ip;
  }

  const targetValidation = validateIp(targetIp);
  if (!targetValidation.isValid) {
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: { code: 'INVALID_IP', message: 'Unable to validate the observed IP address.' },
      meta: { timestamp: new Date().toISOString(), requestId: req.requestId || `req_${Date.now()}`, version: '1.0.0' },
    };
    res.status(400).json(errorResponse);
    return;
  }

  // Loopback/private/reserved addresses are not public egress measurements and must
  // never be sent to GeoIP providers.
  if (!targetValidation.isPublic) {
    const data: IpDetailsResponse = {
      ip: targetIp,
      measurementStatus: 'NOT_MEASURED',
      geo: { country: 'Not measured', countryCode: 'XX', region: 'Not measured', city: 'Not measured', postalCode: 'Not measured', latitude: null, longitude: null, timezone: 'Unknown' },
      network: { isp: 'Not measured', organization: 'Not measured', asn: 'Not measured', isMobile: null, isProxy: null, isVpn: null, isTor: null, isHosting: null, provider: 'NONE', providerStatus: 'UNAVAILABLE' },
    };
    const response: ApiSuccessResponse<IpDetailsResponse> = { success: true, data, meta: { timestamp: new Date().toISOString(), requestId: req.requestId || `req_${Date.now()}`, version: '1.0.0' } };
    res.status(200).json(response);
    return;
  }

  try {
    const details = (await getCurrentClientGeoDetails(req, targetIp)) || await geoIpService.getDetails(targetIp);

    const data: IpDetailsResponse = {
      ip: targetIp,
      measurementStatus: details.network.providerStatus === 'VERIFIED' ? 'MEASURED' : 'UNKNOWN',
      geo: details.geo,
      network: details.network,
    };

    const response: ApiSuccessResponse<IpDetailsResponse> = {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId || `req_${Date.now()}`,
        version: '1.0.0',
      },
    };

    res.status(200).json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve IP intelligence';
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        code: 'GEOIP_LOOKUP_FAILED',
        message,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId || `req_${Date.now()}`,
        version: '1.0.0',
      },
    };
    res.status(500).json(errorResponse);
  }
});

export default router;
