# IP Intelligence Backend Architecture (Stage 5)

## 1. Overview & Objectives
The Stage 5 IP Intelligence Backend provides a production-grade, highly resilient service for extracting client IP addresses, performing validation and normalization, and fetching GeoIP, network, ASN, and proxy/hosting intelligence via an isolated provider abstraction layer.

---

## 2. Request Flow
```
Client Request
      │
      ▼
Express Router (/api/ip, /api/ip/details)
      │
      ├──> Client IP Extractor (ipExtractor.ts)
      │       ├── Inspect Proxy Headers (CF-Connecting-IP, X-Real-IP, X-Forwarded-For)
      │       ├── Strip Ports, Brackets, IPv6-mapped IPv4 prefixes
      │       └── Validate & Classify (IPv4/IPv6, Loopback, Private, Reserved)
      │
      └──> GeoIP Service (geoip.ts)
              ├── Check In-Memory Bounded LRU/TTL Cache
              └── Delegate to Provider Abstraction (IGeoIPProvider)
                      ├── Private/Loopback? ──> FallbackGeoIPProvider (Local Network)
                      └── Public IP? ─────────> IpApiProvider (ip-api.com)
                                                      │ (Timeout / Failure)
                                                      └──> Fallback Error Protection
```

---

## 3. Client IP Detection & Trusted Proxy Model
The service evaluates incoming HTTP requests to determine the true client IP while defending against header spoofing:
1. **Header Evaluation Hierarchy**:
   - `CF-Connecting-IP` (Cloudflare CDN ingress)
   - `X-Real-IP` (Nginx reverse proxy)
   - `X-Forwarded-For` (Parses comma-separated list, selecting the leftmost valid client address)
   - `Forwarded` (Parses standard `for=<ip>` parameters)
   - `req.socket.remoteAddress` / `req.ip` (TCP socket fallback)
2. **Spoof Defenses**: If a client provides a malformed IP in `X-Forwarded-For`, `ipExtractor` safely discards the invalid header value and falls back to the socket's direct remote address.

---

## 4. IP Normalization & Validation
Address parsing and range classification is handled by `server/utils/ipExtractor.ts`:
- **Normalization**: Strips whitespace, IPv6 brackets `[2001:db8::1]`, ports `:8080`, and IPv6-mapped IPv4 prefixes `::ffff:`.
- **IPv4 Classification**: Identifies loopback (`127.0.0.0/8`), RFC 1918 private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local (`169.254.0.0/16`), CGNAT (`100.64.0.0/10`), and TEST-NETs (`192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`).
- **IPv6 Classification**: Identifies loopback (`::1`), unspecified (`::`), unique local unicast (`fc00::/7`), link-local (`fe80::/10`), and documentation ranges (`2001:db8::/32`).

---

## 5. Provider Abstraction & Architecture
External intelligence lookup is decoupled from application routes via the `IGeoIPProvider` interface:
```typescript
export interface GeoIPResult {
  geo: {
    country: string;
    countryCode: string;
    region: string;
    city: string;
    postalCode: string;
    latitude: number;
    longitude: number;
    timezone: string;
  };
  network: {
    isp: string;
    organization: string;
    asn: string;
    isMobile: boolean;
    isProxy: boolean;
    isVpn: boolean;
    isTor: boolean;
    isHosting: boolean;
  };
}

export interface IGeoIPProvider {
  readonly name: string;
  lookup(ip: string): Promise<GeoIPResult>;
}
```

### Implementations:
- `IpApiProvider`: Primary production implementation querying `ip-api.com`. Automatically parses ASN strings (e.g., `AS13335`), maps proxy/hosting/mobile flags, and uses `AbortController` timeouts.
- `FallbackGeoIPProvider`: Guarantees zero-downtime execution for local/private subnets or during external provider outages.
- `MockGeoIPProvider`: Used during unit test suites to simulate timeouts, rate limits, failures, and custom payloads.

---

## 6. Environment Variables
- `GEOIP_API_KEY` (Optional): Server-side secret used for commercial GeoIP provider endpoints.
- **Security Rule**: `GEOIP_API_KEY` is lazily loaded via `getGeoIPConfig()` in `server/config.ts`. It is strictly isolated to server-side provider HTTP requests and is **never** sent to the client browser, stringified into JSON API responses, or exposed in error logs.

---

## 7. Error Handling & Timeout Control
- **Timeout Limit**: External provider requests time out after 5000ms using `AbortController`.
- **Graceful Fallback**: If an external provider times out or returns non-200 responses, `GeoIPService` logs a warning and returns a clean, degraded `FallbackGeoIPProvider` object instead of crashing with a 500 error.
- **Client Input Error**: Invalid IP query parameters (e.g. `/api/ip/details?ip=bad-ip`) return a standard 400 Bad Request error payload with error code `INVALID_IP`.

---

## 8. Caching Strategy
- `GeoIPService` implements a bounded in-memory cache (`Map<string, CacheEntry>`).
- **Bound Limit**: Maximum 1,000 cached IP addresses.
- **TTL**: 1 hour (3,600,000ms).
- **Eviction**: Oldest keys are evicted automatically when cache size reaches capacity to prevent memory leaks.

---

## 9. Privacy & Compliance Baseline
- **Zero Raw IP Persistence**: IP addresses processed during Stage 5 are evaluated strictly in-memory and are never written to permanent disk logs or databases.
- **No Third-Party Leakage**: No client request metadata (cookies, session IDs) is forwarded to third-party GeoIP services.

---

## 10. Testing Strategy
A standalone test suite (`server/tests/ip.test.ts`) verifies 15 key scenarios:
1. Valid IPv4 detection
2. Valid IPv6 detection
3. Malformed IPv4 rejection
4. Malformed IPv6 rejection
5. Private IPv4 classification
6. Loopback IP classification
7. Reserved IP classification
8. Trusted proxy header parsing (`X-Forwarded-For`, `Via`)
9. Untrusted/malformed proxy header fallback
10. Provider success response mapping
11. Provider timeout safe fallback
12. Provider failure error handling
13. Invalid/empty provider response defaults
14. Missing optional provider fields handling
15. Secret key protection (instance stringification sanitization)

---

## 11. Known Provider Limitations
- Free tier of `ip-api.com` operates over HTTP with a rate limit of 45 requests per minute. Commercial HTTPS endpoints require a `GEOIP_API_KEY`.
- Mobile carrier proxy NATs may report regional location rather than precise GPS coordinates.
