> **HISTORICAL / SUPERSEDED:** This report records an earlier implementation state and is not the current scoring contract. See `docs/architecture/PRIVACY_ENGINE.md` and `docs/architecture/ACCURACY_CORE_CANONICAL.md` for the current behavior.

# Forensic Data Accuracy Diagnostic: IP Extraction & GeoIP Resolution

**Application**: Privacy & Browser Intelligence Auditor  
**Audit Context**: Forensic Analysis of Link-Local `169.254.169.126` & Forwarded Chain  
**Date**: 2026-08-17  
**Mode**: READ-ONLY Diagnostic Investigation  

---

## Executive Diagnostic Summary

A thorough investigation of the runtime network path and application logic confirms that the reported values (`169.254.169.126`, `Localhost`, `00000`, `UTC`, `RESIDENTIAL / BROADBAND`, `Fixed / Wi-Fi`) result from a **combination of an IP extraction precedence bug and synthetic fallback defaults** in the GeoIP service layer.

Specifically:
1. **IP Extraction Flaw**: `extractClientIp()` prioritizes `req.headers['x-real-ip']` ahead of `x-forwarded-for` and `forwarded`. In Google Cloud Run / Google AI Studio containerized environments, the ingress proxy stamps `X-Real-IP: 169.254.169.126` (the internal Link-Local RFC3927 sidecar proxy IP), while placing the true public client IP (`2a0d:5600:19:38::11`) in `X-Forwarded-For` (`2a0d:5600:19:38::11, 169.254.169.126`) and `Forwarded` (`for="[2a0d:5600:19:38::11]";proto=https`).
2. **Synthetic Fallback Defaults**: When `169.254.169.126` is classified as private/reserved, `FallbackGeoIPProvider` returns fabricated placeholder literals (`city: 'Localhost'`, `postalCode: '00000'`, `timezone: 'UTC'`) instead of semantic `UNAVAILABLE` states.
3. **Binary Flag UI Inversion**: In `SecurityFlagsCard.tsx`, the absence of a `isHosting` or `isMobile` flag is rendered as affirmative claims: `RESIDENTIAL / BROADBAND` and `Fixed / Wi-Fi` rather than `UNAVAILABLE` or `UNVERIFIED`.

---

## Step 1: Trace IP Extraction Path

```
[Browser Client] (Public IPv6: 2a0d:5600:19:38::11)
       │ (HTTPS Request)
       ▼
[Google Cloud Ingress / AI Studio Reverse Proxy]
       │
       │ Appends Ingress Headers:
       │  • Forwarded: for="[2a0d:5600:19:38::11]";proto=https
       │  • X-Forwarded-For: 2a0d:5600:19:38::11, 169.254.169.126
       │  • X-Real-IP: 169.254.169.126 (Proxy's own link-local interface)
       ▼
[Express Server: server.ts]
       │ (App has no 'trust proxy' configured on Express instance)
       ▼
[Route: GET /api/ip or GET /api/ip/details (server/routes/ip.ts)]
       │
       ▼
[extractClientIp(req) in server/utils/ipExtractor.ts]
       │
       ├─► Evaluates: if (cfConnectingIp) ...
       ├─► Evaluates: else if (xRealIp) ───► MATCH! candidateIp = "169.254.169.126"
       │   (SKIPS xForwardedFor and forwarded headers!)
       ▼
[validateIp("169.254.169.126")]
       │
       └─► Result: isValid=true, isPrivate=true, isReserved=true, isLinkLocal=true
       ▼
[IpApiProvider.lookup("169.254.169.126")]
       │
       └─► Detects validation.isPrivate === true ──► Diverts to FallbackGeoIPProvider
       ▼
[FallbackGeoIPProvider]
       │
       └─► Returns: { city: 'Localhost', postalCode: '00000', timezone: 'UTC', isp: 'Local / Private Network' }
       ▼
[UI Layer (IpPrimaryCard, GeoNetworkCard, SecurityFlagsCard)]
       │
       └─► Displays:
           - IP: 169.254.169.126
           - City: Localhost
           - Postal Code: 00000
           - Timezone: UTC
           - Hosting: RESIDENTIAL / BROADBAND (Inferred from !isHosting)
           - Mobile: Fixed / Wi-Fi (Inferred from !isMobile)
```

