import type { PrivacyFactor } from '../types';
import type { PrivacyEngineInput } from '../types';

export interface IFactorEvaluator {
  id: string;
  evaluate(input: PrivacyEngineInput): PrivacyFactor;
}

export class FactorRegistry {
  private evaluators: IFactorEvaluator[] = [];

  constructor() {
    this.registerDefaultEvaluators();
  }

  public register(evaluator: IFactorEvaluator): void {
    if (this.evaluators.some((e) => e.id === evaluator.id)) {
      throw new Error(`Factor evaluator with ID '${evaluator.id}' is already registered.`);
    }
    this.evaluators.push(evaluator);
  }

  public evaluateAll(input: PrivacyEngineInput): PrivacyFactor[] {
    return this.evaluators.map((evaluator) => evaluator.evaluate(input));
  }

  private registerDefaultEvaluators(): void {
    // 1. Network: Proxy Detection (Untrusted/Transparent)
    this.register({
      id: 'NET_PROXY_DETECTED',
      evaluate: (input): PrivacyFactor => {
        const network = input.ipDetails?.network;
        const available = Boolean(network && network.providerStatus === 'VERIFIED' && typeof network.isProxy === 'boolean');
        const isProxy = network?.isProxy === true;
        const isInfra = Boolean(input.ipCheck?.connectionFlags?.isInfrastructureProxy);
        const isUntrustedProxy = available && isProxy && !isInfra;

        return {
          id: 'NET_PROXY_DETECTED',
          category: 'NETWORK',
          name: 'Network Intermediary Detection',
          description: 'Reports verified proxy/intermediary classification of the server-observed connection. Presence of a proxy or VPN is not itself a privacy vulnerability.',
          status: available ? 'INFO' : 'UNAVAILABLE',
          severity: 'info',
          points: 0,
          currentValue: available ? (isUntrustedProxy ? 'Transparent Proxy Active' : (isInfra ? 'Infrastructure Proxy' : 'Direct Connection')) : null,
          expectedValue: 'Informational network classification',
          reason: isUntrustedProxy
            ? 'Untrusted public or transparent proxy server detected relaying unencrypted traffic.'
            : isInfra
              ? 'Trusted reverse-proxy infrastructure detected in the request path.'
              : 'No transparent proxy server detected on origin connection.',
          recommendation: isUntrustedProxy ? 'Disconnect from untrusted proxy or route traffic through an encrypted VPN tunnel.' : undefined,
          detected: isUntrustedProxy,
          available,
          source: 'ip',
          confidence: 'HIGH',
          classification: 'INFORMATIONAL',
        };
      },
    });

    // 2. Network: Datacenter / Cloud Provider Infrastructure (Hosting vs User Risk Separation)
    this.register({
      id: 'NET_HOSTING_DATACENTER',
      evaluate: (input): PrivacyFactor => {
        const network = input.ipDetails?.network;
        const available = Boolean(network && network.providerStatus === 'VERIFIED' && typeof network.isHosting === 'boolean');
        const isHosting = network?.isHosting === true;
        return {
          id: 'NET_HOSTING_DATACENTER',
          category: 'NETWORK',
          name: 'Datacenter / Cloud Infrastructure',
          description: 'Classifies network provider infrastructure (Datacenter / Cloud vs Residential ISP).',
          status: available ? (isHosting ? 'INFO' : 'SAFE') : 'UNAVAILABLE',
          severity: 'low',
          points: 0, // Hosting classification does not penalize user privacy score
          currentValue: available ? (isHosting ? 'Datacenter / Cloud Provider' : 'Standard / Non-Datacenter ISP') : null,
          expectedValue: false,
          reason: isHosting
            ? 'IP address originates from a public cloud or datacenter hosting provider.'
            : 'IP address belongs to a standard residential, commercial, or enterprise ISP.',
          recommendation: isHosting ? 'Optional VPN/Tor recommended if accessing residential-only geo services.' : undefined,
          detected: isHosting,
          available,
          source: 'ip',
          confidence: 'HIGH',
          classification: 'INFORMATIONAL',
        };
      },
    });

    // 3. Network: Commercial VPN
    this.register({
      id: 'NET_VPN_DETECTED',
      evaluate: (input): PrivacyFactor => {
        const network = input.ipDetails?.network;
        const available = Boolean(network && network.providerStatus === 'VERIFIED' && typeof network.isVpn === 'boolean');
        const isVpn = network?.isVpn === true;
        return {
          id: 'NET_VPN_DETECTED',
          category: 'NETWORK',
          name: 'VPN Network Cloak',
          description: 'Detects active commercial or private Virtual Private Network (VPN).',
          status: available ? (isVpn ? 'INFO' : 'NOT_DETECTED') : 'UNAVAILABLE',
          severity: 'info',
          points: 0,
          currentValue: available ? (isVpn ? 'Active Commercial VPN' : 'Direct ISP IP') : null,
          reason: isVpn
            ? 'Commercial or private VPN connection detected concealing origin IP.'
            : 'No active commercial VPN detected.',
          recommendation: isVpn ? 'Maintain active VPN usage to protect network identity.' : undefined,
          detected: isVpn,
          available,
          source: 'ip',
          confidence: 'HIGH',
          classification: 'INFORMATIONAL',
        };
      },
    });

    // 4. Network: Tor Exit Node
    this.register({
      id: 'NET_TOR_DETECTED',
      evaluate: (input): PrivacyFactor => {
        const network = input.ipDetails?.network;
        const available = Boolean(network && network.providerStatus === 'VERIFIED' && typeof network.isTor === 'boolean');
        const isTor = network?.isTor === true;
        return {
          id: 'NET_TOR_DETECTED',
          category: 'NETWORK',
          name: 'Tor Anonymization Network',
          description: 'Detects connection routed through the Tor onion network.',
          status: available ? (isTor ? 'SAFE' : 'NOT_DETECTED') : 'UNAVAILABLE',
          severity: 'info',
          points: 0,
          currentValue: available ? (isTor ? 'Tor Onion Relay Active' : 'Standard Web Route') : null,
          reason: isTor
            ? 'Tor exit node connection active providing multi-hop network anonymization.'
            : 'Connection is not routed through Tor.',
          recommendation: isTor ? 'Tor provides maximum network-layer anonymity.' : undefined,
          detected: isTor,
          available,
          source: 'ip',
          confidence: 'HIGH',
          classification: 'INFORMATIONAL',
        };
      },
    });

    // 5. Network: Mobile Carrier
    this.register({
      id: 'NET_MOBILE_CARRIER',
      evaluate: (input): PrivacyFactor => {
        const network = input.ipDetails?.network;
        const available = Boolean(network && network.providerStatus === 'VERIFIED' && typeof network.isMobile === 'boolean');
        const isMobile = network?.isMobile === true;
        return {
          id: 'NET_MOBILE_CARRIER',
          category: 'NETWORK',
          name: 'Mobile Network Carrier',
          description: 'Detects mobile broadband connection using Carrier-Grade NAT (CGNAT).',
          status: available ? (isMobile ? 'INFO' : 'NOT_DETECTED') : 'UNAVAILABLE',
          severity: 'info',
          points: 0,
          currentValue: available ? (isMobile ? 'Mobile Carrier CGNAT' : 'Fixed Broadband') : null,
          reason: isMobile
            ? 'Mobile carrier IP detected utilizing shared Carrier-Grade NAT.'
            : 'Standard broadband fixed connection.',
          detected: isMobile,
          available,
          source: 'ip',
          confidence: 'HIGH',
          classification: 'INFORMATIONAL',
        };
      },
    });

    // 6. Network: Loopback / Private IP
    this.register({
      id: 'NET_PRIVATE_RANGE',
      evaluate: (input): PrivacyFactor => {
        const available = Boolean(input.ipCheck);
        const isPrivate = Boolean(input.ipCheck?.isPrivate);
        return {
          id: 'NET_PRIVATE_RANGE',
          category: 'NETWORK',
          name: 'Private Network Range',
          description: 'Detects local loopback or private RFC1918 address space.',
          status: available ? (isPrivate ? 'INFO' : 'SAFE') : 'UNAVAILABLE',
          severity: 'info',
          points: 0,
          currentValue: available ? (isPrivate ? 'RFC1918 / Loopback' : 'Public Routable IP') : null,
          reason: isPrivate
            ? 'Loopback or private RFC1918 address space detected.'
            : 'Public globally routable IP address.',
          detected: isPrivate,
          available,
          source: 'ip',
          confidence: 'HIGH',
          classification: 'INFORMATIONAL',
        };
      },
    });

    // 7. Headers: Proxy/Forwarding Metadata
    this.register({
      id: 'HDR_PROXY_FLAGS',
      evaluate: (input): PrivacyFactor => {
        const available = Boolean(input.ipCheck?.connectionFlags);
        const isInfra = Boolean(input.ipCheck?.connectionFlags?.isInfrastructureProxy);
        const hasProxy = Boolean(input.ipCheck?.connectionFlags?.hasProxyHeaders);
        return {
          id: 'HDR_PROXY_FLAGS',
          category: 'HEADERS',
          name: isInfra ? 'Reverse Proxy Infrastructure' : 'Forwarding Headers Observed',
          description: 'Reports proxy/forwarding metadata observed on the HTTP request without treating its presence alone as proof of a privacy leak.',
          status: available ? 'INFO' : 'UNAVAILABLE',
          severity: 'info',
          points: 0,
          currentValue: available ? (isInfra ? 'Trusted reverse proxy metadata' : (hasProxy ? 'Forwarding headers observed' : 'Direct ingress')) : null,
          expectedValue: 'Informational only',
          reason: isInfra
            ? 'Trusted reverse proxy infrastructure is present in the request path.'
            : hasProxy
              ? 'Forwarding metadata was observed, but header presence alone does not prove origin-IP exposure, proxy bypass, or an active user proxy.'
              : 'No proxy/forwarding metadata was observed.',
          recommendation: hasProxy && !isInfra ? 'Verify that your ingress proxy rewrites and sanitizes forwarding metadata consistently.' : undefined,
          detected: false,
          available,
          source: 'headers',
          confidence: 'HIGH',
        };
      },
    });

    // 8. Headers: Sec-GPC (Global Privacy Control)
    this.register({
      id: 'HDR_SEC_GPC_SIGNAL',
      evaluate: (input): PrivacyFactor => {
        const available = Boolean(input.ipCheck?.headers);
        const isGpcActive = input.ipCheck?.headers?.secGpc === '1';
        const userAgent = String(input.ipCheck?.headers?.userAgent || '');
        const chromeMatch = userAgent.match(/(?:Chrome|Chromium)\/(\d+)/i);
        const gpcNativeSupportUnknown = Boolean(chromeMatch && Number(chromeMatch[1]) >= 120 && !/Edg\//i.test(userAgent));
        return {
          id: 'HDR_SEC_GPC_SIGNAL',
          category: 'HEADERS',
          name: 'Global Privacy Control (Sec-GPC)',
          description: 'Checks if Global Privacy Control signal header is active.',
          status: available ? 'INFO' : 'UNAVAILABLE',
          severity: 'low',
          points: 0,
          currentValue: available ? (isGpcActive ? 'Sec-GPC: 1 (Active)' : 'Sec-GPC: Missing') : null,
          expectedValue: 'Sec-GPC: 1 (Active)',
          reason: isGpcActive
            ? 'Global Privacy Control (Sec-GPC: 1) signal is active, communicating opt-out preference under applicable privacy regulations.'
            : 'Global Privacy Control (Sec-GPC) signal header is not enabled.',
          recommendation: !isGpcActive && !gpcNativeSupportUnknown
            ? 'Enable Global Privacy Control (GPC) where your browser or privacy tool supports it to communicate a recognized privacy preference.'
            : undefined,
          detected: isGpcActive,
          available,
          source: 'headers',
          confidence: 'HIGH',
          evidenceState: available ? (isGpcActive ? 'CONFIRMED' : 'NOT_DETECTED') : 'UNAVAILABLE',
          classification: 'CONFIGURATION',
        };
      },
    });

    // 9. Headers: Do Not Track (DNT)
    this.register({
      id: 'HDR_DNT_SIGNAL',
      evaluate: (input): PrivacyFactor => {
        const available = Boolean(input.ipCheck?.headers);
        const isDntActive = input.ipCheck?.headers?.dnt === '1';
        return {
          id: 'HDR_DNT_SIGNAL',
          category: 'HEADERS',
          name: 'Do Not Track (DNT)',
          description: 'Checks for presence of legacy Do Not Track request header.',
          status: available ? 'INFO' : 'UNAVAILABLE',
          severity: 'info',
          points: 0,
          currentValue: available ? (isDntActive ? 'DNT: 1' : 'DNT: Not set') : null,
          reason: isDntActive
            ? 'Do Not Track (DNT: 1) header is active.'
            : 'Do Not Track (DNT) header is not set.',
          recommendation: undefined,
          detected: isDntActive,
          available,
          source: 'headers',
          confidence: 'HIGH',
          evidenceState: available ? (isDntActive ? 'CONFIRMED' : 'NOT_DETECTED') : 'UNAVAILABLE',
          classification: 'CONFIGURATION',
        };
      },
    });

    // 10. Headers: User-Agent Disclosure
    this.register({
      id: 'HDR_USER_AGENT_DISCLOSURE',
      evaluate: (input): PrivacyFactor => {
        const available = Boolean(input.ipCheck?.headers);
        const ua = input.ipCheck?.headers?.userAgent;
        const hasUa = Boolean(ua && ua.length > 0);
        return {
          id: 'HDR_USER_AGENT_DISCLOSURE',
          category: 'HEADERS',
          name: 'User-Agent Header Exposure',
          description: 'Audits browser operating system and version exposure in User-Agent string.',
          status: available ? (hasUa ? 'INFO' : 'SAFE') : 'UNAVAILABLE',
          severity: 'low',
          points: 0,
          currentValue: available ? (hasUa ? (ua || null) : 'missing') : null,
          reason: hasUa
            ? 'User-Agent string discloses browser version and operating system architecture.'
            : 'User-Agent header missing or stripped.',
          recommendation: hasUa ? 'Prefer browsers that reduce User-Agent entropy or use privacy protections that limit high-entropy client hints.' : undefined,
          detected: hasUa,
          available,
          source: 'headers',
          confidence: hasUa ? 'MEDIUM' : 'HIGH',
          evidenceState: available ? (hasUa ? 'CONFIRMED' : 'NOT_DETECTED') : 'UNAVAILABLE',
          classification: 'INFORMATIONAL',
        };
      },
    });

    // 11. Browser: WebRTC Local IP Exposure
    this.register({
      id: 'FP_WEBRTC_LEAK',
      evaluate: (input): PrivacyFactor => {
        const webRtc = input.fingerprint?.webRtc;
        const available = Boolean(webRtc) && !['UNAVAILABLE', 'BLOCKED', 'TIMEOUT', 'ERROR'].includes(webRtc?.status || '');
        const localIps = webRtc?.localIps ?? [];
        const hasLocalExposure = available && localIps.length > 0;
        const publicCandidates = webRtc?.publicIps ?? [];
        const observedPublicIp = input.ipCheck && input.ipCheck.observationScope === 'PUBLIC' ? input.ipCheck.ip : null;
        const correlation = publicCandidates.length === 0
          ? 'NO_PUBLIC_CANDIDATE'
          : observedPublicIp && publicCandidates.includes(observedPublicIp)
            ? 'MATCHES_SERVER_EGRESS'
            : observedPublicIp
              ? 'DIFFERS_FROM_SERVER_EGRESS'
              : 'NOT_ESTABLISHED';
        return {
          id: 'FP_WEBRTC_LEAK',
          category: 'FINGERPRINT',
          name: 'WebRTC Local IP Exposure',
          description: 'Detects private/local IP address exposure via RTCPeerConnection ICE candidate gathering.',
          status: !available ? 'UNAVAILABLE' : (hasLocalExposure ? 'DANGER' : 'SAFE'),
          severity: hasLocalExposure ? 'critical' : 'info',
          points: hasLocalExposure ? -20 : 0,
          currentValue: available
            ? (hasLocalExposure ? `Local candidates: ${localIps.join(', ')}` : publicCandidates.length ? `Public candidates: ${publicCandidates.join(', ')}` : 'No address candidates exposed')
            : null,
          expectedValue: 'No private/local address exposure',
          reason: hasLocalExposure
            ? `WebRTC exposed private/local network address candidates: ${localIps.join(', ')}. This confirms local-network address exposure; it does not by itself prove a public-IP leak or VPN bypass.`
            : ((publicCandidates.length || 0) > 0
              ? `WebRTC exposed public ICE candidate(s): ${publicCandidates.join(', ')}. Correlation with the server-observed public egress is ${correlation}. A differing public candidate is a review signal, not a confirmed leak.`
              : 'No private/local WebRTC IP address exposure was detected. Public STUN candidates alone are not classified as leaks.'),
          recommendation: hasLocalExposure ? 'Enable WebRTC mDNS candidate obfuscation, or disable WebRTC only when your privacy requirements justify doing so.' : undefined,
          detected: hasLocalExposure,
          available,
          source: 'browser',
          confidence: hasLocalExposure ? 'HIGH' : (correlation === 'MATCHES_SERVER_EGRESS' ? 'HIGH' : 'MEDIUM'),
          evidenceState: available ? (hasLocalExposure ? 'CONFIRMED' : 'NOT_DETECTED') : 'UNAVAILABLE',
          metadata: { correlation, publicCandidateCount: publicCandidates.length, privateIpLeak: hasLocalExposure, publicCandidateStatus: publicCandidates.length ? 'DETECTED' : 'NONE' },
          classification: hasLocalExposure ? 'PRIVACY_EXPOSURE' : 'FINGERPRINTING_SURFACE',
        };
      },
    });

    // 12. Browser: WebGL Hardware Exposure (MEDIUM Severity, -3 pts)
    this.register({
      id: 'FP_WEBGL_HARDWARE',
      evaluate: (input): PrivacyFactor => {
        const webgl = input.fingerprint?.webgl;
        const renderer = webgl?.renderer ?? '';
        const vendor = webgl?.vendor ?? '';
        const webglStatus = webgl?.status;
        const available = Boolean(webgl) && !['BLOCKED', 'UNAVAILABLE', 'ERROR'].includes(webglStatus || '');
        // WebGL availability is not automatically a privacy failure. Only score a
        // finding when the collector has explicit evidence of an unmasked hardware
        // renderer string. Generic/masked renderer strings are informational.
        const explicitUnmasked = webgl?.isUnmasked === true;
        const rendererLooksIdentifiable = !!renderer && !/generic|masked|standard webgl|software rasterizer|swiftshader/i.test(renderer);
        const isUnmasked = available && explicitUnmasked && rendererLooksIdentifiable;
        const evidenceState = !available
          ? 'UNAVAILABLE'
          : isUnmasked
            ? 'CONFIRMED'
            : 'NOT_DETECTED';

        return {
          id: 'FP_WEBGL_HARDWARE',
          category: 'FINGERPRINT',
          name: 'WebGL Hardware Exposure',
          description: 'Checks if unmasked GPU renderer model is disclosed to web scripts.',
          status: available ? (isUnmasked ? 'WARNING' : 'SAFE') : 'UNAVAILABLE',
          severity: 'medium',
          points: isUnmasked ? -3 : 0,
          currentValue: available ? (isUnmasked ? renderer : 'Masked / Generic') : null,
          expectedValue: 'Masked / Generic',
          reason: isUnmasked
            ? `Unmasked WebGL hardware GPU model disclosed: ${renderer}`
            : available
              ? 'WebGL hardware renderer masked or standard.'
              : 'WebGL context not available or blocked in this environment.',
          recommendation: isUnmasked ? 'Use a browser privacy mode or configuration that reduces or standardizes WebGL renderer exposure, then re-run the audit to verify the observed result.' : undefined,
          detected: isUnmasked,
          available,
          source: 'browser',
          confidence: isUnmasked ? 'MEDIUM' : available ? 'HIGH' : 'HIGH',
          evidenceState,
          classification: 'FINGERPRINTING_SURFACE',
        };
      },
    });

    // 13. Browser: Canvas Fingerprinting Surface (informational)
    this.register({
      id: 'FP_CANVAS_UNIQUE',
      evaluate: (input): PrivacyFactor => {
        const canvasHash = input.fingerprint?.canvasHash;
        const canvasStatus = input.fingerprint?.canvasStatus;
        const isUnavailableStr = !canvasHash || ['unavailable','null','unknown','undefined'].includes(canvasHash.toLowerCase());
        const available = canvasStatus ? !['BLOCKED','UNAVAILABLE','ERROR'].includes(canvasStatus) : !isUnavailableStr;

        return {
          id: 'FP_CANVAS_UNIQUE',
          category: 'FINGERPRINT',
          name: 'Canvas Fingerprinting',
          description: 'Measures uniqueness of HTML5 Canvas graphic pixel rendering signature.',
          status: available ? 'INFO' : 'UNAVAILABLE',
          severity: 'info',
          points: 0,
          currentValue: available ? `${canvasHash!.slice(0, 16)}...` : null,
          reason: available
            ? 'A stable canvas rendering signature was observed. This demonstrates fingerprinting surface exposure, but it does not prove that the signature is unique without comparison against a population dataset.'
            : 'Canvas 2D graphic rendering context is not available or blocked in this environment.',
          recommendation: available ? 'Enable browser anti-fingerprinting mode or Canvas noise injection extensions.' : undefined,
          detected: available,
          available,
          source: 'browser',
          confidence: 'MEDIUM',
          evidenceState: available ? 'CONFIRMED' : 'UNAVAILABLE',
          classification: 'FINGERPRINTING_SURFACE',
        };
      },
    });

    // 14. Browser: AudioContext Fingerprinting Surface (informational)
    this.register({
      id: 'FP_AUDIO_SIGNATURE',
      evaluate: (input): PrivacyFactor => {
        const audioHash = input.fingerprint?.audioHash;
        const audioStatus = input.fingerprint?.audioStatus;
        const isUnavailableStr = !audioHash || ['unavailable','null','unknown','undefined'].includes(audioHash.toLowerCase());
        const available = audioStatus ? audioStatus === 'SIGNATURE_AVAILABLE' : !isUnavailableStr;

        return {
          id: 'FP_AUDIO_SIGNATURE',
          category: 'FINGERPRINT',
          name: 'AudioContext Signature',
          description: 'Evaluates Web Audio API oscillator frequency response signature.',
          status: available ? 'INFO' : 'UNAVAILABLE',
          severity: 'info',
          points: 0,
          currentValue: available ? `${audioHash!.slice(0, 16)}...` : null,
          reason: available
            ? 'An AudioContext rendering signature was observed. This indicates fingerprinting surface exposure, but does not prove individual uniqueness without population-level comparison.'
            : 'Audio signature not evaluated or unavailable.',
          recommendation: available ? 'Enable audio fingerprint protection or use privacy-hardened browsers.' : undefined,
          detected: available,
          available,
          source: 'browser',
          confidence: 'MEDIUM',
          evidenceState: available ? 'CONFIRMED' : 'UNAVAILABLE',
          classification: 'FINGERPRINTING_SURFACE',
        };
      },
    });

    // 15. Security: Automation Driver Signals (informational; not a privacy deduction)
    this.register({
      id: 'SEC_AUTOMATION_FLAG',
      evaluate: (input): PrivacyFactor => {
        const flags = input.fingerprint?.securityFlags;
        const available = Boolean(flags);
        const isAutomation = flags?.isAutomation === true;

        return {
          id: 'SEC_AUTOMATION_FLAG',
          category: 'SECURITY',
          name: 'Browser Automation Driver Detected',
          description: 'Checks for WebDriver, Selenium, or headless browser automation indicators.',
          status: available ? 'INFO' : 'UNAVAILABLE',
          severity: 'info',
          points: 0,
          currentValue: available ? (isAutomation ? 'Known automation signal detected' : 'No known automation signals detected') : null,
          expectedValue: 'No known automation signals detected',
          reason: isAutomation
            ? 'Known WebDriver or browser automation indicators were detected.'
            : 'No known automation indicators were detected by the available browser signals; this does not prove human use.',
          recommendation: isAutomation ? 'Disable headless driver flags or automated control extensions.' : undefined,
          detected: isAutomation,
          available,
          source: 'browser',
          confidence: 'HIGH',
        };
      },
    });
  }
}
