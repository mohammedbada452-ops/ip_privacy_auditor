import net from 'net';
import type { Request } from 'express';

export interface IpValidationResult {
  isValid: boolean;
  normalizedIp: string;
  version: 'IPv4' | 'IPv6' | 'invalid';
  isLoopback: boolean;
  isPrivate: boolean;
  isLinkLocal: boolean;
  isCGNAT: boolean;
  isReserved: boolean;
  isPublic: boolean;
}

export interface ExtractedClientIpInfo {
  ip: string;
  observationSource: 'SOCKET_PEER' | 'TRUSTED_PROXY_CHAIN';
  observationScope: 'PUBLIC' | 'PRIVATE' | 'LOOPBACK' | 'LINK_LOCAL' | 'CGNAT' | 'RESERVED' | 'UNKNOWN';
  isAuthoritativeForClientEgress: boolean;
  version: 'IPv4' | 'IPv6';
  isPrivate: boolean;
  isReserved: boolean;
  isLoopback: boolean;
  isLinkLocal: boolean;
  isCGNAT: boolean;
  isPublic: boolean;
  hasProxyHeaders: boolean;
  isInfrastructureProxy: boolean;
  viaHeader: string | null;
  ipSource: 'SERVER_OBSERVED' | 'TRUSTED_PROXY_CHAIN' | 'LOCAL_ENDPOINT';
  connectionType: 'LOCAL_DEVELOPMENT' | 'PUBLIC_EGRESS' | 'PRIVATE_NETWORK' | 'UNKNOWN';
  localAddress: string | null;
  publicIp: string | null;
  publicIpConfidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
}

/**
 * Clean and normalize raw IP string (strip ports, brackets, ::ffff: prefix).
 */
export function normalizeIp(rawIp: string): string {
  if (!rawIp || typeof rawIp !== 'string') {
    return '';
  }

  let cleaned = rawIp.trim();

  // Strip quotes if present
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  // Handle IPv6-mapped IPv4 addresses (e.g., ::ffff:192.168.1.1)
  if (cleaned.toLowerCase().startsWith('::ffff:')) {
    cleaned = cleaned.substring(7);
  }

  // Handle IPv6 in brackets with port (e.g. [2001:db8::1]:8080 or [::1])
  if (cleaned.startsWith('[')) {
    const bracketEnd = cleaned.indexOf(']');
    if (bracketEnd !== -1) {
      cleaned = cleaned.substring(1, bracketEnd);
    }
  } else if (cleaned.includes('.') && cleaned.includes(':')) {
    // IPv4 with port (e.g. 192.168.1.1:8080)
    const parts = cleaned.split(':');
    if (parts.length === 2 && !isNaN(Number(parts[1]))) {
      cleaned = parts[0];
    }
  }

  return cleaned;
}

/**
 * Convert IPv4 address string to 32-bit unsigned integer for range comparisons.
 */
