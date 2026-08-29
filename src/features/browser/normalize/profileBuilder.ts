/**
 * Browser Profile Builder
 * Aggregates raw collector outputs into the 12 standardized domain groups.
 */

import type {
  CapabilityMatrix,
  BaseCollectorResult,
  IdentityData,
  DisplayData,
  HardwareData,
  LocaleData,
  TimezoneData,
  StorageData,
  WebRtcData,
  WebGlData,
  CanvasData,
  AudioData,
  AutomationData,
  NetworkData,
  ClientHintsData,
  PrivacyProtectionsData,
  ProfileGroupName,
  ProfileGroup,
  BrowserProfile,
  CollectorStatus,
} from '../types';
import type { BrowserFingerprintInput } from '@packages/api-contract';

export interface CollectorOutputs {
  capabilities: BaseCollectorResult<CapabilityMatrix>;
  identity: BaseCollectorResult<IdentityData>;
  display: BaseCollectorResult<DisplayData>;
  hardware: BaseCollectorResult<HardwareData>;
  locale: BaseCollectorResult<LocaleData>;
  timezone: BaseCollectorResult<TimezoneData>;
  storage: BaseCollectorResult<StorageData>;
  webRtc: BaseCollectorResult<WebRtcData>;
  webGl: BaseCollectorResult<WebGlData>;
  canvas: BaseCollectorResult<CanvasData>;
  audio: BaseCollectorResult<AudioData>;
  automation: BaseCollectorResult<AutomationData>;
  network: BaseCollectorResult<NetworkData>;
  clientHints: BaseCollectorResult<ClientHintsData>;
  privacyProtections: BaseCollectorResult<PrivacyProtectionsData>;
}

