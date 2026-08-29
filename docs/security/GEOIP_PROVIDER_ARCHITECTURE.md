# GeoIP Provider Architecture & Integration Guide

**Document Version:** 1.1.0 (FIX 8.4.1 — GeoIP Runtime Recovery)  
**Status:** PRODUCTION READY  
**Provider:** HackMyIP (`https://hackmyip.com/api/lookup`)

---

## 1. Overview

The Privacy Auditor GeoIP subsystem resolves incoming client IP addresses (both IPv4 and IPv6) to geolocation and autonomous system network metadata (ASN, ISP, Organization) without leaking sensitive client request parameters, headers, or cookies to upstream services.

### Core Objectives
1. **Zero Key Dependency for Public Tier**: Native resolution over HTTPS without requiring fragile free-tier rate limits or unauthenticated HTTP downgrades.
2. **Dual-Stack IPv4/IPv6 Support**: Full support for both 32-bit IPv4 addresses and 128-bit IPv6 addresses.
3. **Strict Normalization**: Upstream payloads are strictly validated, sanitised, and converted into our unified `GeoIPResult` contract (`geo` and `network` sections).
4. **Resilience & Safe Fallback**: If an upstream provider is unresponsive, times out, or returns an error, the system gracefully falls back to `FallbackGeoIPProvider` (`Private Network` or `Unavailable`) with zero mock data fabrication and zero application crashes.
5. **Privacy Guard**: Only the validated target IP address is sent in query parameters (`?ip=...`). Client user-agents, cookies, referrers, and fingerprint entropy are never transmitted to third parties.

---

## 2. Provider Abstraction (`IGeoIPProvider`)

All GeoIP providers implement the `IGeoIPProvider` interface:

```typescript
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

---

## 3. Provider Implementation Roster

| Provider | Status | Transport | Default Port | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **`HackMyIPProvider`** | **PRIMARY DEFAULT** | HTTPS | 443 | High-availability endpoint at `https://hackmyip.com/api/lookup?ip={IP}`. Bounded 5000ms timeout. |
| **`FallbackGeoIPProvider`** | **SAFE FALLBACK** | Local In-Memory | N/A | Returns non-fabricated semantic indicators for private or unresolvable networks (`Private Network`, `Unavailable`). |
| **`IpApiProvider`** | **OPTIONAL / CUSTOM** | HTTPS | 443 | Configured for enterprise/pro keys via `GEOIP_API_KEY`. Free tier restricted to HTTP. |
| **`MockGeoIPProvider`** | **TESTING ONLY** | Local In-Memory | N/A | Deterministic testing fixture for timeouts, faults, and unit test suites. |

---

## 4. Normalization Mapping

### Geolocation Normalization
- `geo.country`: `data.location.country_name || data.location.country || 'Unknown'`
- `geo.countryCode`: ISO 3166-1 alpha-2 code (e.g. `'CH'`, `'US'`), or `'PRIVATE'` / `'XX'`
- `geo.region`: Administrative region or state name
- `geo.city`: City name
- `geo.postalCode`: Postal / Zip code
- `geo.latitude`: Floating-point latitude or `null`
- `geo.longitude`: Floating-point longitude or `null`
- `geo.timezone`: IANA Timezone identifier (e.g. `'Europe/Zurich'`)

### Network & Infrastructure Normalization
- `network.isp`: Service provider name (e.g. `'Datacamp Limited'`, `'Google LLC'`)
- `network.organization`: Autonomous organization or ASN owner
- `network.asn`: Standard ASN format (e.g. `'AS60068'`, `'AS15169'`), or `'—'`
- `network.isHosting`: Datacenter / Cloud hosting infrastructure flag
- `network.isProxy`: Explicit proxy indicator
- `network.isVpn`: Explicit VPN tunnel indicator
- `network.isTor`: Tor exit node indicator
- `network.isMobile`: Cellular carrier / mobile data indicator

---

## 5. Security Invariants & Anti-Fabrication Rules

1. **No Speculative Inference**:
   - `isMobile: false` DOES NOT imply `Fixed / Wi-Fi`. The UI presents `NOT DETECTED / UNCONFIRMED`.
   - `isHosting: false` DOES NOT imply `Residential`. The UI presents `NOT DETECTED / UNCONFIRMED`.
2. **Private & Non-Routable IP Protection**:
   - Loopback (`127.0.0.1`, `::1`), RFC1918 private subnets, Link-Local (`169.254.0.0/16`, `fe80::/10`), CGNAT (`100.64.0.0/10`), and ULA (`fc00::/7`) never trigger outbound WAN requests to external providers.
3. **Bounded In-Memory Caching**:
   - Resolved results are cached with an LRU cap (1000 entries) and 1-hour TTL to prevent upstream rate-limit exhaustion.
4. **Secret Non-Leakage**:
   - Configuration objects, API keys, and environment tokens are stripped from all serialized API output and client responses.
