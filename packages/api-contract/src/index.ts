/**
 * @packages/api-contract
 * API Contract schemas, response envelopes, and endpoint signatures.
 */

export interface ApiResponseMeta {
  timestamp: string;
  requestId: string;
  version?: string;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta: ApiResponseMeta;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  };
  meta: ApiResponseMeta;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface HealthzResponse {
  status: 'ok' | 'degraded' | 'unhealthy';
  uptime: number;
  timestamp: string;
  service: string;
  environment: string;
}

export interface IpCheckHeaders {
  userAgent: string | null;
  secGpc: string | null;
  dnt: string | null;
  acceptLanguage: string | null;
  connection: string | null;
}

export interface IpConnectionFlags {
  hasProxyHeaders: boolean;
  isInfrastructureProxy?: boolean;
  viaHeader: string | null;
}

export type IpObservationSource = 'SOCKET_PEER' | 'TRUSTED_PROXY_CHAIN';
export type IpObservationScope = 'PUBLIC' | 'PRIVATE' | 'LOOPBACK' | 'LINK_LOCAL' | 'CGNAT' | 'RESERVED' | 'UNKNOWN';

export type CanonicalCollectorStatus = 'SUCCESS' | 'BLOCKED' | 'UNAVAILABLE' | 'ERROR' | 'NOT_RUN';

export interface CanonicalCollectorResult<T = unknown> {
  signal: string;
  status: CanonicalCollectorStatus;
  value: T | null;
  classification: PrivacyFindingClassification;
  severity: PrivacyFactorSeverity;
  confidence: PrivacyFactorConfidence;
  scoreImpact: number;
  evidence: boolean;
  provenance?: EvidenceProvenance;
  source?: 'ip' | 'headers' | 'browser' | 'system';
  explanation?: string;
}

export interface IpCheckResponse {
  ip: string;
  ipVersion: 'IPv4' | 'IPv6';
  isPrivate: boolean;
  isAuthoritativeForClientEgress?: boolean;
  observationSource?: IpObservationSource;
  observationScope?: IpObservationScope;
  headers: IpCheckHeaders;
  connectionFlags: IpConnectionFlags;
  /** PUBLIC when a routable egress was actually observed; otherwise NOT_MEASURED. */
  publicIpStatus?: 'MEASURED' | 'NOT_MEASURED' | 'UNKNOWN';
  classification?: IpObservationScope;
  /** The authoritative source used for the observed connection address. */
  ipSource?: 'SERVER_OBSERVED' | 'TRUSTED_PROXY_CHAIN' | 'LOCAL_ENDPOINT';
  connectionType?: 'LOCAL_DEVELOPMENT' | 'PUBLIC_EGRESS' | 'PRIVATE_NETWORK' | 'UNKNOWN';
  localAddress?: string | null;
  publicIp?: string | null;
  publicIpConfidence?: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
}

export interface IpGeoDetails {
  country: string;
  countryCode: string;
  region: string;
  city: string;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
}

export interface IpNetworkDetails {
  isp: string;
  organization: string;
  asn: string;
  isMobile: boolean | null;
  isProxy: boolean | null;
  isVpn: boolean | null;
  isTor: boolean | null;
  isHosting: boolean | null;
  provider?: string;
  providerStatus?: 'VERIFIED' | 'UNAVAILABLE' | 'FALLBACK';
}

export type IpReputationStatus = 'MEASURED' | 'UNAVAILABLE' | 'NOT_MEASURED' | 'ERROR';

export interface IpReputationResponse {
  ip: string;
  status: IpReputationStatus;
  provider: string | null;
  abuseConfidenceScore: number | null;
  totalReports: number | null;
  lastReportedAt: string | null;
  usageType: string | null;
  isWhitelisted: boolean | null;
  countryCode: string | null;
  domain: string | null;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  note: string;
}


export interface IpRdapResponse {
  status: 'MEASURED' | 'NOT_MEASURED' | 'UNAVAILABLE' | 'ERROR';
  source: string | null;
  handle: string | null;
  name: string | null;
  country: string | null;
  startAddress: string | null;
  endAddress: string | null;
  cidr: string | null;
  networkType: string | null;
  note: string;
}

