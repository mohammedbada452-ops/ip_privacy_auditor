/**
 * Advanced Browser Intelligence Engine Types
 * Stage 8 Domain Models, Capability Matrix, and Normalization Types
 */

import type { BrowserFingerprintInput } from '@packages/api-contract';

export type CapabilityStatus = 'SUPPORTED' | 'UNSUPPORTED' | 'BLOCKED' | 'FAILED' | 'UNKNOWN';

export type CollectorStatus = 'SUCCESS' | 'BLOCKED' | 'UNAVAILABLE' | 'TIMEOUT' | 'ERROR' | 'SKIPPED';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

export type WebRtcStatus =
  | 'NO_LEAK'
  | 'PUBLIC_CANDIDATE_REVIEW'
  | 'LEAK_DETECTED'
  | 'PROTECTED'
  | 'UNAVAILABLE'
  | 'BLOCKED'
  | 'TIMEOUT'
  | 'ERROR';

export type CanvasStatus =
  | 'DISTINGUISHABLE_SIGNATURE'
  | 'STABLE_SIGNATURE'
  | 'RANDOMIZED'
  | 'BLOCKED'
  | 'UNAVAILABLE'
  | 'ERROR';

export type WebGlStatus = 'EXPOSED' | 'MASKED' | 'BLOCKED' | 'UNAVAILABLE' | 'ERROR';

export type AudioStatus = 'SIGNATURE_AVAILABLE' | 'BLOCKED' | 'UNAVAILABLE' | 'TIMEOUT' | 'ERROR';

export type AutomationStatus = 'DETECTED' | 'SUSPECTED' | 'NOT_DETECTED' | 'UNKNOWN';

export interface BaseCollectorResult<T> {
  id: string;
  category: string;
  supported: boolean;
  available: boolean;
  status: CollectorStatus;
  confidence: ConfidenceLevel;
  durationMs: number;
  data: T | null;
  error?: string;
}

// Capability Matrix
export interface CapabilityMatrix {
  webRtc: CapabilityStatus;
  webGl: CapabilityStatus;
  webGl2: CapabilityStatus;
  canvas2d: CapabilityStatus;
  audioContext: CapabilityStatus;
  offlineAudioContext: CapabilityStatus;
  localStorage: CapabilityStatus;
  sessionStorage: CapabilityStatus;
  indexedDb: CapabilityStatus;
  networkInfo: CapabilityStatus;
  clientHints: CapabilityStatus;
  permissionsApi: CapabilityStatus;
}

// Collector specific data models
export interface IdentityData {
  userAgent: string;
  browserFamily: string;
  browserVersion: string;
  osFamily: string;
  platform: string;
  language: string;
  languages: string[];
  vendor: string;
  product: string;
  hardwareConcurrency?: number;
  maxTouchPoints?: number;
}

export interface DisplayData {
  width: number;
  height: number;
  availWidth: number;
  availHeight: number;
  colorDepth: number;
  pixelDepth: number;
  devicePixelRatio: number;
  orientation?: string;
  viewportWidth: number;
  viewportHeight: number;
}

export interface HardwareData {
  cpuCores?: number;
  deviceMemory?: number;
  maxTouchPoints: number;
  touchSupported: boolean;
  hardwareConcurrency?: number;
}

export interface LocaleData {
  language: string;
  languages: string[];
  resolvedLocale: string;
  localeConsistent: boolean;
}

export interface TimezoneData {
  timezone: string;
  utcOffsetMinutes: number;
  formattedOffset: string;
  dstActive: boolean;
}

export interface StorageData {
  cookiesEnabled: boolean;
  localStorageAvailable: boolean;
  sessionStorageAvailable: boolean;
  indexedDbAvailable: boolean;
}

export interface WebRtcData {
  status: WebRtcStatus;
  localIps: string[];
  publicIps: string[];
  mdnsCandidates: string[];
  leakDetected: boolean;
  leakDetails?: string;
}

export interface WebGlData {
  status: WebGlStatus;
  vendor?: string;
  renderer?: string;
  unmaskedVendor?: string;
  unmaskedRenderer?: string;
  isUnmasked: boolean;
  maxTextureSize?: number;
  maxCubeMapTextureSize?: number;
  shaderPrecision?: string;
  hardwareHash?: string;
}

export interface CanvasData {
  status: CanvasStatus;
  hash?: string;
  isRandomized: boolean;
  isStable: boolean;
  isBlank: boolean;
  testAttempts: number;
}

export interface AudioData {
  status: AudioStatus;
  hash?: string;
  sampleSum?: number;
  sampleLength?: number;
}

export interface AutomationData {
  status: AutomationStatus;
  isAutomation: boolean;
  isWebDriver: boolean;
  automationSignals: string[];
  confidence: ConfidenceLevel;
}

export interface NetworkData {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  connectionType?: string;
}

export interface ClientHintsData {
  brands?: Array<{ brand: string; version: string }>;
  mobile?: boolean;
  platform?: string;
  architecture?: string;
  model?: string;
}

export interface PrivacyProtectionsData {
  globalPrivacyControl: boolean;
  doNotTrack: boolean;
  canvasMasked?: boolean;
  webGlMasked?: boolean;
  webRtcMdnsActive?: boolean;
  incognitoSuspected?: boolean;
  adBlockDetected?: boolean;
}

// Normalized Profile Groups
export type ProfileGroupName =
  | 'IDENTITY'
  | 'DISPLAY'
  | 'HARDWARE'
  | 'LOCALE'
  | 'TIMEZONE'
  | 'STORAGE'
  | 'GRAPHICS'
  | 'AUDIO'
  | 'WEBRTC'
  | 'AUTOMATION'
  | 'NETWORK'
  | 'PRIVACY_PROTECTIONS';

export interface ProfileGroup<T = unknown> {
  name: ProfileGroupName;
  title: string;
  status: CollectorStatus;
  confidence: ConfidenceLevel;
  data: T | null;
  derivedSignals: Record<string, string | number | boolean | null>;
  limitations?: string[];
  description: string;
}

export interface BrowserProfile {
  timestamp: string;
  durationMs: number;
  capabilities: CapabilityMatrix;
  groups: Record<ProfileGroupName, ProfileGroup>;
  fingerprintPayload: BrowserFingerprintInput;
  collectorStatuses: Record<string, CollectorStatus>;
  summary: {
    totalSignalsEvaluated: number;
    exposedHardwareSignals: number;
    privacyProtectionsActive: number;
    leaksDetected: number;
    automationSignalsDetected: number;
  };
}