export function buildBrowserProfile(outputs: CollectorOutputs, totalDurationMs: number): BrowserProfile {
  const groups: Record<ProfileGroupName, ProfileGroup> = {
    IDENTITY: {
      name: 'IDENTITY',
      title: 'Browser Identity & Platform',
      status: outputs.identity.status,
      confidence: outputs.identity.confidence,
      data: outputs.identity.data,
      derivedSignals: {
        browserFamily: outputs.identity.data?.browserFamily || null,
        browserVersion: outputs.identity.data?.browserVersion || null,
        osFamily: outputs.identity.data?.osFamily || null,
        platform: outputs.identity.data?.platform || null,
        userAgentLength: outputs.identity.data?.userAgent ? outputs.identity.data.userAgent.length : null,
      },
      description: 'Platform and browser version signatures exposed by standard navigator properties.',
    },
    DISPLAY: {
      name: 'DISPLAY',
      title: 'Display & Viewport Geometry',
      status: outputs.display.status,
      confidence: outputs.display.confidence,
      data: outputs.display.data,
      derivedSignals: {
        resolution: outputs.display.data ? `${outputs.display.data.width}x${outputs.display.data.height}` : null,
        colorDepth: outputs.display.data?.colorDepth ?? null,
        pixelRatio: outputs.display.data?.devicePixelRatio ?? null,
        orientation: outputs.display.data?.orientation || null,
      },
      description: 'Physical screen dimensions, workspace limits, and color bit-depths.',
    },
    HARDWARE: {
      name: 'HARDWARE',
      title: 'Hardware Concurrency & Resources',
      status: outputs.hardware.status,
      confidence: outputs.hardware.confidence,
      data: outputs.hardware.data,
      derivedSignals: {
        cpuCores: outputs.hardware.data?.cpuCores ?? null,
        deviceMemoryGB: outputs.hardware.data?.deviceMemory ?? null,
        maxTouchPoints: outputs.hardware.data?.maxTouchPoints ?? null,
        touchSupported: outputs.hardware.status === 'SUCCESS' ? outputs.hardware.data?.touchSupported ?? null : null,
      },
      description: 'Logical processor count, RAM limits, and multi-touch capabilities.',
    },
    LOCALE: {
      name: 'LOCALE',
      title: 'Language & Locale Configuration',
      status: outputs.locale.status,
      confidence: outputs.locale.confidence,
      data: outputs.locale.data,
      derivedSignals: {
        language: outputs.locale.data?.language || null,
        resolvedLocale: outputs.locale.data?.resolvedLocale || null,
        languageCount: outputs.locale.data?.languages ? outputs.locale.data.languages.length : 0,
        localeConsistent: outputs.locale.data?.localeConsistent ?? null,
      },
      description: 'System language, preferred languages, and Intl formatting locale settings.',
    },
    TIMEZONE: {
      name: 'TIMEZONE',
      title: 'Timezone & Temporal Alignment',
      status: outputs.timezone.status,
      confidence: outputs.timezone.confidence,
      data: outputs.timezone.data,
      derivedSignals: {
        timezone: outputs.timezone.data?.timezone || null,
        utcOffsetMinutes: outputs.timezone.data?.utcOffsetMinutes ?? null,
        formattedOffset: outputs.timezone.data?.formattedOffset || null,
        dstActive: outputs.timezone.data?.dstActive ?? null,
      },
      description: 'IANA timezone identifier and daylight saving time offsets.',
    },
    STORAGE: {
      name: 'STORAGE',
      title: 'Client Storage Capabilities',
      status: outputs.storage.status,
      confidence: outputs.storage.confidence,
      data: outputs.storage.data,
      derivedSignals: {
        cookiesEnabled: outputs.storage.status === 'SUCCESS' ? outputs.storage.data?.cookiesEnabled ?? null : null,
        localStorage: outputs.storage.status === 'SUCCESS' ? outputs.storage.data?.localStorageAvailable ?? null : null,
        sessionStorage: outputs.storage.status === 'SUCCESS' ? outputs.storage.data?.sessionStorageAvailable ?? null : null,
        indexedDb: outputs.storage.status === 'SUCCESS' ? outputs.storage.data?.indexedDbAvailable ?? null : null,
      },
      description: 'Browser support and accessibility for client-side storage mechanisms.',
    },
    GRAPHICS: {
      name: 'GRAPHICS',
      title: 'WebGL & Canvas Graphics Pipeline',
      status: outputs.canvas.status === 'ERROR' || outputs.webGl.status === 'ERROR'
        ? 'ERROR'
        : outputs.canvas.status === 'BLOCKED' || outputs.webGl.status === 'BLOCKED'
          ? 'BLOCKED'
          : (outputs.canvas.status === 'UNAVAILABLE' && outputs.webGl.status === 'UNAVAILABLE' ? 'UNAVAILABLE' : 'SUCCESS'),
      confidence: outputs.canvas.confidence === 'LOW' || outputs.webGl.confidence === 'LOW' ? 'LOW' : 'MEDIUM',
      data: {
        webgl: outputs.webGl.data,
        canvas: outputs.canvas.data,
      },
      derivedSignals: {
        webglStatus: outputs.webGl.data?.status || 'UNAVAILABLE',
        gpuUnmasked: outputs.webGl.status === 'SUCCESS' ? outputs.webGl.data?.isUnmasked ?? null : null,
        gpuRenderer: outputs.webGl.data?.unmaskedRenderer || outputs.webGl.data?.renderer || null,
        canvasStatus: outputs.canvas.data?.status || 'UNAVAILABLE',
        canvasHash: outputs.canvas.data?.hash || null,
        canvasRandomized: outputs.canvas.status === 'SUCCESS' ? outputs.canvas.data?.isRandomized ?? null : null,
      },
      description: 'Graphics rendering pipeline, unmasked GPU hardware strings, and 2D canvas signatures.',
    },
    AUDIO: {
      name: 'AUDIO',
      title: 'Audio DSP Pipeline Fingerprint',
      status: outputs.audio.status,
      confidence: outputs.audio.confidence,
      data: outputs.audio.data,
      derivedSignals: {
        audioStatus: outputs.audio.data?.status || 'UNAVAILABLE',
        audioHash: outputs.audio.data?.hash || null,
      },
      description: 'Synthetic acoustic hardware processing variations measured via OfflineAudioContext.',
    },
    WEBRTC: {
      name: 'WEBRTC',
      title: 'WebRTC Address Privacy',
      status: outputs.webRtc.status,
      confidence: outputs.webRtc.confidence,
      data: outputs.webRtc.data,
      derivedSignals: {
        webrtcStatus: outputs.webRtc.data?.status || 'UNAVAILABLE',
        leakDetected: outputs.webRtc.status === 'SUCCESS' ? outputs.webRtc.data?.leakDetected ?? null : null,
        localIpsCount: outputs.webRtc.data?.localIps ? outputs.webRtc.data.localIps.length : 0,
        mdnsActive: outputs.webRtc.data?.mdnsCandidates ? outputs.webRtc.data.mdnsCandidates.length > 0 : false,
      },
      description: 'Inspection of ICE candidate gathering to detect private LAN IP leaks.',
    },
    AUTOMATION: {
      name: 'AUTOMATION',
      title: 'Automation & Headless Execution',
      status: outputs.automation.status,
      confidence: outputs.automation.confidence,
      data: outputs.automation.data,
      derivedSignals: {
        automationStatus: outputs.automation.data?.status || 'UNKNOWN',
        isWebDriver: outputs.automation.status === 'SUCCESS' ? outputs.automation.data?.isWebDriver ?? null : null,
        isAutomation: outputs.automation.status === 'SUCCESS' ? outputs.automation.data?.isAutomation ?? null : null,
      },
      description: 'Detection of automated WebDriver control, headless environments, or synthetic drivers.',
    },
    NETWORK: {
      name: 'NETWORK',
      title: 'Client Network Diagnostics',
      status: outputs.network.status,
      confidence: outputs.network.confidence,
      data: outputs.network.data,
      derivedSignals: {
        effectiveType: outputs.network.data?.effectiveType || null,
        downlink: outputs.network.data?.downlink || null,
        rtt: outputs.network.data?.rtt || null,
        saveData: outputs.network.status === 'SUCCESS' ? outputs.network.data?.saveData ?? null : null,
      },
      description: 'Bandwidth tier and latency signals exposed via the Network Information API.',
    },
    PRIVACY_PROTECTIONS: {
      name: 'PRIVACY_PROTECTIONS',
      title: 'Active Anti-Fingerprinting Defenses',
      status: outputs.privacyProtections.status,
      confidence: outputs.privacyProtections.confidence,
      data: outputs.privacyProtections.data,
      derivedSignals: {
        globalPrivacyControl: outputs.privacyProtections.status === 'SUCCESS' ? outputs.privacyProtections.data?.globalPrivacyControl ?? null : null,
        doNotTrack: outputs.privacyProtections.status === 'SUCCESS' ? outputs.privacyProtections.data?.doNotTrack ?? null : null,
        canvasMasked: outputs.privacyProtections.status === 'SUCCESS' ? outputs.privacyProtections.data?.canvasMasked ?? null : null,
        webGlMasked: outputs.privacyProtections.status === 'SUCCESS' ? outputs.privacyProtections.data?.webGlMasked ?? null : null,
        webRtcMdnsActive: outputs.privacyProtections.status === 'SUCCESS' ? outputs.privacyProtections.data?.webRtcMdnsActive ?? null : null,
      },
      description: 'Active client-side privacy signals including Global Privacy Control (GPC) and hardware masking.',
    },
  };

  // Build compact fingerprint payload for Stage 7 Privacy Engine
  const fingerprintPayload: BrowserFingerprintInput = {
    canvasHash: outputs.canvas.status === 'SUCCESS' ? outputs.canvas.data?.hash : undefined,
    canvasStatus: outputs.canvas.data?.status || (outputs.canvas.status === 'BLOCKED' ? 'BLOCKED' : outputs.canvas.status === 'ERROR' ? 'ERROR' : outputs.canvas.status === 'UNAVAILABLE' ? 'UNAVAILABLE' : undefined),
    webgl: outputs.webGl.status === 'SUCCESS' && outputs.webGl.data
      ? {
          vendor: outputs.webGl.data.unmaskedVendor || outputs.webGl.data.vendor,
          renderer: outputs.webGl.data.unmaskedRenderer || outputs.webGl.data.renderer,
          status: outputs.webGl.data.status,
          isUnmasked: outputs.webGl.data.isUnmasked,
        }
      : undefined,
    audioHash: outputs.audio.status === 'SUCCESS' ? outputs.audio.data?.hash : undefined,
    audioStatus: outputs.audio.data?.status || (outputs.audio.status === 'BLOCKED' ? 'BLOCKED' : outputs.audio.status === 'TIMEOUT' ? 'TIMEOUT' : outputs.audio.status === 'ERROR' ? 'ERROR' : outputs.audio.status === 'UNAVAILABLE' ? 'UNAVAILABLE' : undefined),
    hardware: outputs.hardware.status === 'SUCCESS' ? {
      cpuCores: outputs.hardware.data?.cpuCores,
      deviceMemory: outputs.hardware.data?.deviceMemory,
      touchPoints: outputs.hardware.data?.maxTouchPoints,
    } : undefined,
    screen: outputs.display.status === 'SUCCESS' && outputs.display.data
      ? {
          width: outputs.display.data.width,
          height: outputs.display.data.height,
          colorDepth: outputs.display.data.colorDepth,
          pixelRatio: outputs.display.data.devicePixelRatio,
        }
      : undefined,
    timezone: outputs.timezone.status === 'SUCCESS' ? outputs.timezone.data?.timezone : undefined,
    languages: outputs.locale.status === 'SUCCESS' ? outputs.locale.data?.languages : undefined,
    webRtc: outputs.webRtc.status === 'SUCCESS' && outputs.webRtc.data
      ? {
          localIps: outputs.webRtc.data.localIps,
          publicIps: outputs.webRtc.data.publicIps,
          mdnsCandidates: outputs.webRtc.data.mdnsCandidates,
          status: outputs.webRtc.data.status,
        }
      : undefined,
    securityFlags: (outputs.automation.status === 'SUCCESS' || outputs.privacyProtections.status === 'SUCCESS') ? {
      ...(outputs.automation.status === 'SUCCESS' ? { isAutomation: outputs.automation.data?.isAutomation === true } : {}),
      ...(outputs.privacyProtections.status === 'SUCCESS' ? {
        ...(typeof outputs.privacyProtections.data?.adBlockDetected === 'boolean' ? { isAdBlockActive: outputs.privacyProtections.data.adBlockDetected } : {}),
        ...(typeof outputs.privacyProtections.data?.incognitoSuspected === 'boolean' ? { isIncognito: outputs.privacyProtections.data.incognitoSuspected } : {}),
      } : {}),
    } : undefined,
  };

  const collectorStatuses: Record<string, CollectorStatus> = {
    capabilities: outputs.capabilities.status,
    identity: outputs.identity.status,
    display: outputs.display.status,
    hardware: outputs.hardware.status,
    locale: outputs.locale.status,
    timezone: outputs.timezone.status,
    storage: outputs.storage.status,
    webRtc: outputs.webRtc.status,
    webGl: outputs.webGl.status,
    canvas: outputs.canvas.status,
    audio: outputs.audio.status,
    automation: outputs.automation.status,
    network: outputs.network.status,
    clientHints: outputs.clientHints.status,
    privacyProtections: outputs.privacyProtections.status,
  };

  // Calculate summary metrics
  // This metric is limited to confirmed fingerprinting exposures. Observing CPU cores,
  // Canvas output, or an AudioContext alone is not a security leak.
  let exposedHardwareSignals = 0;
  if (outputs.webGl.status === 'SUCCESS' && outputs.webGl.data?.isUnmasked === true) exposedHardwareSignals++;

  let privacyProtectionsActive = 0;
  if (outputs.privacyProtections.data?.globalPrivacyControl) privacyProtectionsActive++;
  if (outputs.privacyProtections.data?.doNotTrack) privacyProtectionsActive++;
  if (outputs.privacyProtections.data?.canvasMasked) privacyProtectionsActive++;
  if (outputs.webRtc.data?.mdnsCandidates && outputs.webRtc.data.mdnsCandidates.length > 0) privacyProtectionsActive++;

  let leaksDetected = 0;
  if (outputs.webRtc.data?.leakDetected) leaksDetected++;

  return {
    timestamp: new Date().toISOString(),
    durationMs: totalDurationMs,
    capabilities: outputs.capabilities.data || {
      webRtc: 'UNKNOWN',
      webGl: 'UNKNOWN',
      webGl2: 'UNKNOWN',
      canvas2d: 'UNKNOWN',
      audioContext: 'UNKNOWN',
      offlineAudioContext: 'UNKNOWN',
      localStorage: 'UNKNOWN',
      sessionStorage: 'UNKNOWN',
      indexedDb: 'UNKNOWN',
      networkInfo: 'UNKNOWN',
      clientHints: 'UNKNOWN',
      permissionsApi: 'UNKNOWN',
    },
    groups,
    fingerprintPayload,
    collectorStatuses,
    summary: {
      totalSignalsEvaluated: 15,
      exposedHardwareSignals,
      privacyProtectionsActive,
      leaksDetected,
      automationSignalsDetected: outputs.automation.data?.isAutomation === true ? 1 : 0,
    },
  };
}