---

## Step 2: Trust Proxy Configuration Analysis

1. **Express `app.set('trust proxy', ...)`**:
   - `server.ts` does **not** configure `app.set('trust proxy', ...)`.
   - Therefore, `req.ip` falls back to the socket's direct remote address (`127.0.0.1` or the container proxy address).
2. **`extractClientIp()` Priority Order**:
   - Currently in `server/utils/ipExtractor.ts`:
     1. `cf-connecting-ip`
     2. `x-real-ip` (Faulty: Captures reverse proxy link-local IP in Google Cloud Run)
     3. `x-forwarded-for` (Correct: Contains client public IP as first element)
     4. `forwarded` (Correct: RFC 7239 `for=` parameter)
     5. `req.socket.remoteAddress`
3. **Vulnerability / Flaw**: In standard reverse-proxy topologies (Nginx, Envoy, Cloud Run, GCP GCLB), `X-Real-IP` is frequently rewritten by intermediate reverse proxies to their own local bridge/link-local interface (`169.254.x.x` or `10.x.x.x`), whereas the canonical client hop is preserved at the beginning of the `X-Forwarded-For` chain.

---

## Step 3: IP Classification Analysis

1. **Classification of `169.254.169.126`**:
   - Belongs to IPv4 Link-Local address block `169.254.0.0/16` (RFC 3927 / RFC 5735).
   - In `server/utils/ipExtractor.ts`, `validateIp` calculates `isLinkLocal = (long & 0xffff0000) === ((169 << 24) | (254 << 16))`, which correctly tags `isPrivate: true` and `isReserved: true`.
2. **Classification Failure Point**:
   - While the backend correctly marks `isPrivate: true`, the fallback data injector in `FallbackGeoIPProvider` and the UI renderer in `SecurityFlagsCard` treat missing flags as negative boolean states (`isHosting: false`, `isMobile: false`), which display as `RESIDENTIAL / BROADBAND` and `Fixed / Wi-Fi`.

---

## Step 4: Forwarded Chain & Public IPv6 Inspection

1. **Inspection of Hops**:
   - `2a0d:5600:19:38::11`: Valid, globally routable public IPv6 address belonging to the external client.
   - `169.254.169.126`: Non-routable IPv4 Link-Local address representing Google Cloud Run's internal container ingress bridge.
2. **Chain Parsing Verification**:
   - `X-Forwarded-For: 2a0d:5600:19:38::11, 169.254.169.126`
   - Hop 0 (`2a0d:5600:19:38::11`) is the client origin.
   - Hop 1 (`169.254.169.126`) is the internal proxy hop.
   - `Forwarded: for="[2a0d:5600:19:38::11]";proto=https` independently corroborates Hop 0 as the client origin.
3. **Conclusion on IPv6**: The public IPv6 `2a0d:5600:19:38::11` is the authentic client address and should be the target passed to the GeoIP lookup service.

---

## Step 5: GeoIP Input & Output Breakdown

1. **Why was `169.254.169.126` sent?**:
   - Because `x-real-ip` took precedence over `x-forwarded-for` in `ipExtractor.ts`.
2. **Provider Response**:
   - `IpApiProvider.ts` recognized `validation.isPrivate === true` and aborted the external HTTP call to avoid querying public APIs with link-local IPs.
   - It routed the request to `FallbackGeoIPProvider.ts`, which generated the static fallback object.

---

## Step 6: Fallback Data Audit (Fabricated vs. Real Values)

