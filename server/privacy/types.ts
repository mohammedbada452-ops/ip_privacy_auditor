import type {
  IpCheckResponse,
  IpDetailsResponse,
  BrowserFingerprintInput,
  PrivacyFactor,
  PrivacyScoreCategory,
  PrivacyScoreTier,
  PrivacyDeduction,
  PrivacyScoreBreakdown,
  PrivacyScoreAnalysis,
} from '@packages/api-contract';

export interface PrivacyEngineInput {
  ipCheck?: IpCheckResponse | null;
  ipDetails?: IpDetailsResponse | null;
  fingerprint?: BrowserFingerprintInput | null;
  customHeaders?: Record<string, string | string[] | undefined> | null;
}

export type {
  PrivacyFactor,
  PrivacyScoreCategory,
  PrivacyScoreTier,
  PrivacyDeduction,
  PrivacyScoreBreakdown,
  PrivacyScoreAnalysis,
  BrowserFingerprintInput,
};
