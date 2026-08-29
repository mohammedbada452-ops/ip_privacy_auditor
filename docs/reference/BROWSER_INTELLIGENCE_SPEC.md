# Browser Intelligence Specification: Client Signals & Collectors

## 1. Overview
Browser fingerprinting relies on extracting subtle hardware, rendering, audio processing, and API differences exposed by web browsers. This document specifies every client-side browser signal harvested by the **Privacy & Browser Intelligence Auditor**.

---

## 2. Signal Inventory & Collector Specification

### A. Canvas Fingerprinting (`collectors/canvasCollector.ts`)
- **API**: `HTMLCanvasElement.getContext('2d')`
- **Method**:
  1. Creates an offscreen `<canvas width="280" height="60">`.
  2. Renders a complex text string with custom emoji, font families (`Arial`, `Times New Roman`, `Courier`), and overlapping transparent geometric shapes with composite blending (`multiply`).
  3. Extracts base64 image data URL using `canvas.toDataURL()`.
  4. Generates a 32-bit FNV-1a or SHA-256 hash string from the image data.
- **Privacy Impact**: Canvas rendering varies across GPU drivers, font anti-aliasing engines, and operating systems, creating a high-entropy tracking vector.
- **Score Weight**: `-10 pts` if canvas rendering produces an identifiable signature without masking.

---

### B. WebGL Hardware Inspector (`collectors/webglCollector.ts`)
- **API**: `HTMLCanvasElement.getContext('webgl')` or `getContext('experimental-webgl')`
- **Extensions Checked**: `WEBGL_debug_renderer_info`
- **Parameters Harvested**:
  - `UNMASKED_VENDOR_WEBGL` (e.g., "Google Inc. (Apple)", "NVIDIA Corporation")
  - `UNMASKED_RENDERER_WEBGL` (e.g., "ANGLE (Apple, Apple M1 Pro, OpenGL 4.1)", "NVIDIA GeForce RTX 3080")
  - Max Texture Size, Max Cube Map Texture Size, Max Anisotropy, Shader Precision.
- **Privacy Impact**: Discloses exact physical GPU hardware model and graphics driver version.
- **Score Weight**: `-10 pts` if unmasked vendor & renderer are disclosed.

---

### C. AudioContext Fingerprinting (`collectors/audioCollector.ts`)
- **API**: `window.AudioContext` or `window.webkitAudioContext`
- **Method**:
  1. Creates an `OfflineAudioContext(1, 44100, 44100)`.
  2. Spawns an `OscillatorNode` with `triangle` wave at 10,000 Hz.
  3. Connects oscillator to a `DynamicsCompressorNode` with custom reduction parameters.
  4. Renders audio buffer to array, sums channel buffer values, and computes hash.
- **Privacy Impact**: Audio DSP processing differs subtly between sound cards and audio drivers.
- **Score Weight**: `-8 pts` if audio processing signature is unmasked.

---

### D. WebRTC IP Leak Collector (`collectors/webRtcCollector.ts`)
- **API**: `window.RTCPeerConnection`
- **Method**:
  1. Instantiates `RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })`.
  2. Creates a dummy data channel (`createDataChannel('')`) and initiates offer (`createOffer()`).
  3. Listens to `onicecandidate` events.
  4. Parses candidate strings with regex `/(?:[0-9]{1,3}\.){3}[0-9]{1,3}/` to extract local LAN IPs (e.g., `192.168.x.x`, `10.x.x.x`) and public IPs.
- **Privacy Impact**: WebRTC can bypass VPNs and reveal true local network IPs.
- **Score Weight**: `-25 pts` if local IP leak is detected.

---

### E. Screen & Hardware Geometry (`collectors/hardwareCollector.ts`)
- **API**: `window.screen`, `window.devicePixelRatio`, `navigator.hardwareConcurrency`, `navigator.deviceMemory`
- **Signals**:
  - Screen Width, Screen Height, Available Workspace (`availWidth`, `availHeight`).
  - Color Depth (`screen.colorDepth`), Pixel Ratio (`window.devicePixelRatio`).
  - Logical CPU Cores (`navigator.hardwareConcurrency`).
  - RAM Size in GB (`navigator.deviceMemory`).
  - Touch Support (`navigator.maxTouchPoints`).
- **Privacy Impact**: Discloses hardware tier and multi-monitor setups.

---

### F. Automation & Bot Detection
- **APIs Inspected**:
  - `navigator.webdriver` (boolean)
  - Presence of PhantomJS / Selenium window variables (`window._phantom`, `window.callPhantom`, `window.__selenium_evaluate`).
  - Headless User-Agent strings.
- **Score Weight**: `-20 pts` if automation flags are positive.
