import type {
  PrivacyScoreAnalysis,
  PrivacyFactor,
  IpCheckResponse,
  IpDetailsResponse,
  HeadersAnalysisResponse,
} from '@packages/api-contract';
import type {
  RemediationFinding,
  RemediationSummary,
  ConsistencyObservation,
  PlatformContext,
  FindingCategory,
  ResolutionState,
  ResponsibleActor,
  ActionabilityType,
  ConfidenceRating,
  RiskSeverity,
  BrowserProfile,
  WebRtcData,
} from '../types';
import { getLanguageCountryConsistency } from './networkPresentation';

/**
 * Detect client platform context from userAgent and browser profile.
 */
export function detectPlatformContext(
  userAgentString?: string,
  browserProfile?: Partial<BrowserProfile> | null
): PlatformContext {
  const ua =
    userAgentString ||
    (typeof navigator !== 'undefined' ? navigator.userAgent : '') ||
    '';

  let browserFamily: PlatformContext['browserFamily'] = 'OTHER';
  let browserName = 'Browser';

  const isBrave =
    (browserProfile?.fingerprintPayload?.securityFlags as any)?.isBrave ||
    (browserProfile as any)?.isBrave ||
    false;

  if (isBrave) {
    browserFamily = 'BRAVE';
    browserName = 'Brave Browser';
  } else if (/Edg\//i.test(ua)) {
    browserFamily = 'EDGE';
    browserName = 'Microsoft Edge';
  } else if (/Firefox|FxiOS/i.test(ua)) {
    browserFamily = 'FIREFOX';
    browserName = 'Mozilla Firefox';
  } else if (/Safari/i.test(ua) && !/Chrome|Chromium|Edg/i.test(ua)) {
    browserFamily = 'SAFARI';
    browserName = 'Apple Safari';
  } else if (/Chrome|CriOS/i.test(ua)) {
    browserFamily = 'CHROME';
    browserName = 'Google Chrome / Chromium';
  }

  let osFamily: PlatformContext['osFamily'] = 'OTHER';
  let osName = 'Operating System';

  if (/iPhone|iPad|iPod/i.test(ua)) {
    osFamily = 'IOS';
    osName = 'iOS';
  } else if (/Android/i.test(ua)) {
    osFamily = 'ANDROID';
    osName = 'Android';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    osFamily = 'MACOS';
    osName = 'macOS';
  } else if (/Windows NT/i.test(ua)) {
    osFamily = 'WINDOWS';
    osName = 'Windows';
  } else if (/Linux/i.test(ua)) {
    osFamily = 'LINUX';
    osName = 'Linux';
  }

  return {
    browserFamily,
    browserName,
    osFamily,
    osName,
    isMobile: osFamily === 'IOS' || osFamily === 'ANDROID',
  };
}

/**
 * Classify responsible actor for a given factor ID.
 */
function classifyActor(factorId: string, category: string): ResponsibleActor {
  const id = factorId.toUpperCase();
  if (id.includes('UNAVAILABLE') || id.includes('BLOCKED')) {
    return 'UNAVAILABLE';
  }
  if (id.includes('GPC') || id.includes('USER') || id.includes('COOKIE')) {
    return 'USER';
  }
  if (id.includes('WEBRTC') || id.includes('CANVAS') || id.includes('WEBGL') || id.includes('AUDIO') || id.includes('FINGERPRINT') || id.includes('AUTOMATION') || id.includes('CLIENT_HINTS')) {
    return 'BROWSER';
  }
  if (id.includes('HARDWARE') || id.includes('BATTERY') || id.includes('DEVICE')) {
    return 'DEVICE';
  }
  if (id.includes('HOSTING') || id.includes('DATACENTER') || id.includes('CLOUD')) {
    return 'HOSTING_PROVIDER';
  }
  if (id.includes('ISP') || id.includes('ASN')) {
    return 'ISP';
  }
  if (id.includes('PROXY') || id.includes('VPN') || id.includes('TOR') || id.includes('NETWORK') || id.includes('IP_EXPOSED') || id.includes('PUBLIC_IP')) {
    return 'NETWORK';
  }
  if (id.includes('SERVER') || id.includes('SIGNATURE')) {
    return 'SERVER';
  }
  if (id.includes('WEBSITE') || id.includes('REFERRER') || id.includes('CSP') || id.includes('HSTS')) {
    return 'WEBSITE';
  }
  if (id.includes('UNAVAILABLE') || id.includes('BLOCKED')) {
    return 'UNAVAILABLE';
  }
  if (category === 'BROWSER') return 'BROWSER';
  if (category === 'NETWORK') return 'NETWORK';
  if (category === 'HTTP_HEADERS') return 'HEADERS';
  return 'EDUCATIONAL';
}

