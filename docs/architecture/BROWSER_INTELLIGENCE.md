# Architecture Specification: Advanced Browser Intelligence Subsystem

**Subsystem Name**: Browser Intelligence Subsystem  
**Stage**: Stage 8  
**Status**: Production-Ready  
**Related Documents**: `docs/reference/BROWSER_INTELLIGENCE_SPEC.md`, `docs/reference/PRIVACY_ENGINE_SPEC.md`, `docs/reference/API_SPEC.md`, `docs/reference/FEATURE_MATRIX.md`.

---

## 1. Subsystem Architecture
- **[REFERENCE REQUIREMENT]**: Collect client-side browser facts, fingerprinting vectors, and active privacy protections without duplicating Privacy Engine scoring logic or creating user tracking IDs.
- **[IMPLEMENTATION]**: Implemented a decoupled pipeline:
  ```
  Browser Capabilities (CapabilityMatrix)
          ↓
  BrowserOrchestrator (Promise.allSettled + Timeouts)
          ↓
  15 Modular Collectors (WebRTC, Canvas, WebGL, Audio, Identity, Display, Hardware, Locale, Timezone, Storage, Automation, Network, Client Hints, Privacy Protections)
          ↓
  Local Deductions & Detectors (WebRTC, Canvas, WebGL, Audio, Automation)
          ↓
  Sanitization & Normalization (Sanitize to 12 Profile Groups + Compact BrowserFingerprintInput)
          ↓
  POST /api/analyze/browser (Server-Side Schema & Bound Validation)
          ↓
  PrivacyService & PrivacyEngine (Deterministic Mathematical Scoring)
  ```
- **[ASSUMPTION]**: Collectors execute in the user's browser context (modern Chromium, Firefox, WebKit/Safari, or Edge).
- **[BROWSER LIMITATION]**: Headless or sandbox CI environments lack physical GPU contexts and audio rendering hardware; collectors handle this gracefully with `UNAVAILABLE` fallback states.

---

## 2. Collector Registry
- **[REFERENCE REQUIREMENT]**: Modular registry of independent browser characteristic collectors.
- **[IMPLEMENTATION]**: Located in `src/features/browser/collectors/`:
  1. `capabilityCollector.ts`: Probes runtime support for WebRTC, WebGL, WebGL2, 2D Canvas, AudioContext, Storage APIs, Network Info, and Client Hints.
  2. `identityCollector.ts`: Harvests `navigator.userAgent`, `platform`, `vendor`, `product`, and normalizes browser and OS families without tracking IDs.
  3. `displayCollector.ts`: Reads screen dimensions, available workspace, color depth, pixel depth, device pixel ratio, and orientation.
  4. `hardwareCollector.ts`: Probes `navigator.hardwareConcurrency`, `navigator.deviceMemory`, and `navigator.maxTouchPoints`.
  5. `localeCollector.ts`: Reads `navigator.language`, `navigator.languages`, `Intl` resolved locale, and validates internal consistency.
  6. `timezoneCollector.ts`: Reads IANA timezone name and UTC/DST offsets using standard `Intl.DateTimeFormat`.
  7. `storageCollector.ts`: Measures capability status for cookies, localStorage, sessionStorage, and IndexedDB without reading user data.
  8. `webRtcCollector.ts`: Controlled local STUN gathering to detect private RFC 1918 leaks vs. mDNS obfuscation.
  9. `webglCollector.ts`: Probes `WEBGL_debug_renderer_info` for unmasked GPU vendor and renderer strings with automated resource cleanup.
  10. `canvasCollector.ts`: Renders offscreen 280x60 multi-font, emoji, and blended test pattern, generating local FNV-1a hash.
  11. `audioCollector.ts`: Performs synthetic DSP rendering with `OfflineAudioContext`, triangle oscillator, and `DynamicsCompressorNode`.
  12. `automationCollector.ts`: Evaluates `navigator.webdriver`, test framework window variables, and headless signatures.
  13. `networkCollector.ts`: Inspects Network Information API (`effectiveType`, `downlink`, `rtt`, `saveData`).
  14. `clientHintsCollector.ts`: Inspects `navigator.userAgentData` where available.
  15. `privacyProtectionCollector.ts`: Gathers active GPC (`Sec-GPC`), DNT, canvas randomization, and hardware masking signals.

---

