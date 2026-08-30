import type {
  HeaderItem,
  MissingHeaderItem,
  HeaderCategory,
  HeaderSummaryStats,
  HeadersAnalysisResponse,
  HeaderPrivacyStatus,
  HeaderPrivacySeverity,
  HeaderScoreFactor,
  HeaderProblem,
  HeaderCookieSecurity,
  HeaderClientHintItem,
  HeaderClientHintsAnalysis,
  PrivacyScoreTier,
} from './types';
import { HEADER_DEFINITIONS, RECOMMENDED_MISSING_HEADERS } from './HeaderRegistry';
import { HeaderCollector, type RawHeaderEntry } from './HeaderCollector';


type HeaderFindingClassification = 'SECURITY' | 'PRIVACY_EXPOSURE' | 'FINGERPRINTING_SURFACE' | 'CONFIGURATION' | 'INFORMATIONAL';

function classifyHeaderFinding(id: string, category: HeaderCategory, factor = ''): HeaderFindingClassification {
  if (/(HDR_SEC_GPC|HDR_DNT|GPC|DNT)/i.test(id) || /Global Privacy Control|Do Not Track/i.test(factor)) return 'CONFIGURATION';
  if (/REFERER|UA_STANDARD|UA_AUTOMATION|PROXY|CLIENT|HINT/i.test(id) || category === 'IDENTITY_CLIENT_HINTS' || category === 'PROXY_NETWORK' || category === 'CONTENT_NEGOTIATION') return 'PRIVACY_EXPOSURE';
  if (category === 'SECURITY_TRANSPORT' && /HSTS|CSP|UPGRADE|SEC_FETCH/i.test(id + factor)) return 'SECURITY';
  return category === 'SECURITY_TRANSPORT' ? 'PRIVACY_EXPOSURE' : 'INFORMATIONAL';
}