/**
 * Classify actionability type for a given factor.
 */
function classifyActionability(factorId: string, actor: ResponsibleActor, points: number): ActionabilityType {
  const id = factorId.toUpperCase();
  if (points === 0 && (actor === 'HOSTING_PROVIDER' || id.includes('DATACENTER') || id.includes('HOSTING'))) {
    return 'ACTIONABLE_HOSTING';
  }
  if (points === 0 && actor === 'EDUCATIONAL') {
    return 'EDUCATIONAL_ONLY';
  }
  if (id.includes('GPC')) {
    return 'ACTIONABLE_NOW';
  }
  if (actor === 'USER') {
    return 'ACTIONABLE_NOW';
  }
  if (actor === 'BROWSER') {
    return 'ACTIONABLE_BROWSER';
  }
  if (actor === 'DEVICE') {
    return 'ACTIONABLE_DEVICE';
  }
  if (actor === 'NETWORK' || actor === 'ISP') {
    return 'ACTIONABLE_NETWORK';
  }
  if (actor === 'WEBSITE' || actor === 'SERVER') {
    return 'ACTIONABLE_WEBSITE';
  }
  if (actor === 'HOSTING_PROVIDER') {
    return 'ACTIONABLE_HOSTING';
  }
  if (actor === 'UNAVAILABLE') {
    return 'NOT_ACTIONABLE';
  }
  return points > 0 ? 'ACTIONABLE_NOW' : 'EDUCATIONAL_ONLY';
}

/**
 * Map factor category to FindingCategory
 */
function mapFindingCategory(factorCategory: string, factorId: string): FindingCategory {
  const id = factorId.toUpperCase();
  if (factorCategory === 'HTTP_HEADERS' || id.includes('HDR_') || id.includes('HEADER') || id.includes('CLIENT_HINTS') || id.includes('GPC')) {
    return 'HEADERS';
  }
  if (factorCategory === 'NETWORK' || id.includes('IP') || id.includes('VPN') || id.includes('PROXY') || id.includes('ISP') || id.includes('HOSTING')) {
    return 'NETWORK';
  }
  if (id.includes('COOKIE') || id.includes('DNT')) {
    return 'PRIVACY_CONTROLS';
  }
  return 'BROWSER';
}

/**
 * Build platform-tailored step-by-step remediation instructions.
 */
