# Architecture Specification: Privacy & Browser Intelligence Auditor

## 1. High-Level Architecture Overview
The application follows a full-stack single-port architecture built on **Express + Vite + React 19 + TypeScript + Tailwind CSS**. The Node.js Express server acts as both the backend API server and the dev asset server via Vite middleware in development, and serves static built assets in production.

```
+-----------------------------------------------------------------------+
|                             CLIENT BROWSER                            |
|                                                                       |
|  +------------------+  +-------------------+  +--------------------+  |
|  |  React 19 Views  |  | i18n RTL Engine   |  | Browser Collectors |  |
|  | (Dashboard, UI)  |  | (English/Arabic)  |  | (Canvas, WebGL...) |  |
|  +--------+---------+  +---------+---------+  +---------+----------+  |
|           |                      |                      |             |
+-----------|----------------------|----------------------|-------------+
            |                      |                      |
            +----------------------+----------------------+
                                   | HTTP / REST API
                                   v
+-----------------------------------------------------------------------+
|                            EXPRESS BACKEND                            |
|                                                                       |
|  +-------------------+  +------------------+  +--------------------+  |
|  | Request Middleware|  | IP Intelligence  |  | Privacy Engine     |  |
|  | (CORS, IP, Auth)  |  | (GeoIP, Proxy)   |  | (Scoring Formula)  |  |
|  +--------+----------+  +--------+---------+  +---------+----------+  |
|           |                      |                      |             |
|  +--------v----------------------v----------------------v----------+  |
|  | Database Layer (Drizzle / SQLite or PostgreSQL / Memory)        |  |
|  +-----------------------------------------------------------------+  |
+-----------------------------------------------------------------------+
```

---

## 2. Directory Structure & Module Boundary Plan

To ensure clean maintainability and modularity, the new codebase will be structured as follows:

```
/
├── docs/
│   └── reference/                    # Architectural Specifications & Specifications
├── server.ts                         # Express Server Entrypoint
├── server/
│   ├── routes/                       # Express Route Handlers
│   │   ├── ip.ts                     # IP & GeoIP routes (/api/ip, /api/ip/details)
│   │   ├── analyze.ts                # Privacy scoring (/api/analyze/browser)
│   │   ├── admin.ts                  # Admin auth & stats (/api/admin/*)
│   │   └── health.ts                 # Healthcheck route (/api/health)
│   ├── services/                     # Business Logic Services
│   │   ├── geoip.ts                  # GeoIP lookup & caching service
│   │   ├── privacyEngine.ts          # Score calculation logic
│   │   ├── headerAnalyzer.ts         # Request header classification
│   │   └── analytics.ts              # Aggregate logging service
│   ├── middleware/                   # Express Middlewares
│   │   ├── ipExtractor.ts            # Client IP parsing
│   │   └── adminAuth.ts              # Session / Token protection
│   └── db/                           # Database & Schema
│       ├── index.ts                  # DB Client Initialization
│       └── schema.ts                 # Database Table Definitions
├── src/                              # React Frontend Core
│   ├── main.tsx                      # Frontend Entrypoint
│   ├── App.tsx                       # Root Layout & Router
│   ├── types.ts                      # Shared TypeScript Interfaces
│   ├── components/                   # UI Components
│   │   ├── Header.tsx                # App Navigation & Language Switcher
│   │   ├── ScoreGauge.tsx            # Animated Privacy Score Meter
│   │   ├── OverviewTab.tsx           # Dashboard Main Summary
│   │   ├── NetworkTab.tsx            # Network, ISP, & GeoIP View
│   │   ├── BrowserTab.tsx            # Fingerprint & WebGL Collector View
│   │   ├── HeadersTab.tsx            # HTTP Header Inspector
│   │   ├── AdminTab.tsx              # Administrator Panel & Charts
│   │   └── ui/                       # Reusable UI Primitives (Badges, Cards, Modals)
│   ├── collectors/                   # Client-Side Intelligence Collectors
│   │   ├── canvasCollector.ts        # Canvas 2D Hash Gatherer
│   │   ├── webglCollector.ts         # WebGL GPU Vendor & Renderer
│   │   ├── audioCollector.ts         # AudioContext Oscillator Hash
│   │   ├── webRtcCollector.ts        # RTCPeerConnection Local IP Leak Test
│   │   └── hardwareCollector.ts     # Screen, CPU, RAM, & Battery API
│   ├── i18n/                         # Localization
│   │   ├── en.ts                     # English Dictionary
│   │   ├── ar.ts                     # Arabic Dictionary
│   │   └── LanguageContext.tsx       # React Context for Locale & RTL
│   └── lib/                          # Utility Functions & API Clients
│       ├── api.ts                    # Axios / Fetch Wrapper
│       └── utils.ts                  # Formatters & Helpers
├── package.json                      # NPM Dependencies & Scripts
├── tsconfig.json                     # TypeScript Configuration
├── vite.config.ts                    # Vite Build Configuration
└── metadata.json                     # AI Studio Platform Metadata
```

---

## 3. End-to-End Request Lifecycle & Flow

### Scenario: Browser Audit & Scoring Sequence
1. **Client Mount**: React app mounts and initializes `LanguageContext`.
2. **Initial Call**: `useEffect` fires GET `/api/ip` to retrieve server-observed IP and request headers.
3. **Parallel Fingerprint Extraction**:
   - `canvasCollector` draws hidden text/graphic and computes 32-bit hash.
   - `webglCollector` creates WebGL context and extracts unmasked renderer.
   - `audioCollector` creates AudioContext offline buffer, runs oscillator, and hashes output array.
   - `webRtcCollector` creates RTCPeerConnection to `stun:stun.l.google.com:19302`, parses ICE candidates, and checks for local IP leaks.
4. **Payload Submission**: All signals are bundled into JSON and posted to `POST /api/analyze/browser`.
5. **Server Processing**:
   - `headerAnalyzer` checks `req.headers` for `Sec-GPC`, `DNT`, `User-Agent` anomalies.
   - `geoip` service retrieves network facts (ISP, VPN, Tor, Hosting flags).
   - `privacyEngine` evaluates weighted deductions and returns final Privacy Score + Recommendations.
6. **UI Render**: Dashboard animates ScoreGauge to final value, renders risk badges, and populates signal tables.