| Field | Returned Fallback | Classification | Verdict |
|---|---|---|---|
| Postal Code | `"00000"` | **Fabricated Literal** | **Defect**: Must be `null` or `"Unavailable"`. `"00000"` misleadingly implies a valid numeric ZIP. |
| Timezone | `"UTC"` | **Fabricated Literal** | **Defect**: Must be `null` or `"Unavailable"`. UTC is misleading when timezone is unknown. |
| City | `"Localhost"` | **Fabricated Literal** | **Defect**: Must be `"Private Network / Localhost"`. |
| Region | `"Private Subnet"` | **Derived Descriptor** | Acceptable as a scope description if labeled as such. |
| Country | `"Local Network"` | **Derived Descriptor** | Acceptable as a scope description if labeled as such. |
| ISP | `"Local / Private Network"` | **Derived Descriptor** | Acceptable as a scope description. |
| ASN | `"AS0"` / `"Not Assigned"` | **Standard Protocol Indicator**| Acceptable RFC standard representation for unrouted networks. |

---

## Step 7: UI Semantics & State Representation

The UI currently fails to distinguish between **Factually False** and **Unavailable/Unverified**:
- When `network.isHosting === false`, the UI renders `RESIDENTIAL / BROADBAND` instead of checking whether the IP was actually checked against an ISP database.
- When `network.isMobile === false`, the UI renders `Fixed / Wi-Fi`.
- For private/link-local addresses, all geo fields should render an explicit `UNAVAILABLE` or `LOCAL_RUNTIME` badge rather than pseudo-valid values.

---

## Step 8: Network Type Classification Origin

1. **`RESIDENTIAL / BROADBAND`**:
   - Sourced from `SecurityFlagsCard.tsx` line 69: `label={network.isHosting ? t.ip.datacenterBadge : t.ip.residentialBadge}`.
   - **Root Flaw**: Absence of `isHosting` boolean is not evidence of a residential connection.
2. **`Fixed / Wi-Fi`**:
   - Sourced from `SecurityFlagsCard.tsx` line 78: `label={network.isMobile ? t.ip.cellularCarrier : t.ip.fixedWifi}`.
   - **Root Flaw**: Absence of `isMobile` flag is not evidence of Wi-Fi or fixed broadband.
3. **Browser Network Information (`navigator.connection`)**:
   - Sourced from `collectNetwork()` in `src/features/browser/collectors/networkCollector.ts`.
   - Correctly isolates `effectiveType`, `downlink`, and `rtt` without fabricating ISP types.

---

## Step 9: GeoIP Impossibility Principle

For any IP address where `validateIp(ip).isPrivate === true` or `isReserved === true`:
- The service must return `geo: null` or explicit semantic status `{ isAvailable: false, reason: 'PRIVATE_OR_RESERVED_IP' }`.
- Geographic coordinates must remain `null` (not `0, 0` which represents the Gulf of Guinea / Null Island).
- Postal code and timezone must remain `null`.

---

## Step 10: Diagnostic Matrix for IP Extraction Scenarios

| # | Scenario | Raw Headers Observed | Correct Expected Client IP | Current Code Behavior |
|---|---|---|---|---|
| 1 | Public IPv4 Direct | `X-Real-IP: 198.51.100.1` | `198.51.100.1` | `198.51.100.1` (Correct) |
| 2 | Cloud Run Proxy Chain | `X-Forwarded-For: 2a0d:5600::1, 169.254.169.126`, `X-Real-IP: 169.254.169.126` | `2a0d:5600::1` | **`169.254.169.126` (BUG)** |
| 3 | RFC 7239 `Forwarded` | `Forwarded: for="[2001:db8::2]";proto=https` | `2001:db8::2` | `2001:db8::2` (Correct if no X-Real-IP) |
| 4 | Cloudflare CDN | `CF-Connecting-IP: 203.0.113.195` | `203.0.113.195` | `203.0.113.195` (Correct) |
| 5 | Multi-hop Untrusted Proxy | `X-Forwarded-For: 10.0.0.1, 198.51.100.5` | `198.51.100.5` (Right-most untrusted) or First public | Takes `10.0.0.1` (Takes first hop blindly) |
| 6 | Loopback Direct | No headers, `socket.remoteAddress: 127.0.0.1` | `127.0.0.1` (Private) | `127.0.0.1` (Correct) |

---

## Step 11: GeoIP Provider Response Integrity

