import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@packages/api-client';
import type { UseIpIntelligenceState, IpIntelligenceData } from '../types';

export function useIpIntelligence(): UseIpIntelligenceState {
  const [data, setData] = useState<IpIntelligenceData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      // Keep the primary IP endpoint separate, while the intelligence endpoint
      // consolidates GeoIP, reputation, RDAP, and reverse-DNS evidence into one
      // bounded backend request to avoid duplicate third-party lookups.
      const [checkResponse, networkIntelligenceResponse] = await Promise.all([
        apiClient.getIp(),
        apiClient.getIpNetworkIntelligence(),
      ]);

      setData({
        check: checkResponse,
        details: {
          ip: networkIntelligenceResponse.ip,
          measurementStatus: networkIntelligenceResponse.network.providerStatus === 'VERIFIED' ? 'MEASURED' : 'UNKNOWN',
          geo: networkIntelligenceResponse.geo,
          network: networkIntelligenceResponse.network,
        },
        reputation: networkIntelligenceResponse.reputation,
        networkIntelligence: networkIntelligenceResponse,
        fetchedAt: new Date().toISOString(),
      });
    } catch (err: unknown) {
      const fetchError = err instanceof Error ? err : new Error('Failed to retrieve IP intelligence from backend.');
      setError(fetchError);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  const refetch = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  return {
    data,
    isLoading,
    isRefreshing,
    error,
    refetch,
  };
}
