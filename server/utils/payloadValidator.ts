/**
 * Server-Side Browser Payload Validator
 * Validates untrusted browser fingerprint inputs against bounds and type schemas.
 */

import type { BrowserFingerprintInput } from '@packages/api-contract';

export class PayloadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PayloadValidationError';
  }
}

export function validateBrowserFingerprintPayload(raw: unknown): BrowserFingerprintInput | null {
  if (raw === null || raw === undefined) {
    return null;
  }

  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new PayloadValidationError('Invalid payload format: expected JSON object');
  }

  const obj = raw as Record<string, any>;
  const validated: BrowserFingerprintInput = {};

  // 1. Canvas Hash
  if (obj.canvasHash !== undefined) {
    if (typeof obj.canvasHash !== 'string') {
      throw new PayloadValidationError('Invalid canvasHash: expected string');
    }
    if (obj.canvasHash.length > 128) {
      throw new PayloadValidationError('canvasHash exceeds maximum length (128 chars)');
    }
    validated.canvasHash = obj.canvasHash;
  }

  // 2. WebGL
  if (obj.webgl !== undefined) {
    if (typeof obj.webgl !== 'object' || Array.isArray(obj.webgl)) {
      throw new PayloadValidationError('Invalid webgl: expected object');
    }
    validated.webgl = {};
    if (obj.webgl.vendor !== undefined) {
      if (typeof obj.webgl.vendor !== 'string' || obj.webgl.vendor.length > 150) {
        throw new PayloadValidationError('Invalid webgl.vendor: expected string <= 150 chars');
      }
      validated.webgl.vendor = obj.webgl.vendor;
    }
    if (obj.webgl.renderer !== undefined) {
      if (typeof obj.webgl.renderer !== 'string' || obj.webgl.renderer.length > 250) {
        throw new PayloadValidationError('Invalid webgl.renderer: expected string <= 250 chars');
      }
      validated.webgl.renderer = obj.webgl.renderer;
    }
    if (obj.webgl.status !== undefined) {
      if (!['EXPOSED','MASKED','BLOCKED','UNAVAILABLE','ERROR'].includes(obj.webgl.status)) {
        throw new PayloadValidationError('Invalid webgl.status');
      }
      validated.webgl.status = obj.webgl.status;
    }
    if (obj.webgl.isUnmasked !== undefined) {
      if (typeof obj.webgl.isUnmasked !== 'boolean') throw new PayloadValidationError('Invalid webgl.isUnmasked');
      validated.webgl.isUnmasked = obj.webgl.isUnmasked;
    }
  }

  // 3. Canvas status is optional metadata only
  if (obj.canvasStatus !== undefined) {
    if (!['DISTINGUISHABLE_SIGNATURE','STABLE_SIGNATURE','RANDOMIZED','BLOCKED','UNAVAILABLE','ERROR'].includes(obj.canvasStatus)) {
      throw new PayloadValidationError('Invalid canvasStatus');
    }
    validated.canvasStatus = obj.canvasStatus;
  }

  // 4. Audio Hash
  if (obj.audioHash !== undefined) {
    if (typeof obj.audioHash !== 'string') {
      throw new PayloadValidationError('Invalid audioHash: expected string');
    }
    if (obj.audioHash.length > 128) {
      throw new PayloadValidationError('audioHash exceeds maximum length (128 chars)');
    }
    validated.audioHash = obj.audioHash;
  }

  if (obj.audioStatus !== undefined) {
    if (!['SIGNATURE_AVAILABLE','BLOCKED','UNAVAILABLE','TIMEOUT','ERROR'].includes(obj.audioStatus)) {
      throw new PayloadValidationError('Invalid audioStatus');
    }
    validated.audioStatus = obj.audioStatus;
  }

  // 5. Hardware
  if (obj.hardware !== undefined) {
    if (typeof obj.hardware !== 'object' || Array.isArray(obj.hardware)) {
      throw new PayloadValidationError('Invalid hardware: expected object');
    }
    validated.hardware = {};
    if (obj.hardware.cpuCores !== undefined) {
      if (typeof obj.hardware.cpuCores !== 'number' || isNaN(obj.hardware.cpuCores) || obj.hardware.cpuCores < 0 || obj.hardware.cpuCores > 1024) {
        throw new PayloadValidationError('Invalid hardware.cpuCores: expected number between 0 and 1024');
      }
      validated.hardware.cpuCores = obj.hardware.cpuCores;
    }
    if (obj.hardware.deviceMemory !== undefined) {
      if (typeof obj.hardware.deviceMemory !== 'number' || isNaN(obj.hardware.deviceMemory) || obj.hardware.deviceMemory < 0 || obj.hardware.deviceMemory > 2048) {
        throw new PayloadValidationError('Invalid hardware.deviceMemory: expected number between 0 and 2048');
      }
      validated.hardware.deviceMemory = obj.hardware.deviceMemory;
    }
    if (obj.hardware.touchPoints !== undefined) {
      if (typeof obj.hardware.touchPoints !== 'number' || isNaN(obj.hardware.touchPoints) || obj.hardware.touchPoints < 0 || obj.hardware.touchPoints > 64) {
        throw new PayloadValidationError('Invalid hardware.touchPoints: expected number between 0 and 64');
      }
      validated.hardware.touchPoints = obj.hardware.touchPoints;
    }
  }

  // 5. Screen
  if (obj.screen !== undefined) {
    if (typeof obj.screen !== 'object' || Array.isArray(obj.screen)) {
      throw new PayloadValidationError('Invalid screen: expected object');
    }
    validated.screen = {};
    if (obj.screen.width !== undefined) {
      if (typeof obj.screen.width !== 'number' || isNaN(obj.screen.width) || obj.screen.width < 0 || obj.screen.width > 20000) {
        throw new PayloadValidationError('Invalid screen.width: expected number between 0 and 20000');
      }
      validated.screen.width = obj.screen.width;
    }
    if (obj.screen.height !== undefined) {
      if (typeof obj.screen.height !== 'number' || isNaN(obj.screen.height) || obj.screen.height < 0 || obj.screen.height > 20000) {
        throw new PayloadValidationError('Invalid screen.height: expected number between 0 and 20000');
      }
      validated.screen.height = obj.screen.height;
    }
    if (obj.screen.colorDepth !== undefined) {
      if (typeof obj.screen.colorDepth !== 'number' || isNaN(obj.screen.colorDepth) || obj.screen.colorDepth < 0 || obj.screen.colorDepth > 128) {
        throw new PayloadValidationError('Invalid screen.colorDepth: expected number between 0 and 128');
      }
      validated.screen.colorDepth = obj.screen.colorDepth;
    }
    if (obj.screen.pixelRatio !== undefined) {
      if (typeof obj.screen.pixelRatio !== 'number' || isNaN(obj.screen.pixelRatio) || obj.screen.pixelRatio < 0 || obj.screen.pixelRatio > 20) {
        throw new PayloadValidationError('Invalid screen.pixelRatio: expected number between 0 and 20');
      }
      validated.screen.pixelRatio = obj.screen.pixelRatio;
    }
  }

  // 6. Timezone
  if (obj.timezone !== undefined) {
    if (typeof obj.timezone !== 'string' || obj.timezone.length > 100) {
      throw new PayloadValidationError('Invalid timezone: expected string <= 100 chars');
    }
    validated.timezone = obj.timezone;
  }

  // 7. Languages
  if (obj.languages !== undefined) {
    if (!Array.isArray(obj.languages)) {
      throw new PayloadValidationError('Invalid languages: expected array');
    }
    if (obj.languages.length > 20) {
      throw new PayloadValidationError('languages array exceeds maximum length (20 items)');
    }
    validated.languages = obj.languages.map((lang: unknown) => {
      if (typeof lang !== 'string' || lang.length > 30) {
        throw new PayloadValidationError('Invalid language code in languages array');
      }
      return lang;
    });
  }

  // 8. WebRTC
  if (obj.webRtc !== undefined) {
    if (typeof obj.webRtc !== 'object' || Array.isArray(obj.webRtc)) {
      throw new PayloadValidationError('Invalid webRtc: expected object');
    }
    validated.webRtc = {};
    if (obj.webRtc.localIps !== undefined) {
      if (!Array.isArray(obj.webRtc.localIps)) {
        throw new PayloadValidationError('Invalid webRtc.localIps: expected array');
      }
      if (obj.webRtc.localIps.length > 20) {
        throw new PayloadValidationError('webRtc.localIps exceeds maximum length (20 items)');
      }
      validated.webRtc.localIps = obj.webRtc.localIps.map((ip: unknown) => {
        if (typeof ip !== 'string' || ip.length > 64) {
          throw new PayloadValidationError('Invalid IP string in webRtc.localIps');
        }
        return ip;
      });
    }
    if (obj.webRtc.publicIps !== undefined) {
      if (!Array.isArray(obj.webRtc.publicIps)) {
        throw new PayloadValidationError('Invalid webRtc.publicIps: expected array');
      }
      if (obj.webRtc.publicIps.length > 20) {
        throw new PayloadValidationError('webRtc.publicIps exceeds maximum length (20 items)');
      }
      validated.webRtc.publicIps = obj.webRtc.publicIps.map((ip: unknown) => {
        if (typeof ip !== 'string' || ip.length > 64) {
          throw new PayloadValidationError('Invalid IP string in webRtc.publicIps');
        }
        return ip;
      });
    }
    if (obj.webRtc.mdnsCandidates !== undefined) {
      if (!Array.isArray(obj.webRtc.mdnsCandidates) || obj.webRtc.mdnsCandidates.length > 20) {
        throw new PayloadValidationError('Invalid webRtc.mdnsCandidates');
      }
      validated.webRtc.mdnsCandidates = obj.webRtc.mdnsCandidates.map((candidate: unknown) => {
        if (typeof candidate !== 'string' || candidate.length > 255) throw new PayloadValidationError('Invalid mDNS candidate');
        return candidate;
      });
    }
    if (obj.webRtc.status !== undefined) {
      if (!['NO_LEAK','PUBLIC_CANDIDATE_REVIEW','LEAK_DETECTED','PROTECTED','UNAVAILABLE','BLOCKED','TIMEOUT','ERROR'].includes(obj.webRtc.status)) {
        throw new PayloadValidationError('Invalid webRtc.status');
      }
      validated.webRtc.status = obj.webRtc.status;
    }
  }

  // 9. Security Flags
  if (obj.securityFlags !== undefined) {
    if (typeof obj.securityFlags !== 'object' || Array.isArray(obj.securityFlags)) {
      throw new PayloadValidationError('Invalid securityFlags: expected object');
    }
    validated.securityFlags = {
      isAutomation: typeof obj.securityFlags.isAutomation === 'boolean' ? obj.securityFlags.isAutomation : false,
      isAdBlockActive: typeof obj.securityFlags.isAdBlockActive === 'boolean' ? obj.securityFlags.isAdBlockActive : false,
      isIncognito: typeof obj.securityFlags.isIncognito === 'boolean' ? obj.securityFlags.isIncognito : false,
    };
  }

  return validated;
}