export interface IpReverseDnsResponse {
  status: 'MEASURED' | 'NOT_MEASURED' | 'UNAVAILABLE' | 'ERROR';
  names: string[];
  resolver: string | null;
  dnssecValidated: boolean | null;
  note: string;
}

export interface IpNetworkProviderObservation {
  provider: string;
  status: 'VERIFIED' | 'UNAVAILABLE' | 'ERROR';
  countryCode: string | null;
  country: string | null;
  asn: string | null;
}

export interface IpNetworkIntelligenceResponse {
  ip: string;
  geo: IpGeoDetails;
  network: IpNetworkDetails;
  reputation: IpReputationResponse;
  rdap: IpRdapResponse;
  reverseDns: IpReverseDnsResponse;
  intelligenceConfidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  providers: string[];
  providerObservations?: IpNetworkProviderObservation[];
  consensus?: { countryCode: string | null; asn: string | null; agreement: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE' };
  note: string;
}

export interface IpDetailsResponse {
  ip: string;
  measurementStatus?: 'MEASURED' | 'NOT_MEASURED' | 'UNKNOWN';
  geo: IpGeoDetails;
  network: IpNetworkDetails;
}

// Privacy Score Engine Contract Types

export type PrivacyScoreCategory = 'NETWORK' | 'HEADERS' | 'FINGERPRINT' | 'SECURITY' | 'AUTOMATION';

export type PrivacyFactorSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export type PrivacyFactorStatus =
  | 'SAFE'
  | 'INFO'
  | 'WARNING'
  | 'DANGER'
  | 'UNKNOWN'
  | 'UNAVAILABLE'
  | 'DETECTED'
  | 'NOT_DETECTED';

export type PrivacyScoreTier = 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'CRITICAL';

export type PrivacyFactorConfidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type PrivacyFindingClassification =
  | 'SECURITY'
  | 'PRIVACY_EXPOSURE'
  | 'FINGERPRINTING_SURFACE'
  | 'CONFIGURATION'
  | 'INFORMATIONAL';

export type EvidenceProvenance = 'server_observed' | 'client_observed_unverified' | 'derived' | 'provider_observed';
export type EvidenceState = 'CONFIRMED' | 'NOT_DETECTED' | 'UNKNOWN' | 'UNAVAILABLE';

export interface PrivacyFactor {
  id: string;
  category: PrivacyScoreCategory;
  name: string;
  description: string;
  status: PrivacyFactorStatus;
  severity: PrivacyFactorSeverity;
  points: number;
  currentValue: string | number | boolean | null;
  expectedValue?: string | number | boolean | null;
  reason: string;
  recommendation?: string;
  detected: boolean;
  available: boolean;
  source: 'ip' | 'headers' | 'browser' | 'system';
  confidence?: PrivacyFactorConfidence;
  metadata?: Record<string, unknown>;
  provenance?: EvidenceProvenance;
  evidenceState?: EvidenceState;
  /** Canonical interpretation of the finding; presentation must not reinterpret this. */
  classification?: PrivacyFindingClassification;
  /** True when the signal was actually observed/evaluated, regardless of scoring. */
  observed?: boolean;
  /** True only when this factor contributes to the canonical score. */
  scored?: boolean;
  /** Canonical signed score contribution; UI must display this value, never invent a penalty. */
  scoreImpact?: number;
}

export interface PrivacyDeduction {
  id?: string;
  category: PrivacyScoreCategory;
  factor: string;
  points: number;
  rawPoints?: number;
  severity?: PrivacyFactorSeverity;
  source?: 'ip' | 'headers' | 'browser' | 'system';
  reason?: string;
  recommendation?: string;
  confidence?: PrivacyFactorConfidence;
}

export interface PrivacyScoreBreakdown {
  networkScore: number;
  headerScore: number;
  fingerprintScore: number;
  securityScore: number;
}

export interface PrivacyScoreAnalysis {
  privacyScore: number;
  verificationStatus?: 'COMPLETE' | 'PARTIAL';
  verificationCoveragePct?: number;
  overallConfidence?: PrivacyFactorConfidence;
  scoreDisclaimer?: string;
  tier: PrivacyScoreTier;
  summary: string;
  deductions: PrivacyDeduction[];
  breakdown: PrivacyScoreBreakdown;
  factors: PrivacyFactor[];
  /** Canonical finding/evidence objects. UI and exports should prefer these over local recalculation. */
  canonicalFindings?: CanonicalCollectorResult[];
  evidenceSummary?: {
    total: number;
    confirmed: number;
    notDetected: number;
    unknown: number;
    unavailable: number;
    unverifiedClientObservations: number;
  };
}

export interface BrowserFingerprintInput {
  canvasHash?: string;
  canvasStatus?: 'DISTINGUISHABLE_SIGNATURE' | 'STABLE_SIGNATURE' | 'RANDOMIZED' | 'BLOCKED' | 'UNAVAILABLE' | 'ERROR';
  webgl?: {
    vendor?: string;
    renderer?: string;
    status?: 'EXPOSED' | 'MASKED' | 'BLOCKED' | 'UNAVAILABLE' | 'ERROR';
    isUnmasked?: boolean;
  };
  audioHash?: string;
  audioStatus?: 'SIGNATURE_AVAILABLE' | 'BLOCKED' | 'UNAVAILABLE' | 'TIMEOUT' | 'ERROR';
  hardware?: {
    cpuCores?: number;
    deviceMemory?: number;
    touchPoints?: number;
  };
  screen?: {
    width?: number;
    height?: number;
    colorDepth?: number;
    pixelRatio?: number;
  };
  timezone?: string;
  languages?: string[];
  webRtc?: {
    localIps?: string[];
    publicIps?: string[];
    mdnsCandidates?: string[];
    status?: 'NO_LEAK' | 'PUBLIC_CANDIDATE_REVIEW' | 'LEAK_DETECTED' | 'PROTECTED' | 'UNAVAILABLE' | 'BLOCKED' | 'TIMEOUT' | 'ERROR';
    /** Legacy client flag; never authoritative for scoring. The server derives leakDetected from candidate evidence. */
    leakDetected?: boolean;
  };
  securityFlags?: {
    isAutomation?: boolean;
    isAdBlockActive?: boolean;
    isIncognito?: boolean;
  };
}

export interface AnalyzeBrowserInput {
  fingerprint?: BrowserFingerprintInput;
}

// Stage 9: HTTP Headers Intelligence Types & Enums

export type HeaderCategory =
  | 'IDENTITY_CLIENT_HINTS'
  | 'PRIVACY_TRACKING'
  | 'PROXY_NETWORK'
  | 'SECURITY_TRANSPORT'
  | 'CONTENT_NEGOTIATION'
  | 'CACHING_STATE'
  | 'CUSTOM_ANOMALY';

export type HeaderPrivacyStatus = 'SAFE' | 'INFO' | 'WARNING' | 'DANGER' | 'MASKED';

export type HeaderPrivacySeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export interface HeaderItem {
  name: string;
  canonicalName: string;
  rawValue: string;
  sanitizedValue: string;
  category: HeaderCategory;
  privacyStatus: HeaderPrivacyStatus;
  severity: HeaderPrivacySeverity;
  privacyImpact: string;
  description: string;
  recommendation?: string;
  isSensitive: boolean;
  isStandard: boolean;
  isClientHint: boolean;
  isProxyHeader: boolean;
  isPrivacyControl: boolean;
  riskPoints: number;
  parsedValues?: Record<string, unknown>;
  classification?: PrivacyFindingClassification;
  scoreScope?: 'SECURITY' | 'PRIVACY_EXPOSURE' | 'INFORMATIONAL';
}

export interface MissingHeaderItem {
  name: string;
  canonicalName: string;
  category: HeaderCategory;
  importance: 'recommended' | 'optional' | 'informative';
  description: string;
  purpose: string;
  recommendation: string;
  benefit: string;
}

export interface HeaderCategoryCount {
  category: HeaderCategory;
  count: number;
}

export interface HeaderSummaryStats {
  totalReceived: number;
  uniqueHeaders: number;
  sensitiveMaskedCount: number;
  proxyHeadersCount: number;
  clientHintsCount: number;
  privacyControlsActiveCount: number;
  riskFlagsCount: number;
  hasSecGpc: boolean;
  hasDnt: boolean;
  hasProxyHeaders: boolean;
  userAgentReduced: boolean;
  categoryCounts: HeaderCategoryCount[];
}

export interface HeaderScoreFactor {
  id: string;
  factor: string;
  points: number;
  description: string;
  impact: string;
  severity: HeaderPrivacySeverity;
  status: 'SAFE' | 'WARNING' | 'DANGER' | 'INFO';
  classification?: PrivacyFindingClassification;
  scoreScope?: 'SECURITY' | 'PRIVACY_EXPOSURE' | 'INFORMATIONAL';
}

export type HeaderRemediationActor =
  | 'DIRECT USER ACTION'
  | 'BROWSER SETTING'
  | 'SYSTEM SETTING'
  | 'WEBSITE/ADMIN CONFIGURATION'
  | 'NETWORK/PROVIDER CONFIGURATION'
  | 'EDUCATIONAL ONLY'
  | 'NOT ACTIONABLE';

export interface HeaderProblem {
  id: string;
  title: string;
  headerName: string;
  severity: HeaderPrivacySeverity;
  whyItMatters: string;
  evidence: string;
  remediationType: HeaderRemediationActor;
  howToImprove: string;
  potentialScoreImpact: number;
}

export interface HeaderCookieSecurity {
  cookieCount: number;
  isProtected: boolean;
  maskedDisplay: string;
  reason: string;
  detectedNames: string[];
}

export interface HeaderClientHintItem {
  name: string;
  canonicalName: string;
  value: string;
  entropyLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  impact: string;
  pointsDeduction: number;
  recommendation: string;
}

export interface HeaderClientHintsAnalysis {
  lowEntropy: HeaderClientHintItem[];
  highEntropy: HeaderClientHintItem[];
}

export interface HeadersAnalysisResponse {
  scoreScope?: 'HEADERS_ONLY';
  headers: HeaderItem[];
  missingHeaders: MissingHeaderItem[];
  summary: HeaderSummaryStats;
  /** @deprecated Use headerPrivacyExposureScore. Kept for backward compatibility only. */
  privacyScore: number;
  headerPrivacyExposureScore: number;
  headerSecurityScore: number;
  privacyTier: PrivacyScoreTier;
  scoreFactors: HeaderScoreFactor[];
  problems: HeaderProblem[];
  cookieSecurity: HeaderCookieSecurity;
  clientHintsAnalysis: HeaderClientHintsAnalysis;
  isInfrastructureProxy: boolean;
  rawExport: {
    json: Record<string, string>;
    rawHttp: string;
  };
}




export interface SiteAuditHeaderFinding {
  name: string;
  present: boolean;
  value: string | null;
  secure: boolean;
  recommendation: string;
}

export interface SiteTrackerSignal {
  host: string;
  category: string;
  evidence: string;
}

export interface SiteAuditResponse {
  input: string;
  finalUrl: string;
  status: number;
  ok: boolean;
  contentType: string;
  responseTimeMs: number;
  redirectCount: number;
  headers: SiteAuditHeaderFinding[];
  cookies: Array<{ name: string; secure: boolean; httpOnly: boolean; sameSite: boolean }>;
  trackers: SiteTrackerSignal[];
  scores: { privacy: number; security: number; headers: number };
  limitations: string[];
  evidence: { fetchedBytes: number; htmlAnalyzed: boolean; source: string };
}

export interface PopulationInsightResponse {
  sampleSize: number;
  scorePercentile: number | null;
  averageScore: number | null;
  status: 'READY' | 'INSUFFICIENT_SAMPLE';
  comparisonWindowDays: number;
}
