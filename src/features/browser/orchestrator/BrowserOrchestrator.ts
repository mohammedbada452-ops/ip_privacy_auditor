/**
 * Browser Intelligence Collector Orchestrator
 * Coordinates parallel execution of all collectors, enforces timeouts, isolates errors,
 * and compiles the consolidated BrowserProfile and sanitized API payload.
 */

import { collectCapabilities } from '../collectors/capabilityCollector';
import { collectIdentity } from '../collectors/identityCollector';
import { collectDisplay } from '../collectors/displayCollector';
import { collectHardware } from '../collectors/hardwareCollector';
import { collectLocale } from '../collectors/localeCollector';
import { collectTimezone } from '../collectors/timezoneCollector';
import { collectStorage } from '../collectors/storageCollector';
import { collectWebRtc } from '../collectors/webRtcCollector';
import { collectWebGL } from '../collectors/webglCollector';
import { collectCanvas } from '../collectors/canvasCollector';
import { collectAudio } from '../collectors/audioCollector';
import { collectAutomation } from '../collectors/automationCollector';
import { collectNetwork } from '../collectors/networkCollector';
import { collectClientHints } from '../collectors/clientHintsCollector';
import { collectPrivacyProtections } from '../collectors/privacyProtectionCollector';
import { buildBrowserProfile, type CollectorOutputs } from '../normalize/profileBuilder';
import { sanitizeFingerprintPayload } from '../normalize/normalizer';
import type { BrowserProfile, BaseCollectorResult } from '../types';

export class BrowserOrchestrator {
  /**
   * Executes full browser intelligence scan.
   * Uses Promise.allSettled for async collectors to guarantee error isolation and non-blocking operation.
   */
  public async collectAll(): Promise<BrowserProfile> {
    const startTime = performance.now();

    // 1. Run immediate synchronous collectors
    const capabilities = collectCapabilities();
    const identity = collectIdentity();
    const display = collectDisplay();
    const hardware = collectHardware();
    const locale = collectLocale();
    const timezone = collectTimezone();
    const storage = collectStorage();
    const webGl = collectWebGL();
    const canvas = collectCanvas();
    const automation = collectAutomation();
    const network = collectNetwork();
    const clientHints = collectClientHints();

    // 2. Launch asynchronous collectors in parallel with bounded timeouts
    const [webRtcResult, audioResult] = await Promise.allSettled([
      collectWebRtc(2500),
      collectAudio(1500),
    ]);

    const webRtc =
      webRtcResult.status === 'fulfilled'
        ? webRtcResult.value
        : ({
            id: 'webrtc_privacy',
            category: 'WEBRTC',
            supported: false,
            available: false,
            status: 'ERROR',
            confidence: 'LOW',
            durationMs: 0,
            data: {
              status: 'ERROR',
              localIps: [],
              publicIps: [],
              mdnsCandidates: [],
              leakDetected: false,
              leakDetails: 'WebRTC collection threw an unexpected error',
            },
            error: String(webRtcResult.reason),
          } as BaseCollectorResult<any>);

    const audio =
      audioResult.status === 'fulfilled'
        ? audioResult.value
        : ({
            id: 'audio_fingerprint',
            category: 'AUDIO',
            supported: false,
            available: false,
            status: 'ERROR',
            confidence: 'LOW',
            durationMs: 0,
            data: {
              status: 'ERROR',
            },
            error: String(audioResult.reason),
          } as BaseCollectorResult<any>);

    // 3. Evaluate privacy protection signals based on gathered graphics & WebRTC state
    const canvasRandomized = canvas.status === 'SUCCESS' && canvas.data ? canvas.data.isRandomized : undefined;
    const webGlMasked = webGl.status === 'SUCCESS' && webGl.data ? !webGl.data.isUnmasked : undefined;
    const webRtcMdnsActive = webRtc.status === 'SUCCESS' && webRtc.data
      ? webRtc.data.mdnsCandidates.length > 0
      : undefined;

    const privacyProtections = collectPrivacyProtections(
      canvasRandomized,
      webGlMasked,
      webRtcMdnsActive
    );

    const totalDurationMs = performance.now() - startTime;

    const outputs: CollectorOutputs = {
      capabilities,
      identity,
      display,
      hardware,
      locale,
      timezone,
      storage,
      webRtc,
      webGl,
      canvas,
      audio,
      automation,
      network,
      clientHints,
      privacyProtections,
    };

    const profile = buildBrowserProfile(outputs, totalDurationMs);
    profile.fingerprintPayload = sanitizeFingerprintPayload(profile.fingerprintPayload);

    return profile;
  }
}

export const browserOrchestrator = new BrowserOrchestrator();
