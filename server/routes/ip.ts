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
import type { GeoIPResult } from '../providers/geoip/IGeoIPProvider';
import { CloudflareRequestCfProvider } from '../providers/geoip/CloudflareRequestCfProvider';
import { calculateGeoFieldAgreement } from '../providers/geoip/accuracy';

const router = Router();

function getRequestHeaderMap(req: Request): Record<string, string | string[] | undefined> {
  const result: Record<string, string | string[] | undefined> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    result[key.toLowerCase()] = typeof value === 'string' || Array.isArray(value) ? value : undefined;
  }
  return result;
}

async function getCurrentClientGeoDetails(req: Request, ip: string): Promise<IpDetailsResponse | null> {
  const observedIp = req.headers['x-privasec-observed-ip'];
  const observed = typeof observedIp === 'string' ? observedIp.trim() : '';
  if (!observed || validateIp(observed).normalizedIp !== validateIp(ip).normalizedIp) return null;
  try {
    const provider = new CloudflareRequestCfProvider(getRequestHeaderMap(req));
    const details = await provider.lookup(ip);
    return {
      ip,
      measurementStatus: details.network.providerStatus === 'VERIFIED' ? 'MEASURED' : 'UNKNOWN',
      geo: { ...details.geo, evidenceConfidence: { ...geoFieldAgreement } },
      network: details.network,
    };
  } catch {
    return null;
  }
}