## 3. Collector Lifecycle
- **[REFERENCE REQUIREMENT]**: Non-blocking asynchronous lifecycle with explicit timeout boundaries.
- **[IMPLEMENTATION]**: 
  - Immediate synchronous collectors run sequentially (< 5ms total).
  - Heavy/asynchronous collectors (`WebRTC`, `AudioContext`) execute in parallel under `Promise.allSettled`.
  - All collectors return structured `BaseCollectorResult<T>` envelopes containing `supported`, `available`, `status`, `confidence`, `durationMs`, `data`, and optional `error`.
  - Upon completion or timeout, all event listeners, contexts, and timers are explicitly destroyed.

---

## 4. Capability Detection Matrix
- **[REFERENCE REQUIREMENT]**: Probe capability before invoking specialized APIs.
- **[IMPLEMENTATION]**: `collectCapabilities()` maps runtime availability to explicit 5-state enums:
  - `SUPPORTED`: API is exposed and functional.
  - `UNSUPPORTED`: API is missing from runtime environment.
  - `BLOCKED`: API threw an access or security error.
  - `FAILED`: API initialization failed.
  - `UNKNOWN`: Status could not be determined.
- **[ASSUMPTION]**: Unsupported APIs are never coerced into `SAFE` or `NOT_DETECTED`.

---

## 5. WebRTC Methodology
- **[REFERENCE REQUIREMENT]**: Controlled ICE candidate gathering to detect private network disclosures.
- **[IMPLEMENTATION]**:
  - Instantiates `RTCPeerConnection` with public Google STUN servers.
  - Creates a dummy data channel and triggers `createOffer()` and `setLocalDescription()`.
  - Parses incoming `onicecandidate` strings with regex for IPv4 (RFC 1918 / RFC 3927) and IPv6 (ULA / Link-Local) addresses.
  - Recognizes `.local` mDNS candidates as `PROTECTED`.
  - Strict timeout (2500ms).
  - Explicit cleanup: `pc.close()`, clear event handlers, nullify references.
- **[BROWSER LIMITATION]**: Modern Chrome and Firefox obfuscate local IPs behind mDNS by default. This is accurately classified as `PROTECTED` (0 point penalty).

---

## 6. WebGL GPU Methodology
- **[REFERENCE REQUIREMENT]**: Determine whether physical GPU hardware model is disclosed.
- **[IMPLEMENTATION]**:
  - Creates offscreen canvas and acquires `webgl` or `experimental-webgl` context.
  - Queries `WEBGL_debug_renderer_info` extension constants (0x9245 `UNMASKED_VENDOR_WEBGL`, 0x9246 `UNMASKED_RENDERER_WEBGL`).
  - Measures max texture sizes, max cube map sizes, and shader precision format.
  - Generates compact FNV-1a hash of hardware parameters.
  - Explicitly releases context via `WEBGL_lose_context`.
  - If unmasked GPU model is exposed (e.g. "NVIDIA GeForce RTX 4090"), flags `EXPOSED` for Privacy Engine evaluation.

---

## 7. Canvas Fingerprinting Methodology
- **[REFERENCE REQUIREMENT]**: Measure 2D Canvas rendering signature without transmitting raw images.
- **[IMPLEMENTATION]**:
  - Renders offscreen `<canvas width="280" height="60">`.
  - Combines linear gradient background, alpha blending, overlapping circular and rectangular geometry with `multiply` composite operations, and diverse font families (`Arial`, `Times New Roman`) with emojis (`🔒🕵️‍♂️`).
  - Calls `canvas.toDataURL()` and computes a 32-bit FNV-1a hash locally.
  - Performs a secondary render to detect active anti-fingerprinting canvas noise injectors (`isRandomized`).
  - Immediately discards data URLs from memory.

---

## 8. AudioContext Fingerprinting Methodology
- **[REFERENCE REQUIREMENT]**: Privacy-safe synthetic acoustic calculation.
- **[IMPLEMENTATION]**:
  - **Zero microphone access**: Never requests `getUserMedia` or microphone permissions.
  - Uses `OfflineAudioContext(1, 44100, 44100)`.
  - Connects `OscillatorNode` (10,000 Hz triangle wave) to `DynamicsCompressorNode` (-50dB threshold, 40 knee, 12 ratio, 0 attack, 0.25 release).
  - Renders to `AudioBuffer` and calculates local FNV-1a digest over channel sample deviations.
  - Discards audio buffers.

---