function ipv4ToLong(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

/**
 * Validate IP syntax and classify network scope (loopback, private, reserved).
 */
export function validateIp(ipInput: string): IpValidationResult {
  const ip = normalizeIp(ipInput);
  const ipType = net.isIP(ip);

  if (ipType === 0) {
    return {
      isValid: false,
      normalizedIp: ip,
      version: 'invalid',
      isLoopback: false,
      isPrivate: false,
      isLinkLocal: false,
      isCGNAT: false,
      isReserved: false,
      isPublic: false,
    };
  }

  if (ipType === 4) {
    const long = ipv4ToLong(ip);

    // 127.0.0.0/8 (Loopback)
    const isLoopback = (long & 0xff000000) === (127 << 24);

    // Private IPv4 ranges RFC 1918
    // 10.0.0.0/8
    const is10 = (long & 0xff000000) === (10 << 24);
    // 172.16.0.0/12
    const is172 = (long & 0xfff00000) === ((172 << 24) | (16 << 16));
    // 192.168.0.0/16
    const is192 = (long & 0xffff0000) === ((192 << 24) | (168 << 16));

    const isRfc1918 = is10 || is172 || is192;

    // Reserved / Link-local ranges:
    // 169.254.0.0/16 (Link-local)
    const isLinkLocal = (long & 0xffff0000) === ((169 << 24) | (254 << 16));
    // 100.64.0.0/10 (CGNAT RFC 6598)
    const isCGNAT = (long & 0xffc00000) === ((100 << 24) | (64 << 16));
    // 0.0.0.0/8 (Current network)
    const isZero = (long & 0xff000000) === 0;
    // IANA special-purpose IPv4 ranges that must not be treated as globally routable.
    const isIanaSpecial =
      (long & 0xffffff00) === ((192 << 24) | (0 << 16) | (0 << 8)) || // 192.0.0.0/24
      (long & 0xffffff00) === ((192 << 24) | (0 << 16) | (2 << 8)) || // TEST-NET-1
      (long & 0xffffff00) === ((192 << 24) | (88 << 16) | (99 << 8)) || // 192.88.99.0/24
      (long >= ((198 << 24) | (18 << 16)) && long <= ((198 << 24) | (19 << 16) | (255 << 8) | 255)) || // 198.18.0.0/15
      (long & 0xffffff00) === ((198 << 24) | (51 << 16) | (100 << 8)) || // TEST-NET-2
      (long & 0xffffff00) === ((203 << 24) | (0 << 16) | (113 << 8)); // TEST-NET-3
    // Multicast & Reserved: 224.0.0.0/3 (224.0.0.0 - 255.255.255.255)
    const isMulticastOrReserved = (long >>> 28) >= 14;

    const isReserved = isZero || isIanaSpecial || isMulticastOrReserved;

    const isPrivate = isLoopback || isRfc1918 || isLinkLocal || isCGNAT || isReserved;
    const isPublic = !isPrivate;

    return {
      isValid: true,
      normalizedIp: ip,
      version: 'IPv4',
      isLoopback,
      isPrivate,
      isLinkLocal,
      isCGNAT,
      isReserved: isReserved || isLinkLocal || isCGNAT,
      isPublic,
    };
  }

  // IPv6 Validation
  const lower = ip.toLowerCase();
  const isLoopback = lower === '::1' || lower === '0:0:0:0:0:0:0:1';
  const isUnspecified = lower === '::' || lower === '0:0:0:0:0:0:0:0';

  // IPv6 Unique Local Unicast fc00::/7 (fc00:: to fdff::)
  const isUniqueLocal = lower.startsWith('fc') || lower.startsWith('fd');
  // Link local fe80::/10 (fe80:: to febf::)
  const isLinkLocal =
    lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb');
  // Multicast ff00::/8
  const isMulticast = lower.startsWith('ff');
  // Documentation 2001:db8::/32
  const isDocumentation = lower.startsWith('2001:db8:');

  const isReserved = isUnspecified || isMulticast || isDocumentation;
  const isPrivate = isLoopback || isUnspecified || isUniqueLocal || isLinkLocal || isReserved;
  const isPublic = !isPrivate;

  return {
    isValid: true,
    normalizedIp: ip,
    version: 'IPv6',
    isLoopback,
    isPrivate,
    isLinkLocal,
    isCGNAT: false,
    isReserved: isReserved || isLinkLocal,
    isPublic,
  };
}

/**
 * Determine whether a given IP address is a trusted proxy or internal ingress hop.
 */
export function isTrustedProxy(ip: string): boolean {
  if (!ip || typeof ip !== 'string') return false;
  const normalized = normalizeIp(ip);
  const validation = validateIp(normalized);
  if (!validation.isValid) return false;

  // Loopback is never trusted implicitly. A local reverse proxy may be trusted only when
  // the operator explicitly configures it, preventing forged X-Forwarded-For on localhost.
  if (validation.isLoopback) {
    return process.env.TRUST_LOCAL_PROXY === 'true';
  }

  const envTrusted = process.env.TRUSTED_PROXIES || process.env.TRUSTED_PROXY_CIDRS;
  if (!envTrusted) return false;

  return envTrusted
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean)
    .some((entry: string) => ipMatchesCidr(normalized, entry));
}

function ipMatchesCidr(ip: string, cidrOrIp: string): boolean {
  const [networkRaw, prefixRaw] = cidrOrIp.split('/', 2);
  const network = normalizeIp(networkRaw);
  if (network === normalizeIp(ip)) return true;
  const targetValidation = validateIp(ip);
  const networkValidation = validateIp(network);
  if (!targetValidation.isValid || !networkValidation.isValid || targetValidation.version !== networkValidation.version) return false;

  const prefix = prefixRaw === undefined ? (targetValidation.version === 'IPv4' ? 32 : 128) : Number(prefixRaw);
  const maxPrefix = targetValidation.version === 'IPv4' ? 32 : 128;
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > maxPrefix) return false;

  if (targetValidation.version === 'IPv4') {
    const toNum = (v: string) => v.split('.').reduce((n, part) => ((n * 256) + Number(part)) >>> 0, 0);
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    return (toNum(ip) & mask) === (toNum(network) & mask);
  }

  const expand = (v: string) => {
    let [head, tail] = v.toLowerCase().split('::');
    const left = head ? head.split(':').filter(Boolean) : [];
    const right = tail ? tail.split(':').filter(Boolean) : [];
    const missing = 8 - left.length - right.length;
    return [...left, ...Array(Math.max(0, missing)).fill('0'), ...right].map((x) => parseInt(x || '0', 16));
  };
  const a = expand(ip); const b = expand(network);
  let remaining = prefix;
  for (let i = 0; i < 8; i++) {
    if (remaining <= 0) break;
    const bits = Math.min(16, remaining);
    const mask = bits === 16 ? 0xffff : ((0xffff << (16 - bits)) & 0xffff);
    if ((a[i] & mask) !== (b[i] & mask)) return false;
    remaining -= bits;
  }
  return true;
}