function mergeCurrentClientDetails(primary: GeoIPResult | null, edge: IpDetailsResponse | null, ip: string): IpDetailsResponse {
  const primaryGeo = primary?.geo;
  const edgeGeo = edge?.geo;
  const primaryNetwork = primary?.network;
  const edgeNetwork = edge?.network;
  const pick = (a: unknown, b: unknown, fallback: string) => {
    const av = String(a ?? '').trim();
    if (av && !/^(unknown|unavailable|not measured|not assigned|—)$/i.test(av)) return av;
    const bv = String(b ?? '').trim();
    return bv && !/^(unknown|unavailable|not measured|not assigned|—)$/i.test(bv) ? bv : fallback;
  };
  const pickNullableNumber = (a: number | null | undefined, b: number | null | undefined) => Number.isFinite(a as number) ? a! : Number.isFinite(b as number) ? b! : null;
  const pickBool = (a: boolean | null | undefined, b: boolean | null | undefined) => a !== null && a !== undefined ? a : (b !== null && b !== undefined ? b : null);
  const providerStatus = primaryNetwork?.providerStatus === 'VERIFIED' ? 'VERIFIED' : edgeNetwork?.providerStatus === 'VERIFIED' ? 'VERIFIED' : 'UNAVAILABLE';
  return {
    ip,
    measurementStatus: providerStatus === 'VERIFIED' ? 'MEASURED' : 'UNKNOWN',
    geo: {
      country: pick(primaryGeo?.country, edgeGeo?.country, 'Unknown'),
      countryCode: pick(primaryGeo?.countryCode, edgeGeo?.countryCode, 'XX').toUpperCase(),
      region: pick(primaryGeo?.region, edgeGeo?.region, ''),
      city: pick(primaryGeo?.city, edgeGeo?.city, ''),
      postalCode: pick(primaryGeo?.postalCode, edgeGeo?.postalCode, ''),
      latitude: pickNullableNumber(primaryGeo?.latitude, edgeGeo?.latitude),
      longitude: pickNullableNumber(primaryGeo?.longitude, edgeGeo?.longitude),
      timezone: pick(primaryGeo?.timezone, edgeGeo?.timezone, ''),
    },
    network: {
      isp: pick(primaryNetwork?.isp, edgeNetwork?.isp, 'Unavailable'),
      organization: pick(primaryNetwork?.organization, edgeNetwork?.organization, 'Unavailable'),
      asn: pick(primaryNetwork?.asn, edgeNetwork?.asn, '—'),
      asOrganization: pick(primaryNetwork?.asOrganization, edgeNetwork?.asOrganization, '') || null,
      isMobile: pickBool(primaryNetwork?.isMobile, edgeNetwork?.isMobile),
      isProxy: pickBool(primaryNetwork?.isProxy, edgeNetwork?.isProxy),
      isVpn: pickBool(primaryNetwork?.isVpn, edgeNetwork?.isVpn),
      isTor: pickBool(primaryNetwork?.isTor, edgeNetwork?.isTor),
      isHosting: pickBool(primaryNetwork?.isHosting, edgeNetwork?.isHosting),
      privacyScore: primaryNetwork?.privacyScore ?? null,
      privacyGrade: primaryNetwork?.privacyGrade ?? null,
      networkType: primaryNetwork?.networkType ?? null,
      provider: primaryNetwork?.provider || edgeNetwork?.provider || 'UNAVAILABLE',
      providerStatus,
    },
  };
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
      conflicts: { country: false, asn: false, region: false, city: false, postalCode: false, timezone: false },
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
  const geoObservations = [
    ...multiSource.observations.filter(o => o.status === 'VERIFIED').map(o => ({ countryCode: o.countryCode, asn: o.asn, region: o.region, city: o.city, postalCode: o.postalCode, timezone: o.timezone })),
    ...(cfDetails?.network.providerStatus === 'VERIFIED' ? [{ countryCode: cfDetails.geo.countryCode || null, asn: /^AS\d+$/i.test(cfDetails.network.asn || '') ? cfDetails.network.asn.toUpperCase() : null, region: cfDetails.geo.region || null, city: cfDetails.geo.city || null, postalCode: cfDetails.geo.postalCode || null, timezone: cfDetails.geo.timezone || null }] : []),
  ];
  const geoFieldAgreement = calculateGeoFieldAgreement(geoObservations, geoObservations.length);
  const uniqueNonEmpty = (values: Array<unknown>) => new Set(values.map(v => String(v ?? '').trim().toUpperCase()).filter(Boolean)).size;
  const countryConflict = uniqueNonEmpty(geoObservations.map(o => o.countryCode)) > 1;
  const asnConflict = uniqueNonEmpty(geoObservations.map(o => o.asn)) > 1;
  const regionConflict = uniqueNonEmpty(geoObservations.map(o => o.region)) > 1;
  const cityConflict = uniqueNonEmpty(geoObservations.map(o => o.city)) > 1;
  const postalConflict = uniqueNonEmpty(geoObservations.map(o => o.postalCode)) > 1;
  const timezoneConflict = uniqueNonEmpty(geoObservations.map(o => o.timezone)) > 1;
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
        ...(cfDetails?.network.providerStatus === 'VERIFIED' ? [{ provider: 'Cloudflare Edge', status: 'VERIFIED' as const, countryCode: cfDetails.geo.countryCode || null, country: cfDetails.geo.country || null, asn: /^AS\d+$/i.test(cfDetails.network.asn || '') ? cfDetails.network.asn.toUpperCase() : null, region: cfDetails.geo.region || null, city: cfDetails.geo.city || null, postalCode: cfDetails.geo.postalCode || null, timezone: cfDetails.geo.timezone || null }] : []),
        ...multiSource.observations,
      ],
      consensus: { ...multiSource.consensus, countryAgreement: geoFieldAgreement.country, asnAgreement: geoFieldAgreement.asn },
      conflicts: { country: countryConflict, asn: asnConflict, region: regionConflict, city: cityConflict, postalCode: postalConflict, timezone: timezoneConflict },
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
    const [primary, edge] = await Promise.all([
      geoIpService.getDetails(targetIp).catch(() => null),
      !queryIp ? getCurrentClientGeoDetails(req, targetIp) : Promise.resolve(null),
    ]);
    const data = mergeCurrentClientDetails(primary, edge, targetIp);

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
