# API Specification: Privacy & Browser Intelligence Auditor

## 1. REST API Architecture Overview
The API is organized as standard RESTful endpoints hosted under the `/api` prefix. All response payloads return standard JSON format with uniform structure for success and error states.

### Standard Response Structure
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-08-13T02:55:00.000Z",
    "requestId": "req_123456789"
  }
}
```

### Standard Error Structure
```json
{
  "success": false,
  "error": {
    "code": "INVALID_FINGERPRINT_PAYLOAD",
    "message": "Missing required canvas hash parameter",
    "details": []
  }
}
```

---

## 2. API Endpoints Catalog

### Endpoint 1: `GET /api/ip`
- **Purpose**: Fast server-side IP extraction and preliminary connection audit.
- **Auth Required**: No (Public).
- **Request Parameters**: None.
- **Request Headers Inspected**: `X-Forwarded-For`, `CF-Connecting-IP`, `X-Real-IP`, `User-Agent`, `Sec-GPC`, `DNT`, etc.
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "ip": "203.0.113.195",
    "ipVersion": "IPv4",
    "isPrivate": false,
    "headers": {
      "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
      "secGpc": "1",
      "dnt": null,
      "acceptLanguage": "en-US,en;q=0.9,ar;q=0.8",
      "connection": "keep-alive"
    },
    "connectionFlags": {
      "hasProxyHeaders": false,
      "viaHeader": null
    }
  }
}
```

---

### Endpoint 2: `GET /api/ip/details`
- **Purpose**: Enriched network, GeoIP, ASN, and proxy/hosting intelligence lookup.
- **Auth Required**: No (Public).
- **Query Parameters**:
  - `ip` (optional string): Target IP address to look up (defaults to client IP if omitted).
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "ip": "203.0.113.195",
    "geo": {
      "country": "United States",
      "countryCode": "US",
      "region": "California",
      "city": "San Francisco",
      "postalCode": "94105",
      "latitude": 37.7749,
      "longitude": -122.4194,
      "timezone": "America/Los_Angeles"
    },
    "network": {
      "isp": "Cloudflare Inc.",
      "organization": "Cloudflare",
      "asn": "AS13335",
      "isMobile": false,
      "isProxy": true,
      "isVpn": false,
      "isTor": false,
      "isHosting": true
    }
  }
}
```

---

### Endpoint 3: `POST /api/analyze/browser`
- **Purpose**: Receives client-collected browser fingerprint signals and combines them with server IP/headers data to produce a final consolidated Privacy Score and vulnerability report.
- **Auth Required**: No (Public).
- **Request Body**:
```json
{
  "fingerprint": {
    "canvasHash": "a1b2c3d4e5f6...",
    "webgl": {
      "vendor": "Google Inc. (Apple)",
      "renderer": "ANGLE (Apple, Apple M1 Pro, OpenGL 4.1)"
    },
    "audioHash": "9f8e7d6c...",
    "hardware": {
      "cpuCores": 8,
      "deviceMemory": 16,
      "touchPoints": 0
    },
    "screen": {
      "width": 1920,
      "height": 1080,
      "colorDepth": 24,
      "pixelRatio": 2
    },
    "timezone": "America/Los_Angeles",
    "languages": ["en-US", "en", "ar"],
    "webRtc": {
      "localIps": ["190.168.1.15"],
      "publicIps": ["203.0.113.195"]
    },
    "securityFlags": {
      "isAutomation": false,
      "isAdBlockActive": true,
      "isIncognito": false
    }
  }
}
```
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "privacyScore": 82,
    "tier": "GOOD",
    "summary": "Solid privacy configuration with minor browser fingerprint uniqueness.",
    "deductions": [
      {
        "category": "BROWSER_FINGERPRINT",
        "factor": "WebGL Hardware Exposed",
        "points": -10,
        "recommendation": "Use WebGL masking extension or Safari Private Browsing."
      },
      {
        "category": "NETWORK",
        "factor": "Public Hosting IP",
        "points": -8,
        "recommendation": "Switch to a non-datacenter VPN IP."
      }
    ],
    "breakdown": {
      "networkScore": 92,
      "headerScore": 100,
      "fingerprintScore": 70,
      "securityScore": 85
    }
  }
}
```

---

### Endpoint 4: `POST /api/admin/login`
- **Purpose**: Authenticate administrator session.
- **Auth Required**: No.
- **Request Body**: `{ "username": "admin", "password": "..." }`
- **Success Response (200 OK)**: Sets HTTP-Only authentication cookie / returns session token.

---

### Endpoint 5: `GET /api/admin/stats`
- **Purpose**: Retrieve system analytics, scan volume, average scores, threat counts.
- **Auth Required**: Yes (Admin Session).
- **Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "totalScans": 1420,
    "uniqueIps": 890,
    "averagePrivacyScore": 68.4,
    "vpnPercentage": 34.2,
    "webRtcLeakPercentage": 8.1,
    "topCountries": [
      { "countryCode": "US", "count": 450 },
      { "countryCode": "DE", "count": 210 }
    ]
  }
}
```

---

### Endpoint 6: `GET /api/health`
- **Purpose**: Service health check probe.
- **Auth Required**: No.
- **Success Response (200 OK)**: `{ "status": "ok", "uptime": 3600 }`