/**
 * Safely extract client IP from incoming Express HTTP request using a trusted proxy model.
 */
export function extractClientIp(req: Request): ExtractedClientIpInfo {
  const xForwardedFor = req.headers['x-forwarded-for'];
  const cfConnectingIp = req.headers['cf-connecting-ip'];
  const xRealIp = req.headers['x-real-ip'];
  const forwarded = req.headers['forwarded'];
  const viaHeader = (req.headers['via'] as string) || null;

  const hasProxyHeaders = Boolean(xForwardedFor || cfConnectingIp || xRealIp || forwarded || viaHeader);

  // Identify direct socket peer
  const rawDirectPeer = req.socket?.remoteAddress || req.ip || '127.0.0.1';
  const directPeer = normalizeIp(rawDirectPeer);
  const peerValidation = validateIp(directPeer);

  // Trust proxy if the direct connection is from a trusted proxy or TRUST_PROXY is enabled
  const trustProxyOverride = process.env.TRUST_PROXY === 'true' && process.env.NODE_ENV !== 'production';
  const isPeerTrusted = isTrustedProxy(directPeer) || trustProxyOverride;
  const isInfrastructureProxy = isPeerTrusted && hasProxyHeaders;

  let candidateIp: string | null = null;
  let observationSource: 'SOCKET_PEER' | 'TRUSTED_PROXY_CHAIN' = 'SOCKET_PEER';

  // In the Cloudflare Worker deployment, the Worker overwrites this internal header
  // from Cloudflare's CF-Connecting-IP before handing the request to Express.
  const workerObservedIp = req.headers['x-privasec-observed-ip'];
  if (process.env.PRIVASEC_CLOUDFLARE_EDGE === 'true' && typeof workerObservedIp === 'string') {
    const normalizedWorkerIp = normalizeIp(workerObservedIp);
    if (validateIp(normalizedWorkerIp).isValid) {
      candidateIp = normalizedWorkerIp;
      observationSource = 'SOCKET_PEER';
    }
  }

  if (!candidateIp && isPeerTrusted) {
    // 1. Cloudflare header (if present & valid)
    if (typeof cfConnectingIp === 'string' && cfConnectingIp.trim()) {
      const normCf = normalizeIp(cfConnectingIp);
      if (validateIp(normCf).isValid) {
        candidateIp = normCf;
        observationSource = 'TRUSTED_PROXY_CHAIN';
      }
    }

    // 2. X-Forwarded-For chain
    if (!candidateIp && xForwardedFor) {
      const rawXff = Array.isArray(xForwardedFor) ? xForwardedFor.join(',') : xForwardedFor;
      if (rawXff && typeof rawXff === 'string') {
        const hops = rawXff.split(',').map((s) => normalizeIp(s)).filter(Boolean);
        const validHops = hops.filter((h) => validateIp(h).isValid);
        if (validHops.length > 0) {
          // Walk right-to-left from the trusted ingress. The first untrusted hop is the client candidate.
          let candidate: string | null = directPeer;
          for (let i = validHops.length - 1; i >= 0; i--) {
            const hop = validHops[i];
            if (!isTrustedProxy(candidate || directPeer)) {
              break;
            }
            candidate = hop;
          }
          candidateIp = candidate || validHops[0];
          observationSource = 'TRUSTED_PROXY_CHAIN';
        }
      }
    }

    // 3. RFC 7239 Forwarded header (e.g. for="[2a0d:5600:19:38::11]";proto=https)
    if (!candidateIp && typeof forwarded === 'string' && forwarded.trim()) {
      const matches = forwarded.matchAll(/for=(?:"?\[?)([a-fA-F0-9:.]+)(?:\]?"?)/g);
      const forIps: string[] = [];
      for (const m of matches) {
        if (m[1]) {
          const norm = normalizeIp(m[1]);
          if (validateIp(norm).isValid) {
            forIps.push(norm);
          }
        }
      }
      if (forIps.length > 0) {
        const firstPublic = forIps.find((h) => !isTrustedProxy(h));
        candidateIp = firstPublic || forIps[0];
        observationSource = 'TRUSTED_PROXY_CHAIN';
      }
    }

    // 4. X-Real-IP
    if (!candidateIp && typeof xRealIp === 'string' && xRealIp.trim()) {
      const normReal = normalizeIp(xRealIp);
      if (validateIp(normReal).isValid) {
        candidateIp = normReal;
        observationSource = 'TRUSTED_PROXY_CHAIN';
      }
    }
  } else if (!candidateIp) {
    // Untrusted direct connection: do not trust forwarded headers to spoof IP
    candidateIp = directPeer;
  }

  if (!candidateIp) {
    candidateIp = peerValidation.isValid ? directPeer : '127.0.0.1';
  }

  const validation = validateIp(candidateIp);

  if (!validation.isValid) {
    // Safe fallback if candidate IP was somehow invalid
    const safeIp = peerValidation.isValid ? directPeer : '127.0.0.1';
    const safeValidation = validateIp(safeIp);

    return {
      ip: safeIp,
      observationSource,
      observationScope: safeValidation.isLoopback ? 'LOOPBACK' : safeValidation.isLinkLocal ? 'LINK_LOCAL' : safeValidation.isCGNAT ? 'CGNAT' : safeValidation.isReserved ? 'RESERVED' : safeValidation.isPrivate ? 'PRIVATE' : safeValidation.isPublic ? 'PUBLIC' : 'UNKNOWN',
      isAuthoritativeForClientEgress: safeValidation.isPublic,
      version: safeValidation.version === 'invalid' ? 'IPv4' : safeValidation.version,
      isPrivate: safeValidation.isPrivate,
      isReserved: safeValidation.isReserved,
      isLoopback: safeValidation.isLoopback,
      isLinkLocal: safeValidation.isLinkLocal,
      isCGNAT: safeValidation.isCGNAT,
      isPublic: safeValidation.isPublic,
      hasProxyHeaders,
      isInfrastructureProxy,
      viaHeader,
      ipSource: observationSource === 'TRUSTED_PROXY_CHAIN' ? 'TRUSTED_PROXY_CHAIN' : 'LOCAL_ENDPOINT',
      connectionType: safeValidation.isLoopback ? 'LOCAL_DEVELOPMENT' : safeValidation.isPublic ? 'PUBLIC_EGRESS' : safeValidation.isPrivate ? 'PRIVATE_NETWORK' : 'UNKNOWN',
      localAddress: safeValidation.isLoopback || safeValidation.isPrivate ? safeIp : null,
      publicIp: safeValidation.isPublic ? safeIp : null,
      publicIpConfidence: safeValidation.isPublic ? 'HIGH' : 'UNKNOWN',
    };
  }

  return {
    ip: normalizeIp(candidateIp),
    observationSource,
    observationScope: validation.isLoopback ? 'LOOPBACK' : validation.isLinkLocal ? 'LINK_LOCAL' : validation.isCGNAT ? 'CGNAT' : validation.isReserved ? 'RESERVED' : validation.isPrivate ? 'PRIVATE' : validation.isPublic ? 'PUBLIC' : 'UNKNOWN',
    isAuthoritativeForClientEgress: validation.isPublic,
    version: validation.version as 'IPv4' | 'IPv6',
    isPrivate: validation.isPrivate,
    isReserved: validation.isReserved,
    isLoopback: validation.isLoopback,
    isLinkLocal: validation.isLinkLocal,
    isCGNAT: validation.isCGNAT,
    isPublic: validation.isPublic,
    hasProxyHeaders,
    isInfrastructureProxy,
    viaHeader,
    ipSource: observationSource === 'TRUSTED_PROXY_CHAIN' ? 'TRUSTED_PROXY_CHAIN' : (validation.isLoopback || validation.isPrivate ? 'LOCAL_ENDPOINT' : 'SERVER_OBSERVED'),
    connectionType: validation.isLoopback ? 'LOCAL_DEVELOPMENT' : validation.isPublic ? 'PUBLIC_EGRESS' : validation.isPrivate ? 'PRIVATE_NETWORK' : 'UNKNOWN',
    localAddress: validation.isLoopback || validation.isPrivate ? normalizeIp(candidateIp) : null,
    publicIp: validation.isPublic ? normalizeIp(candidateIp) : null,
    publicIpConfidence: validation.isPublic ? 'HIGH' : 'UNKNOWN',
  };
}