function buildStepsForFactor(
  factorId: string,
  platform: PlatformContext
): Array<{ stepNumber: number; title: string; instruction: string; codeSnippet?: string }> {
  const id = factorId.toUpperCase();

  if (id.includes('WEBRTC')) {
    if (platform.browserFamily === 'FIREFOX') {
      return [
        {
          stepNumber: 1,
          title: 'Open Advanced Configuration',
          instruction: 'Type "about:config" in the Firefox address bar and accept the risk warning.',
          codeSnippet: 'about:config',
        },
        {
          stepNumber: 2,
          title: 'Disable WebRTC PeerConnection',
          instruction: 'Search for "media.peerconnection.enabled" and double-click to toggle it to "false".',
          codeSnippet: 'media.peerconnection.enabled = false',
        },
        {
          stepNumber: 3,
          title: 'Verify Protection',
          instruction: 'Click "Recheck Finding" in this auditor to confirm local IP disclosure is stopped.',
        },
      ];
    }

    if (platform.browserFamily === 'BRAVE') {
      return [
        {
          stepNumber: 1,
          title: 'Open Brave Privacy Settings',
          instruction: 'Navigate to Brave Settings > Web3 / Privacy and Security.',
          codeSnippet: 'brave://settings/privacy',
        },
        {
          stepNumber: 2,
          title: 'Configure WebRTC Policy',
          instruction: 'Set "WebRTC IP handling policy" to "Disable non-proxied UDP".',
        },
        {
          stepNumber: 3,
          title: 'Recheck Audit',
          instruction: 'Re-run the privacy scan to verify zero candidate IP leaks.',
        },
      ];
    }

    return [
      {
        stepNumber: 1,
        title: 'Open Browser Privacy Settings or Install WebRTC Shield',
        instruction: `In ${platform.browserName}, WebRTC candidate gathering is enabled by default. Install an audited privacy extension (e.g. uBlock Origin or WebRTC Control).`,
      },
      {
        stepNumber: 2,
        title: 'Enable "Prevent WebRTC from leaking local IP address"',
        instruction: 'In the extension settings, toggle "Prevent WebRTC IP leak" to active.',
      },
      {
        stepNumber: 3,
        title: 'Verify Isolation',
        instruction: 'Click "Recheck Finding" to ensure no STUN IP candidates are broadcast.',
      },
    ];
  }

  if (id.includes('GPC')) {
    if (platform.browserFamily === 'FIREFOX') {
      return [
        {
          stepNumber: 1,
          title: 'Open Firefox Privacy Settings',
          instruction: 'Open Settings > Privacy & Security > Website Privacy Preferences.',
          codeSnippet: 'about:preferences#privacy',
        },
        {
          stepNumber: 2,
          title: 'Enable Global Privacy Control',
          instruction: 'Check "Tell websites not to sell or share my data" to broadcast Sec-GPC: 1.',
        },
        {
          stepNumber: 3,
          title: 'Re-run Header Scan',
          instruction: 'Click Recheck to verify the Sec-GPC header signal is acknowledged.',
        },
      ];
    }

    if (platform.browserFamily === 'BRAVE') {
      return [
        {
          stepNumber: 1,
          title: 'Open Brave Shield Settings',
          instruction: 'Go to Settings > Shields > Advanced Privacy Controls.',
          codeSnippet: 'brave://settings/shields',
        },
        {
          stepNumber: 2,
          title: 'Toggle Global Privacy Control',
          instruction: 'Ensure "Global Privacy Control (GPC)" toggle is switched ON.',
        },
        {
          stepNumber: 3,
          title: 'Recheck Header Audit',
          instruction: 'Recheck in the auditor to verify the outgoing Sec-GPC: 1 signal.',
        },
      ];
    }

    return [
      {
        stepNumber: 1,
        title: 'Enable Sec-GPC Header Signal',
        instruction: `In ${platform.browserName}, enable Global Privacy Control in settings or via Privacy Badger / uBlock Origin.`,
      },
      {
        stepNumber: 2,
        title: 'Assert CCPA/GDPR Legal Opt-Out',
        instruction: 'Ensure outgoing requests include the header "Sec-GPC: 1".',
        codeSnippet: 'Sec-GPC: 1',
      },
      {
        stepNumber: 3,
        title: 'Verify Opt-Out Header',
        instruction: 'Click Recheck to verify the Sec-GPC signal is asserted.',
      },
    ];
  }

  if (id.includes('CANVAS') || id.includes('WEBGL') || id.includes('AUDIO') || id.includes('FINGERPRINT')) {
    if (platform.browserFamily === 'FIREFOX') {
      return [
        {
          stepNumber: 1,
          title: 'Open Firefox Advanced Config',
          instruction: 'Navigate to about:config in the address bar.',
          codeSnippet: 'about:config',
        },
        {
          stepNumber: 2,
          title: 'Enable Anti-Fingerprinting Engine',
          instruction: 'Set "privacy.resistFingerprinting" to true to inject canvas noise and mask hardware.',
          codeSnippet: 'privacy.resistFingerprinting = true',
        },
        {
          stepNumber: 3,
          title: 'Verify Entropy Neutralization',
          instruction: 'Click Recheck to ensure canvas and WebGL draw buffers return standardized outputs.',
        },
      ];
    }

    if (platform.browserFamily === 'BRAVE') {
      return [
        {
          stepNumber: 1,
          title: 'Open Brave Shields',
          instruction: 'Click the Brave Shields icon in the URL address bar or open Settings > Shields.',
        },
        {
          stepNumber: 2,
          title: 'Set Fingerprinting Protection to Aggressive',
          instruction: 'Change "Fingerprinting blocked" from Standard to "Strict, may break sites" or enable Farbling.',
        },
        {
          stepNumber: 3,
          title: 'Verify Randomization',
          instruction: 'Recheck finding to confirm farbling noise masks deterministic hardware signatures.',
        },
      ];
    }

    return [
      {
        stepNumber: 1,
        title: 'Enable Canvas & Hardware Noise Injection',
        instruction: `In ${platform.browserName} on ${platform.osName}, install an entropy randomization tool (e.g. Canvas Defender or Brave Shields).`,
      },
      {
        stepNumber: 2,
        title: 'Standardize WebGL & Graphics Parameters',
        instruction: 'Ensure hardware vendor strings and Canvas readback buffers return noise on each session.',
      },
      {
        stepNumber: 3,
        title: 'Recheck Entropy Vector',
        instruction: 'Click Recheck to confirm reduced fingerprint uniqueness.',
      },
    ];
  }

  if (id.includes('CLIENT_HINTS') || id.includes('HDR_')) {
    return [
      {
        stepNumber: 1,
        title: 'Review High-Entropy Request Headers',
        instruction: 'High-entropy client hints reveal exact OS build numbers, CPU architecture, and device models.',
      },
      {
        stepNumber: 2,
        title: 'Configure Header Privacy Policy',
        instruction: 'Use privacy settings or extension header rules to restrict Sec-CH-UA-* to coarse brand tokens only.',
      },
      {
        stepNumber: 3,
        title: 'Recheck Request Headers',
        instruction: 'Click Recheck to ensure high-entropy headers are omitted.',
      },
    ];
  }

  if (id.includes('PROXY') || id.includes('VPN') || id.includes('IP_EXPOSED') || id.includes('PUBLIC_IP')) {
    return [
      {
        stepNumber: 1,
        title: 'Inspect Network Routing',
        instruction: `On ${platform.osName}, review network adapters and proxy settings.`,
      },
      {
        stepNumber: 2,
        title: 'Route Through an Encrypted VPN Gateway',
        instruction: 'Connect via an audited WireGuard or OpenVPN server to mask your ISP-assigned public IP address.',
      },
      {
        stepNumber: 3,
        title: 'Verify Network Tunneling',
        instruction: 'Click Recheck to confirm public IP and ISP metadata are shielded behind the VPN.',
      },
    ];
  }

  // Generic fallback steps
  return [
    {
      stepNumber: 1,
      title: 'Inspect Privacy Setting',
      instruction: `Review relevant ${platform.browserName} preferences on ${platform.osName}.`,
    },
    {
      stepNumber: 2,
      title: 'Apply Recommended Defense',
      instruction: 'Enable strict tracking protection and shield personal identifiers.',
    },
    {
      stepNumber: 3,
      title: 'Recheck Status',
      instruction: 'Click Recheck to verify updated privacy metrics.',
    },
  ];
}

