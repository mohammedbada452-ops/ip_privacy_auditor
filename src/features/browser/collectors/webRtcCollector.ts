/**
 * WebRTC Privacy Leak Collector
 * Measures whether WebRTC ICE candidate gathering leaks private LAN or public IP addresses.
 * Enforces controlled candidate gathering, mDNS detection, timeouts, and resource cleanup.
 */

import type { BaseCollectorResult, WebRtcData, WebRtcStatus } from '../types';

const IPV4_REGEX = /(?:[0-9]{1,3}\.){3}[0-9]{1,3}/g;
const IPV6_REGEX = /(?:[a-f0-9]{1,4}:){7}[a-f0-9]{1,4}|(?:[a-f0-9]{1,4}:){1,7}:|(?:[a-f0-9]{1,4}:){1,6}:[a-f0-9]{1,4}|(?:[a-f0-9]{1,4}:){1,5}(?::[a-f0-9]{1,4}){1,2}|(?:[a-f0-9]{1,4}:){1,4}(?::[a-f0-9]{1,4}){1,3}|(?:[a-f0-9]{1,4}:){1,3}(?::[a-f0-9]{1,4}){1,4}|(?:[a-f0-9]{1,4}:){1,2}(?::[a-f0-9]{1,4}){1,5}|[a-f0-9]{1,4}:(?::[a-f0-9]{1,4}){1,6}|:(?:(?::[a-f0-9]{1,4}){1,7}|:)|fe80:(?::[a-f0-9]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(?:ffff(?::0{1,4}){0,1}:){0,1}(?:(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])|(?:[a-f0-9]{1,4}:){1,4}:(?:(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])/gi;

function isPrivateIp(ip: string): boolean {
  if (!ip) return false;
  // IPv4 Private & Link-local RFC 1918 / RFC 3927
  if (
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('169.254.') ||
    ip.startsWith('127.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)
  ) {
    return true;
  }
  // IPv6 ULA & Link-local
  const lower = ip.toLowerCase();
  if (lower.startsWith('fe80:') || lower.startsWith('fc00:') || lower.startsWith('fd00:') || lower === '::1') {
    return true;
  }
  return false;
}

export async function collectWebRtc(timeoutMs: number = 2500): Promise<BaseCollectorResult<WebRtcData>> {
  const start = performance.now();

  const isBrowser = typeof window !== 'undefined';
  const RTCPeerConnectionCtor =
    isBrowser &&
    (window.RTCPeerConnection ||
      (window as any).webkitRTCPeerConnection ||
      (window as any).mozRTCPeerConnection);

  if (!RTCPeerConnectionCtor) {
    return {
      id: 'webrtc_privacy',
      category: 'WEBRTC',
      supported: false,
      available: false,
      status: 'UNAVAILABLE',
      confidence: 'HIGH',
      durationMs: performance.now() - start,
      data: {
        status: 'UNAVAILABLE',
        localIps: [],
        publicIps: [],
        mdnsCandidates: [],
        leakDetected: false,
        leakDetails: 'WebRTC API is not supported in this browser.',
      },
    };
  }

  return new Promise<BaseCollectorResult<WebRtcData>>((resolve) => {
    let pc: RTCPeerConnection | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let isFinished = false;

    const localIpsSet = new Set<string>();
    const publicIpsSet = new Set<string>();
    const mdnsCandidatesSet = new Set<string>();

    const finalize = (forcedStatus?: WebRtcStatus, errorMsg?: string) => {
      if (isFinished) return;
      isFinished = true;

      if (timer) {
        clearTimeout(timer);
        timer = null;
      }

      // Explicit resource cleanup
      if (pc) {
        try {
          pc.onicecandidate = null;
          pc.onicegatheringstatechange = null;
          pc.close();
        } catch {
          // Ignore cleanup errors
        }
        pc = null;
      }

      const localIps = Array.from(localIpsSet);
      const publicIps = Array.from(publicIpsSet);
      const mdnsCandidates = Array.from(mdnsCandidatesSet);

      let status: WebRtcStatus = forcedStatus || 'NO_LEAK';
      let leakDetected = false;
      let leakDetails: string | undefined;

      if (forcedStatus === 'TIMEOUT') {
        status = 'TIMEOUT';
        leakDetails = errorMsg || 'WebRTC candidate gathering timed out before completion.';
      } else if (forcedStatus === 'ERROR') {
        status = 'ERROR';
        leakDetails = errorMsg || 'WebRTC collection failed.';
      } else if (forcedStatus === 'BLOCKED') {
        status = 'BLOCKED';
        leakDetails = errorMsg || 'WebRTC collection was blocked.';
      } else if (localIps.length > 0) {
        status = 'LEAK_DETECTED';
        leakDetected = true;
        leakDetails = `Private LAN address exposed via WebRTC candidate: ${localIps.join(', ')}`;
      } else if (mdnsCandidates.length > 0) {
        status = 'PROTECTED';
        leakDetails = 'Local IP is protected behind mDNS obfuscated hostname (.local)';
      } else if (publicIps.length > 0) {
        status = 'PUBLIC_CANDIDATE_REVIEW';
        leakDetails = `Public ICE candidate(s) observed: ${publicIps.join(', ')}. This is not a confirmed leak without correlation to an independent egress observation.`;
      } else {
        status = 'NO_LEAK';
        leakDetails = 'No candidates exposed local network details.';
      }

      resolve({
        id: 'webrtc_privacy',
        category: 'WEBRTC',
        supported: true,
        available: true,
        status: status === 'ERROR' ? 'ERROR' : status === 'TIMEOUT' ? 'TIMEOUT' : status === 'BLOCKED' ? 'BLOCKED' : 'SUCCESS',
        confidence: 'HIGH',
        durationMs: performance.now() - start,
        data: {
          status,
          localIps,
          publicIps,
          mdnsCandidates,
          leakDetected,
          leakDetails,
        },
        error: errorMsg,
      });
    };

    // Set bounded timeout
    timer = setTimeout(() => {
      finalize('TIMEOUT', 'WebRTC candidate gathering timed out before completion');
    }, timeoutMs);

    try {
      // Use operator-configured STUN servers so a privacy audit does not silently
      // disclose candidate information to a third-party STUN provider. An empty
      // configuration is valid; in that mode we still collect host candidates.
      const buildEnv = (import.meta as ImportMeta & { env?: Record<string, unknown> }).env;
      const configuredStun = buildEnv?.VITE_PRIVASEC_STUN_SERVERS
        ? String(buildEnv.VITE_PRIVASEC_STUN_SERVERS)
            .split(',')
            .map((url: string) => url.trim())
            .filter(Boolean)
        : [];

      pc = new RTCPeerConnectionCtor({
        iceServers: configuredStun.length > 0 ? [{ urls: configuredStun }] : [],
      });

      // Dummy data channel to force ICE candidate gathering
      pc.createDataChannel('privacy_audit');

      pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
        if (!event.candidate || !event.candidate.candidate) {
          // Candidate gathering completed
          finalize();
          return;
        }

        const cand = event.candidate.candidate;

        // Check for .local mDNS candidate
        if (cand.includes('.local')) {
          const match = cand.match(/([a-zA-Z0-9-]+\.local)/);
          if (match && match[1]) {
            mdnsCandidatesSet.add(match[1]);
          }
        }

        // Check IPv4 matches
        const v4Matches = cand.match(IPV4_REGEX);
        if (v4Matches) {
          for (const ip of v4Matches) {
            // Filter out 0.0.0.0 or malformed components
            if (ip === '0.0.0.0' || ip === '255.255.255.255') continue;
            if (isPrivateIp(ip)) {
              localIpsSet.add(ip);
            } else {
              publicIpsSet.add(ip);
            }
          }
        }

        // Check IPv6 matches
        const v6Matches = cand.match(IPV6_REGEX);
        if (v6Matches) {
          for (const ip of v6Matches) {
            if (isPrivateIp(ip)) {
              localIpsSet.add(ip);
            } else {
              publicIpsSet.add(ip);
            }
          }
        }
      };

      pc.createOffer()
        .then((offer) => {
          if (!pc || isFinished) return;
          return pc.setLocalDescription(offer);
        })
        .catch((err: unknown) => {
          finalize('ERROR', err instanceof Error ? err.message : 'WebRTC offer failed');
        });
    } catch (err: unknown) {
      finalize('BLOCKED', err instanceof Error ? err.message : 'WebRTC blocked');
    }
  });
}
