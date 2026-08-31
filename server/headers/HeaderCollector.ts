import type { Request } from 'express';
import { HEADER_DEFINITIONS } from './HeaderRegistry';

export interface RawHeaderEntry {
  key: string;
  normalizedKey: string;
  value: string;
}

export interface ServerDerivedHeaderEntry {
  key: string;
  normalizedKey: string;
  sanitizedValue: string;
}

export class HeaderCollector {
  /**
   * Extracts headers from an Express Request object with case preservation,
   * safe normalization according to RFC 9110, and strict masking of sensitive headers.
   */
  public static collect(req: Request): RawHeaderEntry[] {
    const entries: RawHeaderEntry[] = [];
    const seenNormalized = new Set<string>();

    // 1. First attempt to extract from req.rawHeaders (preserves original casing from wire)
    if (Array.isArray(req.rawHeaders) && req.rawHeaders.length > 0) {
      for (let i = 0; i < req.rawHeaders.length; i += 2) {
        const rawKey = req.rawHeaders[i];
        const rawVal = req.rawHeaders[i + 1] ?? '';
        if (typeof rawKey !== 'string') continue;
        const normalizedKey = rawKey.toLowerCase().trim();
        if (HeaderCollector.isServerDerived(normalizedKey)) continue;

        if (!seenNormalized.has(normalizedKey)) {
          seenNormalized.add(normalizedKey);
          entries.push({
            key: rawKey,
            normalizedKey,
            value: rawVal,
          });
        }
      }
    }

    // 2. Supplement with any entries in req.headers that were not in rawHeaders
    for (const [key, val] of Object.entries(req.headers)) {
      const normalizedKey = key.toLowerCase().trim();
      if (HeaderCollector.isServerDerived(normalizedKey)) continue;
      if (!seenNormalized.has(normalizedKey)) {
        seenNormalized.add(normalizedKey);
        const stringVal = Array.isArray(val) ? val.join(', ') : (typeof val === 'string' ? val : val == null ? '' : String(val));
        entries.push({
          key,
          normalizedKey,
          value: stringVal,
        });
      }
    }

    return entries;
  }

  /**
   * Internal metadata injected by the Privasec worker is not a browser-originated
   * request header. Keep it available as a separate evidence channel so it does
   * not inflate the browser header surface or fingerprint/header counts.
   */
  public static isServerDerived(normalizedKey: string): boolean {
    return normalizedKey.toLowerCase().startsWith('x-privasec-');
  }

  public static collectServerDerivedMetadata(req: Request): ServerDerivedHeaderEntry[] {
    const entries: ServerDerivedHeaderEntry[] = [];
    const seen = new Set<string>();
    const add = (rawKey: string, rawVal: unknown) => {
      const normalizedKey = rawKey.toLowerCase().trim();
      if (!HeaderCollector.isServerDerived(normalizedKey) || seen.has(normalizedKey)) return;
      seen.add(normalizedKey);
      const value = Array.isArray(rawVal) ? rawVal.join(', ') : rawVal == null ? '' : String(rawVal);
      entries.push({
        key: rawKey,
        normalizedKey,
        sanitizedValue: HeaderCollector.sanitizeValue(normalizedKey, value),
      });
    };

    if (Array.isArray(req.rawHeaders)) {
      for (let i = 0; i < req.rawHeaders.length; i += 2) {
        const rawKey = req.rawHeaders[i];
        if (typeof rawKey === 'string') add(rawKey, req.rawHeaders[i + 1] ?? '');
      }
    }
    for (const [key, value] of Object.entries(req.headers)) add(key, value);
    return entries;
  }

  /**
   * Sanitizes header values for safe display.
   * Redacts sensitive authorization tokens, session cookies, and credentials.
   */
  public static sanitizeValue(normalizedKey: string, rawValue: string): string {
    if (!rawValue) return '';

    // Sensitive Header Redaction Rules
    switch (normalizedKey) {
      case 'authorization': {
        const parts = rawValue.split(' ');
        if (parts.length > 1) {
          const scheme = parts[0];
          return `${scheme} [REDACTED_CREDENTIAL]`;
        }
        return '[REDACTED_SENSITIVE_AUTH]';
      }

      case 'proxy-authorization': {
        const parts = rawValue.split(' ');
        if (parts.length > 1) {
          const scheme = parts[0];
          return `${scheme} [REDACTED_PROXY_CREDENTIAL]`;
        }
        return '[REDACTED_PROXY_AUTH]';
      }

      case 'cookie': {
        const cookiePairs = rawValue.split(';').map((s) => s.trim()).filter(Boolean);
        const cookieNames = cookiePairs.map((pair) => {
          const eqIdx = pair.indexOf('=');
          return eqIdx > -1 ? pair.substring(0, eqIdx) : pair;
        });
        return `[REDACTED_COOKIE_DATA: ${cookiePairs.length} cookie(s) present (${cookieNames.join(', ')})]`;
      }

      case 'set-cookie':
        return '[REDACTED_SET_COOKIE_DIRECTIVE]';

      case 'x-csrf-token':
      case 'x-xsrf-token':
        return '[REDACTED_CSRF_TOKEN]';

      default:
        // Also redact if header definition marks it sensitive
        const def = HEADER_DEFINITIONS[normalizedKey];
        if (def?.isSensitive) {
          return '[REDACTED_SENSITIVE_VALUE]';
        }
        // Return sanitized string (capped to prevent DOM explosion)
        return rawValue.length > 2000 ? `${rawValue.substring(0, 2000)}... [truncated]` : rawValue;
    }
  }

  /**
   * Checks if a header is considered sensitive.
   */
  public static isSensitive(normalizedKey: string): boolean {
    if (
      normalizedKey === 'authorization' ||
      normalizedKey === 'proxy-authorization' ||
      normalizedKey === 'cookie' ||
      normalizedKey === 'set-cookie' ||
      normalizedKey === 'x-csrf-token' ||
      normalizedKey === 'x-xsrf-token'
    ) {
      return true;
    }
    return Boolean(HEADER_DEFINITIONS[normalizedKey]?.isSensitive);
  }
}
