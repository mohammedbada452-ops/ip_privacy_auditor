/**
 * Database Domain Types & Schemas
 * Compliant with DATA_SPEC.md & ADMIN_SPEC.md
 */

export type AdminRole = 'SUPERADMIN' | 'ADMIN' | 'ANALYST' | 'VIEWER';
export type AdminUserStatus = 'ACTIVE' | 'DISABLED';

export interface AdminUser {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
  lastLogin?: string;
  role?: AdminRole;
  status?: AdminUserStatus;
}

export interface ScanSessionRecord {
  id: string;
  ipHash: string;
  countryCode: string;
  city: string;
  isp: string;
  isVpn: boolean | null;
  isProxy: boolean | null;
  isTor: boolean | null;
  isWebRtcLeak: boolean | null;
  networkIntelligenceStatus?: 'VERIFIED' | 'UNAVAILABLE' | 'FALLBACK';
  webRtcEvidenceState?: 'CONFIRMED' | 'NOT_DETECTED' | 'UNKNOWN' | 'UNAVAILABLE';
  privacyScore: number;
  scoreTier: 'CRITICAL' | 'MODERATE' | 'GOOD' | 'EXCELLENT';
  userAgentCategory: string;
  verificationStatus?: 'COMPLETE' | 'PARTIAL';
  verificationCoveragePct?: number;
  overallConfidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  createdAt: string;
}

export interface SecurityLogRecord {
  id: string;
  eventType: string;
  ipAddress: string;
  details: string;
  createdAt: string;
}

export interface SystemAnalyticsSummary {
  totalScans: number;
  uniqueIpsCount: number;
  averagePrivacyScore: number;
  vpnDetectionRate: number;
  webRtcLeakRate: number;
  topCountries: Array<{ countryCode: string; count: number }>;
  recentScans: Array<Omit<ScanSessionRecord, 'ipHash'>>;
  tierCounts?: Record<string, number>;
  todayScans?: number;
  completedScans?: number;
  scoredScans?: number;
  vpnDetections?: number;
  webRtcConfirmedLeaks?: number;
  scoreDistributionTotal?: number;
  completeRatePercent?: number;
  averageCoveragePercent?: number;
  confidenceCounts?: Record<'HIGH'|'MEDIUM'|'LOW', number>;
  networkVerifiedRate?: number;
  webRtcVerifiedRate?: number;
  dailyTrend?: Array<{ date: string; count: number; averageScore: number | null }>;
}
