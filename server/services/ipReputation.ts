import { validateIp } from '../utils/ipExtractor';
import type { IpReputationResponse } from '@packages/api-contract';
import { getRequestEnv } from '../config/requestEnv';

interface CacheEntry {
  data: IpReputationResponse;
  expiresAt: number;
}

interface AbuseResponse {
  data?: {
    ipAddress?: string;
    isPublic?: boolean;
    ipVersion?: number;
    isWhitelisted?: boolean | null;
    abuseConfidenceScore?: number;
    countryCode?: string | null;
    usageType?: string | null;
    isp?: string | null;
    domain?: string | null;
    totalReports?: number;
    lastReportedAt?: string | null;
  };
}

const CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_CACHE_ENTRIES = 512;

class IpReputationService {
  private cache = new Map<string, CacheEntry>();
  private readonly endpoint = 'https://api.abuseipdb.com/api/v2/check';

  private disabledResult(ip: string, note: string): IpReputationResponse {
    return {
      ip,
      status: 'UNAVAILABLE',
      provider: null,
      abuseConfidenceScore: null,
      totalReports: null,
      lastReportedAt: null,
      usageType: null,
      isWhitelisted: null,
      countryCode: null,
      domain: null,
      confidence: 'UNKNOWN',
      note,
    };
  }

  public async lookup(ip: string): Promise<IpReputationResponse> {
    const validation = validateIp(ip);
    if (!validation.isValid) throw new Error('Invalid IP address format.');

    if (!validation.isPublic) {
      return {
        ip: validation.normalizedIp,
        status: 'NOT_MEASURED',
        provider: null,
        abuseConfidenceScore: null,
        totalReports: null,
        lastReportedAt: null,
        usageType: null,
        isWhitelisted: null,
        countryCode: null,
        domain: null,
        confidence: 'UNKNOWN',
        note: 'Reputation is only measured for publicly routable IP addresses.',
      };
    }

    const apiKey = typeof getRequestEnv('ABUSEIPDB_API_KEY') === 'string'
      ? getRequestEnv('ABUSEIPDB_API_KEY')!.trim()
      : '';
    if (!apiKey) {
      return this.disabledResult(
        validation.normalizedIp,
        'IP reputation provider is not configured. Existing IP, network, header, browser, and privacy results are unaffected.'
      );
    }

    const cached = this.cache.get(validation.normalizedIp);
    if (cached && cached.expiresAt > Date.now()) return cached.data;
    if (cached) this.cache.delete(validation.normalizedIp);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      const url = new URL(this.endpoint);
      url.searchParams.set('ipAddress', validation.normalizedIp);
      url.searchParams.set('maxAgeInDays', '90');

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          Key: apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`AbuseIPDB returned HTTP ${response.status}`);
      }
      const text = await response.text();
      if (text.length > 100_000) throw new Error('AbuseIPDB response exceeded the safe payload limit.');
      const payload = JSON.parse(text) as AbuseResponse;
      const d = payload.data;
      if (!d) throw new Error('AbuseIPDB response did not contain data.');

      const score = typeof d.abuseConfidenceScore === 'number'
        ? Math.max(0, Math.min(100, Math.round(d.abuseConfidenceScore)))
        : null;
      const reports = typeof d.totalReports === 'number' && Number.isFinite(d.totalReports)
        ? Math.max(0, Math.trunc(d.totalReports))
        : null;
      const countryCode = typeof d.countryCode === 'string' && /^[A-Za-z]{2}$/.test(d.countryCode)
        ? d.countryCode.toUpperCase()
        : null;
      const lastReportedAt = typeof d.lastReportedAt === 'string' && !Number.isNaN(Date.parse(d.lastReportedAt))
        ? d.lastReportedAt
        : null;
      const result: IpReputationResponse = {
        ip: validation.normalizedIp,
        status: 'MEASURED',
        provider: 'AbuseIPDB',
        abuseConfidenceScore: score,
        totalReports: reports,
        lastReportedAt,
        usageType: typeof d.usageType === 'string' ? d.usageType : null,
        isWhitelisted: typeof d.isWhitelisted === 'boolean' ? d.isWhitelisted : null,
        countryCode,
        domain: typeof d.domain === 'string' ? d.domain : null,
        confidence: score === null ? 'LOW' : score >= 80 || (reports !== null && reports >= 20) ? 'HIGH' : score >= 20 || (reports !== null && reports > 0) ? 'MEDIUM' : 'HIGH',
        note: 'Reputation is an external observation and does not change the canonical privacy score.',
      };

      this.cache.set(validation.normalizedIp, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
      if (this.cache.size > MAX_CACHE_ENTRIES) {
        const oldest = this.cache.keys().next().value;
        if (oldest) this.cache.delete(oldest);
      }
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[IP Reputation] lookup failed: ${message}`);
      return {
        ...this.disabledResult(validation.normalizedIp, 'IP reputation provider is temporarily unavailable; no existing audit result is downgraded.'),
        status: 'ERROR',
        provider: 'AbuseIPDB',
        confidence: 'UNKNOWN',
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const ipReputationService = new IpReputationService();