/**
 * Generate deep dive anchor route for a factor.
 */
function getAnchorRoute(factorId: string, category: FindingCategory): string {
  const id = factorId.toUpperCase();
  if (id.includes('WEBRTC') || id.includes('CANVAS') || id.includes('WEBGL') || id.includes('AUDIO') || id.includes('AUTOMATION') || category === 'BROWSER') {
    return '/browser';
  }
  if (id.includes('GPC') || id.includes('HEADER') || id.includes('CLIENT_HINTS') || category === 'HEADERS') {
    return '/headers';
  }
  return '/';
}

/**
 * Core Remediation Findings Generator.
 * Strictly consumes authoritative PrivacyScoreAnalysis.
 * NEVER calculates a competing privacy score.
 */
export function generateRemediationFindings(
  arg1:
    | {
        privacyAnalysis: PrivacyScoreAnalysis | null;
        previousAnalysis?: PrivacyScoreAnalysis | null;
        ipCheck?: IpCheckResponse | null;
        ipDetails?: IpDetailsResponse | null;
        browserProfile?: BrowserProfile | null;
        headersData?: HeadersAnalysisResponse | null;
        userAgentString?: string;
      }
    | PrivacyScoreAnalysis
    | null,
  arg2PreviousAnalysis?: PrivacyScoreAnalysis | null,
  arg3IpDetails?: IpDetailsResponse | null,
  arg4BrowserProfile?: any,
  arg5UserAgentString?: string
): {
  findings: RemediationFinding[];
  summary: RemediationSummary;
  consistencyObservations: ConsistencyObservation[];
} {
  let privacyAnalysis: PrivacyScoreAnalysis | null = null;
  let previousAnalysis: PrivacyScoreAnalysis | null = null;
  let ipDetails: IpDetailsResponse | null = null;
  let browserProfile: BrowserProfile | null = null;
  let headersData: HeadersAnalysisResponse | null = null;
  let userAgentString: string | undefined = undefined;

  if (arg1 && typeof arg1 === 'object' && 'privacyAnalysis' in arg1) {
    privacyAnalysis = arg1.privacyAnalysis;
    previousAnalysis = arg1.previousAnalysis || null;
    ipDetails = arg1.ipDetails || null;
    browserProfile = arg1.browserProfile || null;
    headersData = arg1.headersData || null;
    userAgentString = arg1.userAgentString;
  } else {
    privacyAnalysis = (arg1 as PrivacyScoreAnalysis) || null;
    previousAnalysis = arg2PreviousAnalysis || null;
    ipDetails = arg3IpDetails || null;
    browserProfile = arg4BrowserProfile || null;
    userAgentString = arg5UserAgentString;
  }

  const platform = detectPlatformContext(userAgentString, browserProfile);
  const findings: RemediationFinding[] = [];

  const currentFactors = privacyAnalysis?.factors || [];
  const prevFactorsMap = new Map<string, PrivacyFactor>();
  if (previousAnalysis?.factors) {
    for (const f of previousAnalysis.factors) {
      prevFactorsMap.set(f.id, f);
    }
  }

  // Check for fingerprinting multi-factor consolidation
  const fpFactorIds = [
    'CANVAS_FINGERPRINT',
    'AUDIO_FINGERPRINT',
    'WEBGL_FINGERPRINT',
    'FP_CANVAS_UNIQUE',
    'FP_WEBGL_HARDWARE',
    'FP_AUDIO_SIGNATURE',
    'FP_AUDIO_ENTROPY',
  ];
  const activeFpFactors = currentFactors.filter(
    (f) =>
      fpFactorIds.includes(f.id) &&
      (f.points || 0) < 0 &&
      f.detected === true &&
      f.evidenceState !== 'UNAVAILABLE' &&
      f.status !== 'SAFE'
  );

  const shouldConsolidateFp = activeFpFactors.length > 1 && activeFpFactors.some((f) => (f.points || 0) < 0);
  const processedFactorIds = new Set<string>();

  if (shouldConsolidateFp) {
    const totalFpDeduction = activeFpFactors.reduce((acc, f) => acc + Math.abs(f.points || 0), 0);
    const affectedIds = activeFpFactors.map((f) => f.id);
    affectedIds.forEach((id) => processedFactorIds.add(id));

    // Determine state relative to previous scan
    let status: ResolutionState = 'OPEN';
    if (previousAnalysis) {
      const prevFpTotal = previousAnalysis.factors
        .filter((f) => affectedIds.includes(f.id))
        .reduce((acc, f) => acc + Math.abs(f.points || 0), 0);

      if (totalFpDeduction === 0 && prevFpTotal > 0) {
        status = 'RESOLVED';
      } else if (totalFpDeduction < prevFpTotal) {
        status = 'IMPROVED';
      } else if (totalFpDeduction > prevFpTotal) {
        status = 'WORSENED';
      } else {
        status = 'UNCHANGED';
      }
    }

    findings.push({
      id: `FINGERPRINTING_COMPOSITE_${affectedIds.join('_')}`,
      title: 'Advanced Browser Graphics & Audio Fingerprinting Entropy',
      category: 'BROWSER',
      severity: totalFpDeduction >= 15 ? 'high' : 'medium',
      confidence: 'HIGH',
      remediationConfidence: 'HIGH',
      detectionConfidence: 'HIGH',
      status,
      scoreImpact: totalFpDeduction,
      potentialRecoveryPts: totalFpDeduction,
      responsibleActor: 'BROWSER',
      actionability: 'ACTIONABLE_BROWSER',
      evidence: `Multi-vector entropy detected across: ${activeFpFactors.map((f) => f.name || f.id).join(', ')}`,
      impactExplanation:
        'Canvas, WebGL, and AudioContext APIs generate persistent device-specific rendering signatures used to track you across websites without cookies.',
      expectedOutcome:
        'Privacy impact may be reduced for the affected fingerprinting surfaces; re-run the audit to verify whether the observed signals and any score deductions changed.',
      steps: buildStepsForFactor('CANVAS_FINGERPRINT', platform),
      affectedFactorIds: affectedIds,
      isMultiFactor: true,
      isInfrastructure: false,
      anchorRoute: '/browser',
      targetAnchor: '#canvas-section',
      deepDiveLabel: 'Inspect Canvas & WebGL Drawing',
      platformAwareTag: platform.browserName !== 'Browser' ? `Tailored for ${platform.browserName}` : undefined,
    });
  }

  // Process remaining active factors in current analysis
  for (const factor of currentFactors) {
    if (processedFactorIds.has(factor.id)) {
      continue;
    }

    // Only process factors that are deducted, detected, or informative
    const deductionPts = Math.abs(factor.points || 0);
    const isDeducted = deductionPts > 0;
    const isDetected = factor.detected === true;
    const isWarningOrDanger = factor.status === 'WARNING' || factor.status === 'DANGER';

    if (!isDeducted && !isDetected && !isWarningOrDanger) {
      continue;
    }

    const actor = classifyActor(factor.id, factor.category);
    const actionability = classifyActionability(factor.id, actor, factor.points);
    const category = mapFindingCategory(factor.category, factor.id);

    // Determine state transition relative to previous analysis
    let status: ResolutionState = 'OPEN';
    if (previousAnalysis) {
      const prev = prevFactorsMap.get(factor.id);
      if (prev) {
        const prevPts = Math.abs(prev.points || 0);
        const currPts = deductionPts;
        if (currPts === 0 && prevPts > 0) {
          status = 'RESOLVED';
        } else if (currPts < prevPts) {
          status = 'IMPROVED';
        } else if (currPts > prevPts) {
          status = 'WORSENED';
        } else {
          status = 'UNCHANGED';
        }
      } else {
        status = 'OPEN';
      }
    }

    const isInfra = actor === 'HOSTING_PROVIDER' || factor.id.includes('HOSTING') || factor.id.includes('DATACENTER');

    findings.push({
      id: factor.id,
      title: factor.name || factor.id,
      category,
      severity:
        (factor.severity as RiskSeverity) ||
        (deductionPts >= 15
          ? 'critical'
          : deductionPts >= 10
            ? 'high'
            : deductionPts >= 5
              ? 'medium'
              : 'low'),
      confidence: (factor.confidence as ConfidenceRating) || 'HIGH',
      detectionConfidence: (factor.confidence as ConfidenceRating) || 'HIGH',
      remediationConfidence: actor === 'UNAVAILABLE' ? 'LOW' : actionability === 'ACTIONABLE_NOW' ? 'HIGH' : 'MEDIUM',
      status,
      scoreImpact: deductionPts,
      potentialRecoveryPts: deductionPts,
      responsibleActor: actor,
      actionability,
      evidence:
        factor.currentValue !== null && factor.currentValue !== undefined
          ? `Detected value: ${String(factor.currentValue)}`
          : factor.reason || 'Active telemetry detected',
      impactExplanation: factor.description || factor.reason || 'Exposes identifiable system configuration to remote web servers.',
      expectedOutcome:
        factor.id === 'FP_WEBGL_HARDWARE'
          ? 'A suitable browser privacy control may reduce or mask WebGL hardware disclosure; re-run the audit to verify whether the deduction is removed.'
          : 'A successful mitigation may reduce the observed exposure; re-run the audit to verify the resulting evidence and score.' ,
      steps: buildStepsForFactor(factor.id, platform),
      affectedFactorIds: [factor.id],
      isMultiFactor: false,
      isInfrastructure: isInfra,
      anchorRoute: getAnchorRoute(factor.id, category),
      deepDiveLabel: `Inspect ${factor.name || 'Signal'}`,
      platformAwareTag: platform.browserName !== 'Browser' ? `Tailored for ${platform.browserName}` : undefined,
    });
  }

  // Check for resolved factors (were penalized in previous scan, now safe or 0 pts)
  if (previousAnalysis?.factors) {
    for (const prevFactor of previousAnalysis.factors) {
      const prevPts = Math.abs(prevFactor.points || 0);
      if (prevPts > 0 && !findings.some((f) => f.id === prevFactor.id || f.affectedFactorIds?.includes(prevFactor.id))) {
        const curr = currentFactors.find((f) => f.id === prevFactor.id);
        const currPts = Math.abs(curr?.points || 0);
        if (!curr || currPts === 0 || curr.status === 'SAFE' || !curr.detected) {
          const actor = classifyActor(prevFactor.id, prevFactor.category);
          const category = mapFindingCategory(prevFactor.category, prevFactor.id);
          findings.push({
            id: prevFactor.id,
            title: prevFactor.name || prevFactor.id,
            category,
            severity: 'low',
            confidence: 'HIGH',
            detectionConfidence: 'HIGH',
            remediationConfidence: 'HIGH',
            status: 'RESOLVED',
            scoreImpact: 0,
            potentialRecoveryPts: 0,
            responsibleActor: actor,
            actionability: 'ACTIONABLE_NOW',
            evidence: 'Remediation successfully verified. 0 points deducted.',
            impactExplanation: 'Previous privacy vulnerability has been corrected.',
            expectedOutcome: 'Previous deduction is no longer present in the current audit. Re-run the audit later to verify that the improvement remains.',
            steps: [],
            affectedFactorIds: [prevFactor.id],
            isMultiFactor: false,
            isInfrastructure: false,
            anchorRoute: getAnchorRoute(prevFactor.id, category),
          });
        }
      }
    }
  }

  // Sort findings by severity and score impact
  findings.sort((a, b) => {
    const severityRank: Record<RiskSeverity, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    if (severityRank[b.severity] !== severityRank[a.severity]) {
      return severityRank[b.severity] - severityRank[a.severity];
    }
    return b.scoreImpact - a.scoreImpact;
  });

  // Calculate summary metrics
  const actionableCount = findings.filter(
    (f) =>
      f.status !== 'RESOLVED' &&
      (f.actionability === 'ACTIONABLE_NOW' ||
        f.actionability === 'ACTIONABLE_BROWSER' ||
        f.actionability === 'ACTIONABLE_DEVICE' ||
        f.actionability === 'ACTIONABLE_NETWORK' ||
        f.actionability === 'ACTIONABLE_WEBSITE')
  ).length;

  const infrastructureControlled = findings.filter((f) => f.isInfrastructure || f.actionability === 'ACTIONABLE_HOSTING').length;
  const educational = findings.filter((f) => f.actionability === 'EDUCATIONAL_ONLY').length;
  const unavailable = findings.filter((f) => f.status === 'UNAVAILABLE' || f.actionability === 'NOT_ACTIONABLE').length;
  const resolvedCount = findings.filter((f) => f.status === 'RESOLVED').length;

  const summary: RemediationSummary = {
    total: findings.length,
    actionable: actionableCount,
    infrastructureControlled,
    educational,
    unavailable,
    resolvedCount,
    byCategory: {
      network: findings.filter((f) => f.category === 'NETWORK').length,
      browser: findings.filter((f) => f.category === 'BROWSER').length,
      headers: findings.filter((f) => f.category === 'HEADERS').length,
      privacyControls: findings.filter((f) => f.category === 'PRIVACY_CONTROLS').length,
    },
  };

  // Environmental Consistency Observations
  const consistencyObservations: ConsistencyObservation[] = [];

  // Timezone Consistency
  const netTimezone = ipDetails?.geo?.timezone || 'Unknown';
  let browserTimezone = 'Unknown';
  if ((browserProfile as any)?.timezone) {
    browserTimezone = (browserProfile as any).timezone;
  } else if ((browserProfile?.groups?.TIMEZONE?.data as any)?.timezone) {
    browserTimezone = (browserProfile?.groups?.TIMEZONE?.data as any).timezone;
  } else {
    try {
      if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
        browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown';
      }
    } catch {
      browserTimezone = 'Unknown';
    }
  }

  const isTzMismatch =
    netTimezone !== 'Unknown' &&
    browserTimezone !== 'Unknown' &&
    netTimezone.toLowerCase() !== browserTimezone.toLowerCase();

  consistencyObservations.push({
    id: 'obs_timezone_consistency',
    type: 'TIMEZONE',
    title: 'Timezone Consistency',
    status: netTimezone === 'Unknown' || browserTimezone === 'Unknown' ? 'UNAVAILABLE' : isTzMismatch ? 'MISMATCH' : 'MATCH',
    networkValue: netTimezone,
    browserValue: browserTimezone,
    explanation: isTzMismatch
      ? `Network IP geolocation indicates timezone "${netTimezone}" while your local system reports "${browserTimezone}". This difference is common when traveling or using a VPN/proxy.`
      : `Network location timezone matches local system timezone ("${netTimezone}").`,
    privacyRelevance:
      'Differences in timezone can be used by trackers to infer proxy or VPN usage, but it incurs zero score penalty in this auditor.',
    confidence: 'HIGH',
  });

  // Language Consistency
  const netCountryCode = ipDetails?.geo?.countryCode || null;
  const netCountry = ipDetails?.geo?.country || netCountryCode || 'Unknown';
  let browserLang = 'Unknown';
  if ((browserProfile as any)?.languages && (browserProfile as any).languages.length > 0) {
    browserLang = (browserProfile as any).languages[0];
  } else if ((browserProfile?.groups?.LOCALE?.data as any)?.languages?.length > 0) {
    browserLang = (browserProfile?.groups?.LOCALE?.data as any).languages[0];
  } else if (typeof navigator !== 'undefined') {
    browserLang = navigator.language || (navigator.languages ? navigator.languages[0] : 'Unknown');
  }

  const languageConsistency = getLanguageCountryConsistency(browserLang, netCountryCode);
  const languageStatusMap: Record<typeof languageConsistency, ConsistencyObservation['status']> = {
    MATCH: 'MATCH',
    MISMATCH: 'MISMATCH',
    AMBIGUOUS: 'UNAVAILABLE',
    UNAVAILABLE: 'UNAVAILABLE',
  };
  const languageExplanationMap: Record<typeof languageConsistency, string> = {
    MATCH: `Browser language region (${browserLang}) matches the network-observed country (${netCountry}).`,
    MISMATCH: `Browser language region (${browserLang}) does not match the network-observed country (${netCountry}). This is common for multilingual users, travelers, or VPN/proxy usage, and is only supporting evidence.`,
    AMBIGUOUS: `Browser language (${browserLang}) does not specify a region, so it cannot be compared against the network country (${netCountry}).`,
    UNAVAILABLE: 'Network country or browser language could not be measured.',
  };

  consistencyObservations.push({
    id: 'obs_language_consistency',
    type: 'LANGUAGE',
    title: 'Language & Locale Consistency',
    status: languageStatusMap[languageConsistency],
    networkValue: netCountry,
    browserValue: browserLang,
    explanation: languageExplanationMap[languageConsistency],
    privacyRelevance:
      'Language preferences are communicated via standard HTTP headers and can be combined with other signals for locale inference, but a mismatch alone does not indicate anonymity or exposure.',
    confidence: languageConsistency === 'MATCH' || languageConsistency === 'MISMATCH' ? 'HIGH' : 'LOW',
  });

  return { findings, summary, consistencyObservations };
}
