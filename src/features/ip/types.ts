import type { IpCheckResponse, IpDetailsResponse, IpReputationResponse, IpNetworkIntelligenceResponse } from '@packages/api-contract';

export interface IpIntelligenceData {
  check: IpCheckResponse;
  details: IpDetailsResponse;
  reputation: IpReputationResponse;
  networkIntelligence: IpNetworkIntelligenceResponse;
  fetchedAt: string;
}

export interface UseIpIntelligenceState {
  data: IpIntelligenceData | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}