## 9. Automation / Headless Methodology
- **[REFERENCE REQUIREMENT]**: Conservative detection of automated test frameworks.
- **[IMPLEMENTATION]**:
  - Direct inspection: `navigator.webdriver === true`.
  - Global variable inspection: `window._phantom`, `window.callPhantom`, `window.__selenium_evaluate`, `window.__webdriver_evaluate`, `window.__nightmare`, `window.domAutomation`, `window.Cypress`, `window.__playwright`.
  - User-Agent heuristics: `HeadlessChrome` keywords and desktop Chrome zero-plugin anomalies.
  - Outputs `DETECTED` (High confidence), `SUSPECTED` (Medium confidence), or `NOT_DETECTED` (High confidence).

---

## 10. Privacy-Protection Detection
- **[REFERENCE REQUIREMENT]**: Distinguish privacy protections from privacy risks.
- **[IMPLEMENTATION]**: Evaluates positive defense vectors:
  - Global Privacy Control (`navigator.globalPrivacyControl === true` or `Sec-GPC: 1`).
  - Do Not Track (`navigator.doNotTrack === '1'`).
  - Canvas Randomization (noise injection).
  - WebGL hardware masking.
  - WebRTC mDNS hostname protection.
  - Defensive measures are non-penalizing and highlighted as protective features.

---

## 11. Confidence Model
- **[REFERENCE REQUIREMENT]**: Multi-tier confidence assignment for all detections.
- **[IMPLEMENTATION]**:
  - `HIGH`: Direct API signal with deterministic verification (e.g. `navigator.webdriver === true`, explicit unmasked GPU string).
  - `MEDIUM`: Secondary heuristic or timing-sensitive observation (e.g. network latency estimation, automation heuristic without explicit webdriver flag).
  - `LOW`: Inconclusive or environment-restricted observation.
  - `UNKNOWN`: Observation could not be performed.

---

## 12. Status Model
- **[REFERENCE REQUIREMENT]**: Explicit status representations per domain:
  - **Collector**: `SUCCESS`, `BLOCKED`, `UNAVAILABLE`, `TIMEOUT`, `ERROR`, `SKIPPED`.
  - **WebRTC**: `NO_LEAK`, `LEAK_DETECTED`, `PROTECTED`, `UNAVAILABLE`, `BLOCKED`, `TIMEOUT`, `ERROR`.
  - **Canvas**: `DISTINGUISHABLE_SIGNATURE`, `STABLE_SIGNATURE`, `RANDOMIZED`, `BLOCKED`, `UNAVAILABLE`, `ERROR`.
  - **WebGL**: `EXPOSED`, `MASKED`, `BLOCKED`, `UNAVAILABLE`, `ERROR`.
  - **Audio**: `SIGNATURE_AVAILABLE`, `BLOCKED`, `UNAVAILABLE`, `ERROR`.
  - **Automation**: `DETECTED`, `SUSPECTED`, `NOT_DETECTED`, `UNKNOWN`.

---

## 13. Normalized Browser Profile
- **[REFERENCE REQUIREMENT]**: 12 structured profile groups for future UI inspection.
- **[IMPLEMENTATION]**:
  - `IDENTITY`: Browser family, OS, user-agent length, platform.
  - `DISPLAY`: Resolution, workspace, color depth, pixel ratio, orientation.
  - `HARDWARE`: CPU cores, RAM tier, touch capabilities.
  - `LOCALE`: Language preferences, resolved locale, consistency.
  - `TIMEZONE`: IANA identifier, UTC offset, DST status.
  - `STORAGE`: Cookie, localStorage, sessionStorage, IndexedDB availability.
  - `GRAPHICS`: WebGL GPU status, unmasked renderer, canvas hash.
  - `AUDIO`: Synthetic DSP acoustic hash.
  - `WEBRTC`: Candidate leak status, private IP count, mDNS status.
  - `AUTOMATION`: WebDriver and headless status.
  - `NETWORK`: Bandwidth tier and round-trip time.
  - `PRIVACY_PROTECTIONS`: GPC, DNT, canvas/WebGL masking.

---

## 14. API Integration & Payload Schema
- **[REFERENCE REQUIREMENT]**: Minimized JSON payload sent to `POST /api/analyze/browser`.
- **[IMPLEMENTATION]**:
  ```ts
  export interface BrowserFingerprintInput {
    canvasHash?: string;
    webgl?: { vendor?: string; renderer?: string; };
    audioHash?: string;
    hardware?: { cpuCores?: number; deviceMemory?: number; touchPoints?: number; };
    screen?: { width?: number; height?: number; colorDepth?: number; pixelRatio?: number; };
    timezone?: string;
    languages?: string[];
    webRtc?: { localIps?: string[]; publicIps?: string[]; };
    securityFlags?: { isAutomation?: boolean; isAdBlockActive?: boolean; isIncognito?: boolean; };
  }
  ```

