import type { UnifiedRiskItem, SmartRecommendation, RecommendationFixItem } from '../types';

export function generateSmartRecommendations(risks: UnifiedRiskItem[]): SmartRecommendation[] {
  const recommendationsMap = new Map<string, SmartRecommendation>();

  // Check categories of active risks
  const hasWebrtcLeak = risks.some((r) => r.id.includes('webrtc') || r.title.toLowerCase().includes('webrtc'));
  const hasCanvas = risks.some((r) => r.id.includes('canvas') || r.title.toLowerCase().includes('canvas'));
  const hasWebgl = risks.some((r) => r.id.includes('webgl') || r.title.toLowerCase().includes('webgl'));
  const hasAudio = risks.some((r) => r.id.includes('audio') || r.title.toLowerCase().includes('audio'));
  const hasGpcMissing = risks.some((r) => r.id.includes('gpc') || r.id.includes('sec-gpc') || r.title.toLowerCase().includes('gpc'));
  const hasClientHints = risks.some((r) => r.id.includes('client_hint') || r.id.includes('ch_ua') || r.title.toLowerCase().includes('client hints'));
  const hasRefererLeak = risks.some((r) => r.id.includes('referer') || r.title.toLowerCase().includes('referer'));
  const hasNetworkProxy = risks.some((r) => r.source === 'network' && (r.id.includes('proxy') || r.severity === 'high'));

  // Rule 1: WebRTC IP Exposure Mitigation (+20 pts)
  if (hasWebrtcLeak) {
    const fixes: RecommendationFixItem[] = [
      {
        id: 'fix_webrtc_disable',
        title: 'Disable WebRTC PeerConnection in Browser',
        description: 'Set media.peerconnection.enabled = false in about:config or disable WebRTC in Brave/Chrome flags.',
        expectedImprovementPts: 20,
        actor: 'BROWSER SETTING',
      },
      {
        id: 'fix_webrtc_ublock',
        title: 'Enable "Prevent WebRTC from leaking local IP address" in uBlock Origin',
        description: 'Blocks STUN candidate gathering without completely disabling audio/video conferencing.',
        expectedImprovementPts: 20,
        actor: 'HEADER/EXTENSION',
      },
    ];

    recommendationsMap.set('rec_webrtc', {
      id: 'rec_webrtc',
      title: 'Shield WebRTC Local & Public IP Leakage',
      description: 'WebRTC STUN protocols bypass proxy rules and expose your physical LAN IP addresses to web scripts.',
      sourceCategory: 'browser',
      priority: 'high',
      estimatedScoreBoost: 20,
      steps: [
        'Open browser preferences or advanced config (about:config in Firefox, brave://settings/shields in Brave).',
        'Set media.peerconnection.enabled to false or install uBlock Origin with WebRTC IP leak blocking enabled.',
        'If using Brave, set WebRTC IP Handling Policy to "Disable Non-Proxied UDP".',
      ],
      fixes,
      actionLabel: 'Configure WebRTC Shield',
      targetAnchor: '#problem-center-section',
      targetRoute: '/browser',
    });
  }

  // Rule 2: Hardware fingerprinting surfaces. Only confirmed scored factors advertise a numeric score improvement.
  if (hasCanvas || hasWebgl || hasAudio) {
    const fixes: RecommendationFixItem[] = [];
    if (hasCanvas) {
      fixes.push({
        id: 'fix_canvas_noise',
        title: 'Enable Canvas Anti-Fingerprinting Mode',
        description: 'Injects subtle imperceptible mathematical noise into Canvas toDataURL() rendering calls.',
        expectedImprovementPts: 0,
        actor: 'BROWSER SETTING',
      });
    }
    if (hasWebgl) {
      fixes.push({
        id: 'fix_webgl_mask',
        title: 'Mask WebGL Hardware Renderer Parameters',
        description: 'Replaces unmasked GPU model with generic rendering context.',
        expectedImprovementPts: 3,
        actor: 'BROWSER SETTING',
      });
    }
    if (hasAudio) {
      fixes.push({
        id: 'fix_audio_noise',
        title: 'Inject Web Audio API Noise',
        description: 'Randomizes oscillator frequency buffer responses against audio hardware fingerprinting.',
        expectedImprovementPts: 0,
        actor: 'BROWSER SETTING',
      });
    }

    const totalBoost = fixes.reduce((sum, f) => sum + f.expectedImprovementPts, 0);

    const scoredFingerprintLabels = fixes
      .filter((f) => f.expectedImprovementPts > 0)
      .map((f) => f.title.replace(/^Mask /i, '').replace(/ Hardware Renderer Parameters$/i, ''));
    const scoredSummary = scoredFingerprintLabels.length
      ? `Only confirmed scored exposure${scoredFingerprintLabels.length > 1 ? 's' : ''} currently contribute${scoredFingerprintLabels.length > 1 ? '' : 's'} to recovery: ${scoredFingerprintLabels.join(', ')}.`
      : 'Current Canvas, WebGL, and Audio observations are informational and do not currently affect the canonical score.';

    recommendationsMap.set('rec_fingerprint', {
      id: 'rec_fingerprint',
      title: hasWebgl && !hasCanvas && !hasAudio
        ? 'Reduce WebGL Hardware Exposure'
        : 'Review Canvas, WebGL & Audio Fingerprinting',
      description: hasWebgl
        ? `Review the canonical Browser finding for the observed WebGL/graphics evidence. ${scoredSummary}`
        : `Review the canonical Browser findings for the observed fingerprint evidence. ${scoredSummary}`,
      sourceCategory: 'browser',
      priority: 'high',
      estimatedScoreBoost: totalBoost,
      steps: [
        'Enable built-in anti-fingerprinting protections (e.g. Firefox privacy.resistFingerprinting = true).',
        'Use privacy-focused browser features that reduce fingerprinting surface where supported.',
        'After changing browser privacy settings, re-run the audit to verify which observed signals changed.',
      ],
      fixes,
      actionLabel: 'Review Fingerprint Vector',
      targetAnchor: '#problem-center-section',
      targetRoute: '/browser',
    });
  }

  // Rule 3: GPC is a privacy preference signal. It is intentionally score-neutral.
  if (hasGpcMissing) {
    const fixes: RecommendationFixItem[] = [
      {
        id: 'fix_gpc_enable',
        title: 'Enable Global Privacy Control (Sec-GPC: 1)',
        description: 'Use native GPC support when available, or a reputable extension that explicitly sends Sec-GPC: 1. This is a privacy-preference improvement, not a guaranteed score increase.',
        expectedImprovementPts: 0,
        actor: 'BROWSER SETTING',
      },
    ];

    recommendationsMap.set('rec_gpc', {
      id: 'rec_gpc',
      title: 'Broadcast Global Privacy Control (Sec-GPC: 1)',
      description: 'Sends a standardized privacy preference signal to participating services; support and legal recognition vary by browser, site, and jurisdiction. This signal is currently informational and score-neutral in Privasec.',
      sourceCategory: 'headers',
      priority: 'low',
      estimatedScoreBoost: 0,
      steps: [
        'If your browser supports GPC natively, enable its Global Privacy Control setting.',
        'If your browser does not expose GPC natively, use a reputable extension that explicitly adds Sec-GPC: 1.',
        'Recheck headers to verify whether Sec-GPC: 1 is actually transmitted.',
      ],
      fixes,
      actionLabel: 'Verify Header Controls',
      targetAnchor: '#problem-center-section',
      targetRoute: '/headers',
    });
  }

  // Rule 4: Client Hints & User-Agent Surface Minimization (+8 pts)
  if (hasClientHints) {
    const clientHintBoost = risks
      .filter((r) => r.source === 'headers' && (r.id.includes('client_hint') || r.id.includes('ch_ua') || r.title.toLowerCase().includes('client hints')))
      .reduce((sum, r) => sum + r.scoreImpact, 0);
    const fixes: RecommendationFixItem[] = [
      {
        id: 'fix_client_hints_disable',
        title: 'Minimize High-Entropy Client Hints Exposure',
        description: `Reduce high-entropy hardware model reporting. Verified score recovery if all confirmed affected signals are resolved: ${clientHintBoost} point(s).`,
        expectedImprovementPts: clientHintBoost,
        actor: 'BROWSER SETTING',
      },
    ];

    recommendationsMap.set('rec_client_hints', {
      id: 'rec_client_hints',
      title: 'Minimize High-Entropy Client Hints Exposure',
      description: 'High-entropy client hints can increase browser fingerprinting surface. The displayed recovery estimate is derived from confirmed canonical deductions only.',
      sourceCategory: 'headers',
      priority: 'medium',
      estimatedScoreBoost: clientHintBoost,
      steps: [
        'Disable high-entropy client hints in browser experimental flags.',
        'Use User-Agent randomized switchers to emit generic platform signatures.',
        'Ensure site permissions restrict hardware architecture reporting.',
      ],
      fixes,
      actionLabel: 'Inspect Client Hints',
      targetAnchor: '#problem-center-section',
      targetRoute: '/headers',
    });
  }

  // Rule 5: Referer & Origin Truncation (+5 pts)
  if (hasRefererLeak) {
    const refererBoost = risks
      .filter((r) => r.source === 'headers' && (r.id.includes('referer') || r.title.toLowerCase().includes('referer')))
      .reduce((sum, r) => sum + r.scoreImpact, 0);
    const fixes: RecommendationFixItem[] = [
      {
        id: 'fix_referer_strip',
        title: 'Enforce Strict Referrer-Policy Truncation',
        description: `Reduce cross-origin referrer exposure. Verified score recovery if resolved: ${refererBoost} point(s).`,
        expectedImprovementPts: refererBoost,
        actor: 'BROWSER SETTING',
      },
    ];

    recommendationsMap.set('rec_referer', {
      id: 'rec_referer',
      title: 'Enforce Strict Referrer-Policy Stripping',
      description: 'Full URL paths in Referer headers can leak search queries, account IDs, and navigation paths. Recovery estimates are derived from confirmed canonical deductions.',
      sourceCategory: 'headers',
      priority: 'medium',
      estimatedScoreBoost: refererBoost,
      steps: [
        'Configure your browser to enforce strict-origin-when-cross-origin or no-referrer.',
        'In Firefox, set network.http.referer.trimmingPolicy = 2.',
        'Use Smart Referer extensions to isolate referrers to same-domain navigation.',
      ],
      fixes,
      actionLabel: 'Fix Referer Exposure',
      targetAnchor: '#problem-center-section',
      targetRoute: '/headers',
    });
  }

  // Rule 6: Network Privacy & DNS Encryption (+15 pts)
  if (hasNetworkProxy) {
    const fixes: RecommendationFixItem[] = [
      {
        id: 'fix_vpn_tunnel',
        title: 'Route Connection via Encrypted No-Logs VPN',
        description: 'Replaces transparent proxy routing with encrypted WireGuard or OpenVPN tunnel.',
        expectedImprovementPts: 15,
        actor: 'NETWORK/VPN',
      },
    ];

    recommendationsMap.set('rec_network_vpn', {
      id: 'rec_network_vpn',
      title: 'Encrypt Network Route with Trusted Privacy VPN / DNS',
      description: 'Your public IP and ISP reveal your geographic municipality and allow unencrypted relays to log endpoints.',
      sourceCategory: 'network',
      priority: 'high',
      estimatedScoreBoost: 15,
      steps: [
        'Connect through a no-logs verified VPN service using WireGuard or OpenVPN protocols.',
        'Enable DNS-over-HTTPS (DoH) or DNS-over-TLS (DoT) using Quad9 (9.9.9.9) or Cloudflare (1.1.1.1).',
        'Enable Kill Switch functionality to prevent sudden unencrypted IP failovers.',
      ],
      fixes,
      actionLabel: 'Explore Network Guard',
      targetAnchor: '#problem-center-section',
      targetRoute: '/',
    });
  }

  // Fallback / Proactive optimization if few or no risks detected
  if (recommendationsMap.size === 0) {
    recommendationsMap.set('rec_optimal_maintenance', {
      id: 'rec_optimal_maintenance',
      title: 'Maintain Proactive Defensive Hygiene',
      description: 'Your baseline privacy posture is robust. Continue practicing strict cookie isolation and regular cache clearance.',
      sourceCategory: 'composite',
      priority: 'low',
      estimatedScoreBoost: 0,
      steps: [
        'Regularly clear partition keys and service worker caches.',
        'Keep your browser engine updated to receive latest sandbox isolations.',
        'Periodically re-run complete privacy audits to check for new tracking regressions.',
      ],
      fixes: [
        {
          id: 'fix_optimal_clean',
          title: 'Automated Cookie & Cache Sanitization',
          description: 'Clear local session caches on browser close.',
          expectedImprovementPts: 0,
          actor: 'USER ACTION',
        },
      ],
      actionLabel: 'Schedule Re-audit',
      targetAnchor: '#problem-center-section',
      targetRoute: '/',
    });
  }

  const priorityOrder = { high: 3, medium: 2, low: 1 };
  return Array.from(recommendationsMap.values()).sort(
    (a, b) => priorityOrder[b.priority] - priorityOrder[a.priority] || b.estimatedScoreBoost - a.estimatedScoreBoost
  );
}