In `IpApiProvider.ts`:
- When an external lookup fails or IP is private, `data.city` and `data.zip` are defaulted to `'Unknown'` and `''`.
- However, `FallbackGeoIPProvider.ts` replaces them with `'Localhost'` and `'00000'`, contaminating downstream consumers.

---

## Step 12: User Trust Assessment

| Claim | Can User Be Misled? | Evidence |
|---|---|---|
| `169.254.169.126` is their public IP | **YES** | Displayed under title "Detected Public IP Address" |
| `Localhost` is their actual city | **YES** | Displayed in "City" field of Geographic Intelligence |
| `UTC` is their actual timezone | **YES** | Displayed in "Timezone" field |
| `00000` is their postal code | **YES** | Displayed in "Postal Code" field |
| `Residential / Broadband` is their ISP | **YES** | Green badge rendered in Security Flags |
| `Fixed / Wi-Fi` is proven from network | **YES** | Displayed in Network & ASN Infrastructure |

---

## Step 13: Privacy Score Impact Analysis

1. **Proxy Headers Penalty**:
   - `HDR_PROXY_FLAGS` in `FactorRegistry.ts` deducted `-10 points` because `hasProxyHeaders: true`.
   - In Cloud Run / AI Studio preview environments, proxy headers are generated by cloud infrastructure for container routing. Deducting points for infrastructure proxy headers unfairly penalizes the user's privacy score.
2. **Private IP Deduction**:
   - `NET_PRIVATE_RANGE` has 0 deductions (status `INFO`), which is correct.
3. **Unmasked Client IP**:
   - Because `169.254.169.126` was used, the user's real public IPv6 (`2a0d:5600:19:38::11`) was not audited for WebRTC IP leakage correlation.

---

## Step 14: Header Analyzer Classification Audit

In `server/headers/HeaderClassifier.ts`:
- `x-forwarded-for`, `forwarded`, `x-real-ip`, and `x-forwarded-proto` are categorized under `PROXY_NETWORK` and flagged as `WARNING` (`severity: medium`, `riskPoints: 5`).
- **Assessment**: These headers are added by Google Cloud Run / Google AI Studio runtime architecture. Classifying them as risky user-side proxy leakage is technically inaccurate in hosted container environments.

---

## Step 15: Root Cause & Files Responsible

### Root Cause
1. **Precedence Inversion in IP Extraction**: `ipExtractor.ts` inspected `x-real-ip` before `x-forwarded-for` and `forwarded`.
2. **Synthetic Fallback Ingestion**: `FallbackGeoIPProvider.ts` provided fake strings (`00000`, `Localhost`, `UTC`) instead of `null`/`Unavailable`.
3. **Binary Assumption in UI**: `SecurityFlagsCard.tsx` mapped `!isHosting` to `RESIDENTIAL / BROADBAND` and `!isMobile` to `Fixed / Wi-Fi`.

### Exact Files Responsible
1. `/server/utils/ipExtractor.ts` (Lines 168–186)
2. `/server/providers/geoip/FallbackGeoIPProvider.ts` (Lines 8–28)
3. `/src/features/ip/components/SecurityFlagsCard.tsx` (Lines 65–81)
4. `/src/features/ip/components/GeoNetworkCard.tsx` (Lines 34–67)
5. `/server/privacy/factors/FactorRegistry.ts` (Lines 185–212)

---

## Final Decision

**D. MIXED — ENVIRONMENT LIMITATION + APPLICATION FALLBACK BUG**

### Justification:
1. **Application Bug (Extraction & Fallback)**: The precedence order in `extractClientIp` erroneously selected `X-Real-IP` (`169.254.169.126`) instead of extracting the real client IP (`2a0d:5600:19:38::11`) from `X-Forwarded-For` or `Forwarded`. Furthermore, `FallbackGeoIPProvider` returned misleading synthetic values (`00000`, `Localhost`, `UTC`).
2. **Environment Limitation (Infrastructure Proxy Headers)**: Google Cloud Run automatically injects proxy routing headers (`X-Forwarded-For`, `Forwarded`, `X-Real-IP`) for container ingress. The privacy engine and header classifier currently treat these infrastructure headers as user-originated proxy risks.