export class HeaderClassifier {
  /**
   * Performs full classification, privacy scoring, problem extraction,
   * client hints entropy audit, and trusted proxy analysis on collected headers.
   */
  public static analyze(entries: RawHeaderEntry[], isInfrastructureProxy = false): HeadersAnalysisResponse {
    const headersMap: Record<string, string> = {};
    for (const entry of entries) {
      const rawKey = entry.key || (entry as any).name || '';
      const normKey = entry.normalizedKey || rawKey.toLowerCase().trim();
      if (normKey) {
        headersMap[normKey] = entry.value || '';
      }
    }

    const items: HeaderItem[] = [];
    const categoryCountMap: Record<HeaderCategory, number> = {
      IDENTITY_CLIENT_HINTS: 0,
      PRIVACY_TRACKING: 0,
      PROXY_NETWORK: 0,
      SECURITY_TRANSPORT: 0,
      CONTENT_NEGOTIATION: 0,
      CACHING_STATE: 0,
      CUSTOM_ANOMALY: 0,
    };

    let sensitiveMaskedCount = 0;
    let proxyHeadersCount = 0;
    let clientHintsCount = 0;
    let privacyControlsActiveCount = 0;
    let riskFlagsCount = 0;

    const scoreFactors: HeaderScoreFactor[] = [];
    const problems: HeaderProblem[] = [];
    const lowEntropyHints: HeaderClientHintItem[] = [];
    const highEntropyHints: HeaderClientHintItem[] = [];

    // 1. Process all raw header entries
    for (const entry of entries) {
      const rawKey = entry.key || (entry as any).name || '';
      const normKey = entry.normalizedKey || rawKey.toLowerCase().trim();
      const rawVal = entry.value || '';
      const isSens = HeaderCollector.isSensitive(normKey);
      const sanitized = HeaderCollector.sanitizeValue(normKey, rawVal);

      if (isSens) {
        sensitiveMaskedCount++;
      }

      const knownDef = HEADER_DEFINITIONS[normKey];

      let category: HeaderCategory;
      let canonicalName: string;
      let description: string;
      let privacyImpact: string;
      let privacyStatus: HeaderPrivacyStatus;
      let severity: HeaderPrivacySeverity;
      let riskPoints: number;
      let recommendation: string | undefined;
      let isStandard = false;
      let isClientHint = false;
      let isProxyHeader = false;
      let isPrivacyControl = false;

      if (knownDef) {
        canonicalName = knownDef.canonicalName;
        category = knownDef.category;
        description = knownDef.description;
        privacyImpact = knownDef.privacyImpact;
        privacyStatus = isSens ? 'MASKED' : knownDef.defaultStatus;
        severity = knownDef.severity;
        riskPoints = isSens ? 0 : knownDef.riskPoints;
        recommendation = knownDef.recommendation;
        isStandard = Boolean(knownDef.isStandard);
        isClientHint = Boolean(knownDef.isClientHint);
        isProxyHeader = Boolean(knownDef.isProxyHeader);
        isPrivacyControl = Boolean(knownDef.isPrivacyControl);

        // Custom contextual overrides
        if (normKey === 'sec-gpc' && rawVal === '1') {
          privacyStatus = 'SAFE';
          privacyControlsActiveCount++;
        } else if (normKey === 'dnt' && rawVal === '1') {
          privacyStatus = 'SAFE';
          privacyControlsActiveCount++;
        } else if (normKey === 'referer' && rawVal) {
          const host = headersMap['host'] || headersMap['x-forwarded-host'] || '';
          let isSameOrigin = false;
          try {
            if (rawVal.startsWith('/')) {
              isSameOrigin = true;
            } else {
              const refUrl = new URL(rawVal);
              if (host && (refUrl.host === host || refUrl.hostname === host.split(':')[0])) {
                isSameOrigin = true;
              }
            }
          } catch {
            if (host && rawVal.includes(host)) {
              isSameOrigin = true;
            }
          }

          if (isSameOrigin) {
            privacyStatus = 'SAFE';
            severity = 'info';
            riskPoints = 0;
            privacyImpact = 'Same-origin navigation path; no external cross-origin tracking leakage.';
            recommendation = 'Server Referrer-Policy determines cross-origin transmission behavior.';
          } else {
            privacyStatus = 'WARNING';
            severity = 'medium';
            riskPoints = 4;
            privacyImpact = 'Discloses external referring page URL and navigation path across origins.';
            recommendation = 'Websites should configure Referrer-Policy to "strict-origin-when-cross-origin" or "no-referrer".';
          }
        } else if (normKey === 'user-agent') {
          if (rawVal.includes('Headless') || rawVal.includes('Selenium') || rawVal.includes('Playwright')) {
            privacyStatus = 'DANGER';
            severity = 'high';
            riskPoints = 10;
            privacyImpact = 'Headless automation signature present in User-Agent header.';
            recommendation = 'Disable automated driver strings.';
          } else {
            privacyStatus = 'INFO';
          }
        }
      } else {
        // Unknown or custom header
        canonicalName = rawKey || normKey;
        isStandard = false;

        if (normKey.startsWith('sec-ch-')) {
          category = 'IDENTITY_CLIENT_HINTS';
          isClientHint = true;
          description = 'Client Hint request header providing structured client device data.';
          privacyImpact = 'Discloses structured client hint information.';
          privacyStatus = 'INFO';
          severity = 'low';
          riskPoints = 1;
        } else if (normKey.startsWith('x-forwarded-') || normKey.includes('proxy') || normKey.includes('real-ip')) {
          category = 'PROXY_NETWORK';
          isProxyHeader = true;
          description = 'Non-standard proxy routing or forwarding header.';
          privacyImpact = 'Exposes proxy traversal routing metadata.';
          privacyStatus = 'WARNING';
          severity = 'medium';
          riskPoints = 5;
        } else if (normKey.startsWith('x-') || normKey.startsWith('cf-')) {
          category = 'CUSTOM_ANOMALY';
          description = 'Custom or vendor-specific HTTP extension header.';
          privacyImpact = 'Discloses application or infrastructure-specific metadata.';
          privacyStatus = isSens ? 'MASKED' : 'INFO';
          severity = 'info';
          riskPoints = 0;
        } else {
          category = 'CUSTOM_ANOMALY';
          description = 'HTTP header observed in client request.';
          privacyImpact = 'Custom request parameter.';
          privacyStatus = isSens ? 'MASKED' : 'INFO';
          severity = 'info';
          riskPoints = 0;
        }
      }

      // Check if Client Hint has a meaningful non-empty value
      const isMeaningfulClientHint = isClientHint && Boolean(
        rawVal &&
        rawVal.trim() !== '' &&
        rawVal.trim() !== '""' &&
        rawVal.trim() !== "''" &&
        rawVal.trim().toLowerCase() !== 'null' &&
        rawVal.trim().toLowerCase() !== 'undefined'
      );

      // If client hint is empty / not meaningful, it discloses no hardware data -> no risk deduction
      if (isClientHint && !isMeaningfulClientHint) {
        privacyStatus = 'INFO';
        severity = 'info';
        riskPoints = 0;
        privacyImpact = 'Client Hint header present without disclosed value (empty / unavailable).';
        recommendation = undefined;
      }

      // Proxy/forwarding headers are contextual evidence, not proof of a client privacy leak.
      // Header presence alone must never create a privacy penalty.
      if (isProxyHeader) {
        riskPoints = 0;
        severity = 'info';
        description = isInfrastructureProxy
          ? 'Trusted infrastructure reverse-proxy ingress metadata observed.'
          : 'Forwarding/proxy metadata observed; this alone does not prove origin-IP exposure or proxy bypass.';
        privacyStatus = isInfrastructureProxy ? 'SAFE' : 'INFO';
        privacyImpact = isInfrastructureProxy
          ? 'Infrastructure routing metadata; no user privacy penalty.'
          : 'Contextual forwarding metadata. No independent leak evidence was established.';
      }

      if (isProxyHeader) proxyHeadersCount++;
      if (isClientHint) clientHintsCount++;
      if (privacyStatus === 'WARNING' || privacyStatus === 'DANGER') riskFlagsCount++;

      categoryCountMap[category] = (categoryCountMap[category] || 0) + 1;

      items.push({
        name: entry.key,
        canonicalName,
        rawValue: isSens ? '[REDACTED]' : rawVal,
        sanitizedValue: sanitized,
        category,
        privacyStatus,
        severity,
        privacyImpact,
        description,
        recommendation,
        isSensitive: isSens,
        isStandard,
        isClientHint,
        isProxyHeader,
        isPrivacyControl,
        riskPoints,
        classification: classifyHeaderFinding(normKey, category, canonicalName),
        scoreScope: classifyHeaderFinding(normKey, category, canonicalName) === 'SECURITY' ? 'SECURITY' : classifyHeaderFinding(normKey, category, canonicalName) === 'INFORMATIONAL' || classifyHeaderFinding(normKey, category, canonicalName) === 'CONFIGURATION' ? 'INFORMATIONAL' : 'PRIVACY_EXPOSURE',
      });

      // Populate Client Hints Analysis
      if (isClientHint) {
        const isHighEntropy = isMeaningfulClientHint && [
          'sec-ch-ua-platform-version',
          'sec-ch-ua-full-version-list',
          'sec-ch-ua-model',
          'sec-ch-ua-arch',
          'sec-ch-ua-bitness',
          'device-memory',
          'sec-ch-viewport-width',
          'rtt',
          'downlink',
        ].includes(normKey);

        const entropyLevel = isHighEntropy ? (['sec-ch-ua-model', 'sec-ch-ua-platform-version', 'sec-ch-ua-full-version-list'].includes(normKey) ? 'HIGH' : 'MEDIUM') : 'LOW';
        const deduction = isHighEntropy ? (normKey === 'sec-ch-ua-model' ? 6 : ['sec-ch-ua-platform-version', 'sec-ch-ua-full-version-list'].includes(normKey) ? 4 : 2) : 0;

        const hintItem: HeaderClientHintItem = {
          name: entry.key,
          canonicalName,
          value: sanitized,
          entropyLevel,
          impact: isHighEntropy
            ? `-${deduction} pts (${entropyLevel.toLowerCase()} entropy)`
            : isMeaningfulClientHint
            ? 'Minimal (standard brand / form info)'
            : 'Not disclosed (empty value)',
          pointsDeduction: deduction,
          recommendation: isHighEntropy
            ? 'Disable high-entropy client hints in browser preferences where possible.'
            : isMeaningfulClientHint
            ? 'Standard low-entropy client hint.'
            : 'Client hint header is present but discloses no value.',
        };

        if (isHighEntropy) {
          highEntropyHints.push(hintItem);
        } else {
          lowEntropyHints.push(hintItem);
        }
      }
    }

    // 2. Sort items: Priority to Privacy & Tracking, Proxy & Network, Client Hints, Security, Content, Caching, Custom
    const categoryOrder: Record<HeaderCategory, number> = {
      PRIVACY_TRACKING: 1,
      PROXY_NETWORK: 2,
      IDENTITY_CLIENT_HINTS: 3,
      SECURITY_TRANSPORT: 4,
      CONTENT_NEGOTIATION: 5,
      CACHING_STATE: 6,
      CUSTOM_ANOMALY: 7,
    };

    items.sort((a, b) => {
      const orderA = categoryOrder[a.category] || 99;
      const orderB = categoryOrder[b.category] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.canonicalName.localeCompare(b.canonicalName);
    });

    // 3. Detect Missing Recommended Headers
    const missingHeaders: MissingHeaderItem[] = [];
    for (const rec of RECOMMENDED_MISSING_HEADERS) {
      if (!rec.checkCondition(headersMap)) {
        missingHeaders.push({
          name: rec.canonicalName,
          canonicalName: rec.canonicalName,
          category: rec.category,
          importance: rec.importance,
          description: rec.description,
          purpose: rec.purpose,
          recommendation: rec.recommendation,
          benefit: rec.benefit,
        });
      }
    }

    const hasSecGpc = Boolean(headersMap['sec-gpc'] === '1');
    const hasDnt = Boolean(headersMap['dnt'] === '1');
    const hasProxyHeaders = proxyHeadersCount > 0;
    const ua = headersMap['user-agent'] || '';
    const userAgentReduced = Boolean(ua && (ua.includes('10_15_7') || ua.includes('0.0.0') || ua.length < 90));

    // 4. Evaluate Header Privacy Score Factors & Deductions
    // Factor: Sec-GPC
    if (hasSecGpc) {
      scoreFactors.push({
        id: 'HDR_SEC_GPC_ACTIVE',
        factor: 'Global Privacy Control (Sec-GPC)',
        points: 0,
        description: 'Sec-GPC signal active transmitting legal non-consent to third-party tracker sharing.',
        impact: 'Safe (+0 pts)',
        severity: 'info',
        status: 'SAFE',
      });
    } else {
      scoreFactors.push({
        id: 'HDR_SEC_GPC_NOT_PRESENT',
        factor: 'Global Privacy Control (Sec-GPC) Not Present',
        points: 0,
        description: 'Sec-GPC was not present in this request. This is an optional privacy preference signal, not evidence of a privacy vulnerability.',
        impact: 'Informational (+0 pts)',
        severity: 'info',
        status: 'INFO',
      });
    }

    // Factor: Do Not Track (DNT)
    if (hasDnt) {
      scoreFactors.push({
        id: 'HDR_DNT_ACTIVE',
        factor: 'Do Not Track (DNT)',
        points: 0,
        description: 'Do Not Track (DNT: 1) header present.',
        impact: 'Safe (+0 pts)',
        severity: 'info',
        status: 'SAFE',
      });
    }

    // Factor: High-Entropy Client Hints
    for (const hint of highEntropyHints) {
      if (hint.pointsDeduction > 0) {
        const deduction = -hint.pointsDeduction;
        scoreFactors.push({
          id: `HDR_HINT_${hint.canonicalName.toUpperCase()}`,
          factor: `High Entropy Client Hint: ${hint.canonicalName}`,
          points: deduction,
          description: `Discloses granular device or platform build details (${hint.canonicalName}).`,
          impact: `${deduction} pts`,
          severity: deduction <= -5 ? 'high' : 'medium',
          status: 'WARNING',
        });
        problems.push({
          id: `prob_${hint.canonicalName.toLowerCase().replace(/-/g, '_')}`,
          title: `Granular Fingerprinting Exposure: ${hint.canonicalName}`,
          headerName: hint.canonicalName,
          severity: deduction <= -5 ? 'high' : 'medium',
          whyItMatters: 'High-entropy client hints provide exact device hardware models and OS kernel patch versions, enabling cross-origin browser fingerprinting.',
          evidence: `${hint.canonicalName}: ${hint.value}`,
          remediationType: 'BROWSER SETTING',
          howToImprove: 'Disable granular client hint disclosure in browser flags or enforce User-Agent reduction.',
          potentialScoreImpact: Math.abs(deduction),
        });
      }
    }

    // Factor: Proxy Headers (Trusted vs Untrusted)
    if (hasProxyHeaders) {
      if (isInfrastructureProxy) {
        scoreFactors.push({
          id: 'HDR_INFRA_PROXY_TRUSTED',
          factor: 'Trusted Reverse Proxy Infrastructure',
          points: 0,
          description: 'Trusted reverse-proxy or edge infrastructure metadata detected. No privacy deduction applied.',
          impact: 'Informational (+0 pts)',
          severity: 'info',
          status: 'INFO',
        });
      } else {
        const headerNames = [
          headersMap['via'] ? 'Via' : null,
          headersMap['x-forwarded-for'] ? 'X-Forwarded-For' : null,
          headersMap['x-real-ip'] ? 'X-Real-IP' : null,
          headersMap['forwarded'] ? 'Forwarded' : null,
        ].filter(Boolean) as string[];
        // Presence of forwarding headers is not proof of an active proxy or origin-IP leak.
        // The actual client IP is resolved by the trusted-proxy layer; this page only reports the observation.
        scoreFactors.push({
          id: 'HDR_PROXY_HEADERS_OBSERVED',
          factor: 'Forwarding Headers Observed',
          points: 0,
          description: 'Forwarding/proxy headers were present, but header presence alone does not prove a privacy leak or proxy bypass.',
          impact: 'Informational (+0 pts)',
          severity: 'info',
          status: 'INFO',
        });
        problems.push({
          id: 'prob_proxy_headers_observed',
          title: 'Forwarding Headers Observed',
          headerName: headerNames.join(', '),
          severity: 'low',
          whyItMatters: 'Forwarding headers can reveal routing topology in some deployments, but their presence alone is not proof of origin-IP exposure.',
          evidence: headerNames.map((name) => `${name}: ${HeaderCollector.sanitizeValue(name.toLowerCase(), headersMap[name.toLowerCase()] || '')}`).join(' | '),
          remediationType: 'EDUCATIONAL ONLY',
          howToImprove: 'Confirm that your trusted ingress rewrites and sanitizes forwarding headers consistently.',
          potentialScoreImpact: 0,
        });
      }
    }

    // Factor: User-Agent Inspection
    if (ua) {
      if (ua.includes('Headless') || ua.includes('Selenium') || ua.includes('Playwright')) {
        const deduction = 0;
        scoreFactors.push({
          id: 'HDR_UA_AUTOMATION',
          factor: 'Automation Driver Present in User-Agent',
          points: deduction,
          description: 'User-Agent discloses an automation framework. This is an automation/environment signal, not a privacy vulnerability by itself.',
          impact: 'Informational (+0 pts)',
          severity: 'info',
          status: 'INFO',
        });
        problems.push({
          id: 'prob_ua_automation',
          title: 'Automated Browser Framework Disclosed in User-Agent',
          headerName: 'User-Agent',
          severity: 'high',
          whyItMatters: 'Websites flag automation driver strings and may degrade trust or block requests.',
          evidence: `User-Agent: ${HeaderCollector.sanitizeValue('user-agent', ua)}`,
          remediationType: 'DIRECT USER ACTION',
          howToImprove: 'Remove automated driver flags from your browser startup arguments.',
          potentialScoreImpact: 0,
        });
      } else {
        scoreFactors.push({
          id: 'HDR_UA_STANDARD',
          factor: 'Standard User-Agent Disclosure',
          points: 0,
          description: 'A normal User-Agent was observed. Its presence alone is not treated as a vulnerability because modern browsers may intentionally reduce or standardize UA entropy.',
          impact: 'Informational (+0 pts)',
          severity: 'info',
          status: 'INFO',
        });
      }
    }

    // Factor: Referer Disclosure
    const referer = headersMap['referer'];
    if (referer && referer.trim() !== '') {
      const host = headersMap['host'] || headersMap['x-forwarded-host'] || '';
      let isSameOrigin = false;
      try {
        if (referer.startsWith('/')) {
          isSameOrigin = true;
        } else {
          const refUrl = new URL(referer);
          if (host && (refUrl.host === host || refUrl.hostname === host.split(':')[0])) {
            isSameOrigin = true;
          }
        }
      } catch {
        if (host && referer.includes(host)) {
          isSameOrigin = true;
        }
      }

      if (isSameOrigin) {
        scoreFactors.push({
          id: 'HDR_REFERER_SAME_ORIGIN',
          factor: 'Referer Header (Same-Origin Navigation)',
          points: 0,
          description: 'Referer header reflects same-origin navigation path within this site. No cross-origin leakage.',
          impact: 'Safe (+0 pts)',
          severity: 'info',
          status: 'SAFE',
        });
      } else {
        const deduction = -4;
        scoreFactors.push({
          id: 'HDR_REFERER_CROSS_ORIGIN_EXPOSURE',
          factor: 'Referer Header Exposes Cross-Origin Navigation Path',
          points: deduction,
          description: 'Referer header discloses external origin page URL and navigation history across sites.',
          impact: `${deduction} pts`,
          severity: 'medium',
          status: 'WARNING',
        });
        problems.push({
          id: 'prob_referer_exposure',
          title: 'Referer Header Transmits Cross-Origin Navigation Path',
          headerName: 'Referer',
          severity: 'medium',
          whyItMatters: 'Transmitting full previous URLs across different origins can leak query parameters, search terms, and browsing history.',
          evidence: `Referer: ${HeaderCollector.sanitizeValue('referer', referer)}`,
          remediationType: 'WEBSITE/ADMIN CONFIGURATION',
          howToImprove: 'Websites can reduce Referer exposure by sending an appropriate Referrer-Policy response header (such as "strict-origin-when-cross-origin" or "no-referrer").',
          potentialScoreImpact: 4,
        });
      }
    }

    // Factor: Cookie Transport & Redaction
    const cookieHeader = headersMap['cookie'];
    let cookieCount = 0;
    const cookieNames: string[] = [];
    if (cookieHeader) {
      const pairs = cookieHeader.split(';').map((s) => s.trim()).filter(Boolean);
      cookieCount = pairs.length;
      for (const pair of pairs) {
        const eqIdx = pair.indexOf('=');
        cookieNames.push(eqIdx > -1 ? pair.substring(0, eqIdx) : pair);
      }
      scoreFactors.push({
        id: 'HDR_COOKIE_OBSERVED',
        factor: 'Cookie Header Observed',
        points: 0,
        description: `${cookieCount} cookie(s) were observed. Values are masked in this audit output; masking here does not prove cookie security attributes.`,
        impact: 'Informational (+0 pts)',
        severity: 'info',
        status: 'INFO',
      });
    }

    // Canonical header subsystem scores. These are NEVER the global PrivacyEngine score.
    // HeaderItem.riskPoints is display-only and MUST mirror an actually applied canonical
    // penalty, never the registry's advisory/default risk weight.
    const appliedHeaderPenalties = new Map<string, number>();
    for (const factor of scoreFactors) {
      if (factor.points < 0) {
        const key = factor.id.replace(/^HDR_HINT_/, '').toLowerCase();
        appliedHeaderPenalties.set(key, Math.abs(factor.points));
      }
    }
    for (const item of items) {
      const key = item.canonicalName.toLowerCase();
      item.riskPoints = appliedHeaderPenalties.get(key) ?? 0;
      if (key === 'referer' && scoreFactors.some((f) => f.id === 'HDR_REFERER_CROSS_ORIGIN_EXPOSURE' && f.points < 0)) {
        item.riskPoints = 4;
      }
      const hintMatch = highEntropyHints.find((hint) => hint.canonicalName.toLowerCase() === key);
      if (hintMatch) item.riskPoints = hintMatch.pointsDeduction;
    }

    // Privacy exposure includes only factors explicitly scoped to privacy exposure; security score
    // uses only factors explicitly classified as security. Unknown/informational findings add 0.
    for (const factor of scoreFactors) {
      factor.classification = factor.classification || classifyHeaderFinding(factor.id, 'CUSTOM_ANOMALY', factor.factor);
      factor.scoreScope = factor.classification === 'SECURITY'
        ? 'SECURITY'
        : factor.classification === 'INFORMATIONAL' || factor.classification === 'CONFIGURATION'
          ? 'INFORMATIONAL'
          : 'PRIVACY_EXPOSURE';
    }
    const headerPrivacyDeductions = scoreFactors
      .filter((factor) => factor.scoreScope === 'PRIVACY_EXPOSURE' && factor.points < 0)
      .reduce((sum, factor) => sum + Math.abs(factor.points), 0);
    const headerSecurityDeductions = scoreFactors
      .filter((factor) => factor.scoreScope === 'SECURITY' && factor.points < 0)
      .reduce((sum, factor) => sum + Math.abs(factor.points), 0);
    const headerPrivacyExposureScore = Math.max(0, Math.min(100, 100 - headerPrivacyDeductions));
    const headerSecurityScore = Math.max(0, Math.min(100, 100 - headerSecurityDeductions));
    const privacyScore = headerPrivacyExposureScore;

    let privacyTier: PrivacyScoreTier = 'EXCELLENT';
    if (privacyScore < 40) {
      privacyTier = 'CRITICAL';
    } else if (privacyScore < 70) {
      privacyTier = 'MODERATE';
    } else if (privacyScore < 85) {
      privacyTier = 'GOOD';
    } else {
      privacyTier = 'EXCELLENT';
    }

    const cookieSecurity: HeaderCookieSecurity = {
      cookieCount,
      isProtected: true,
      maskedDisplay: cookieCount > 0
        ? `[REDACTED_COOKIE_DATA: ${cookieCount} cookie(s) present (${cookieNames.join(', ')})]`
        : '[NO_COOKIES_DETECTED]',
      reason: cookieCount > 0
        ? 'Incoming request Cookie header values are masked by the auditor for privacy. Note: Cookie security attributes (Secure, HttpOnly, SameSite) are governed by server Set-Cookie response directives.'
        : 'No session cookies present in incoming request headers.',
      detectedNames: cookieNames,
    };

    const clientHintsAnalysis: HeaderClientHintsAnalysis = {
      lowEntropy: lowEntropyHints,
      highEntropy: highEntropyHints,
    };

    const summary: HeaderSummaryStats = {
      totalReceived: entries.length,
      uniqueHeaders: items.length,
      sensitiveMaskedCount,
      proxyHeadersCount,
      clientHintsCount,
      privacyControlsActiveCount,
      riskFlagsCount: problems.length,
      hasSecGpc,
      hasDnt,
      hasProxyHeaders,
      userAgentReduced,
      categoryCounts: Object.entries(categoryCountMap).map(([category, count]) => ({
        category: category as HeaderCategory,
        count,
      })),
    };

    // Raw JSON and HTTP text export
    const jsonExport: Record<string, string> = {};
    const rawHttpLines: string[] = [];

    for (const item of items) {
      jsonExport[item.canonicalName] = item.sanitizedValue;
      rawHttpLines.push(`${item.canonicalName}: ${item.sanitizedValue}`);
    }

    return {
      headers: items,
      missingHeaders,
      summary,
      privacyScore,
      headerPrivacyExposureScore,
      headerSecurityScore,
      privacyTier,
      scoreFactors,
      problems,
      cookieSecurity,
      clientHintsAnalysis,
      isInfrastructureProxy,
      rawExport: {
        json: jsonExport,
        rawHttp: rawHttpLines.join('\r\n'),
      },
    };
  }
}