---

## 15. Trust Boundary & Security
- **[REFERENCE REQUIREMENT]**: Browser data must never override server-authoritative IP intelligence.
- **[IMPLEMENTATION]**:
  - `POST /api/analyze/browser` receives `req.body.fingerprint`.
  - Client IP, proxy detection, VPN detection, Tor node detection, datacenter/hosting classification, and IP version are computed **strictly on the server** via `extractClientIp(req)` and `geoIPService.getDetails()`.
  - Server validates all fingerprint properties against length limits and type schemas via `validateBrowserFingerprintPayload()`. Oversized or malformed payloads return `400 Bad Request`.

---

## 16. Data Minimization
- **[REFERENCE REQUIREMENT]**: Zero transmission of raw pixel buffers, audio files, cookies, or user content.
- **[IMPLEMENTATION]**:
  - Canvas: Only 8-char FNV-1a hash sent. Raw data URL is purged immediately.
  - Audio: Only 8-char FNV-1a hash sent. AudioBuffer is purged immediately.
  - Storage: Only boolean availability transmitted. Zero cookie or storage values are ever read or transmitted.
  - WebRTC: Only filtered IP candidates transmitted.

---

## 17. Permissions Policy
- **[REFERENCE REQUIREMENT]**: Zero permission prompts.
- **[IMPLEMENTATION]**: No calls to `navigator.mediaDevices.getUserMedia()`, `navigator.geolocation.getCurrentPosition()`, `Notification.requestPermission()`, or filesystem APIs.

---

## 18. Performance Budget
- **[REFERENCE REQUIREMENT]**: Sub-second execution for standard collectors, bounded timeouts for network/audio.
- **[IMPLEMENTATION]**:
  - WebRTC timeout: 2500ms max.
  - Audio timeout: 1500ms max.
  - Synchronous collectors: < 5ms.
  - Total orchestrator scan duration: Typically 10–50ms when WebRTC completes or is unavailable.

---

## 19. Browser Compatibility Matrix
- **[REFERENCE REQUIREMENT]**: Document capability behaviors across browser engines.
- **[IMPLEMENTATION]**:
  - **Chrome / Chromium**: WebRTC (mDNS protected), WebGL2 (Unmasked GPU exposed), Canvas (Deterministic), Audio (Deterministic), Client Hints (Supported).
  - **Firefox**: WebRTC (mDNS protected), WebGL2 (Unmasked GPU exposed), Canvas (Deterministic unless `privacy.resistFingerprinting` is enabled), Audio (Deterministic).
  - **Safari / WebKit**: WebRTC (mDNS protected), WebGL (Partially masked), Canvas (Deterministic), Audio (Requires user interaction for live audio, OfflineAudioContext functional).
  - **Brave**: WebRTC (Protected), WebGL (Masked), Canvas (Randomized FARBLING noise detected as `RANDOMIZED`), Audio (Randomized).

---

## 20. Error Handling & Isolation
- **[REFERENCE REQUIREMENT]**: Single collector failure must never abort remaining collectors.
- **[IMPLEMENTATION]**:
  - All collectors wrapped in `try/catch` with structured fallback objects.
  - Async collectors executed via `Promise.allSettled`.
  - Partial results assembled into `BrowserProfile`.

---

## 21. Resource Disposal & Cleanup
- **[REFERENCE REQUIREMENT]**: Zero memory leaks or dangling background connections.
- **[IMPLEMENTATION]**:
  - WebRTC: `pc.close()`, `pc.onicecandidate = null`, references cleared.
  - WebGL: `WEBGL_lose_context` invoked to release GPU handles.
  - Timers: `clearTimeout()` invoked on all timeout races.

---

## 22. Test Suite
- **[IMPLEMENTATION]**: `server/tests/browserIntelligence.test.ts` (54 automated tests verifying capabilities, hashing, detectors, collectors, orchestrator, validation, trust boundaries, and Privacy Engine integration).

---

## 23. Known Limitations
- **[BROWSER LIMITATION]**: In non-browser Node.js runtime environments (such as server test runners), DOM APIs (`window`, `document`, `HTMLCanvasElement`, `RTCPeerConnection`, `OfflineAudioContext`) are not natively present; collectors detect this and return `UNAVAILABLE` without crashing.
