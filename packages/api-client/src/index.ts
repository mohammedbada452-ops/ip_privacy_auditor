/**
 * @packages/api-client
 * Centralized API client foundation for browser and backend fetch operations.
 */

import type {
  ApiResponse,
  HealthzResponse,
  IpCheckResponse,
  IpDetailsResponse,
  IpReputationResponse,
  IpNetworkIntelligenceResponse,
  AnalyzeBrowserInput,
  PrivacyScoreAnalysis,
  HeadersAnalysisResponse,
  PopulationInsightResponse,
} from '@packages/api-contract';

export class ApiClientError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(message: string, code: string = 'CLIENT_ERROR', status: number = 500, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export interface ApiClientConfig {
  baseUrl?: string;
  headers?: Record<string, string>;
}

export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl || '';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...config.headers,
    };
  }

  async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      ...this.defaultHeaders,
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        credentials: options.credentials || 'same-origin',
        ...options,
        headers,
      });

      const contentType = response.headers.get('content-type') || '';
      let payload: ApiResponse<T> | null = null;
      let rawText = '';

      if (contentType.toLowerCase().includes('application/json')) {
        try {
          payload = (await response.json()) as ApiResponse<T>;
        } catch {
          payload = null;
        }
      } else {
        rawText = await response.text().catch(() => '');
      }

      if (!response.ok || !payload?.success) {
        if (payload?.success === false) {
          throw new ApiClientError(
            payload.error.message,
            payload.error.code,
            response.status,
            payload.error.details
          );
        }

        const fallbackMessage =
          rawText.trim().slice(0, 180) ||
          `HTTP Error ${response.status}: ${response.statusText || 'Request failed'}`;

        throw new ApiClientError(
          fallbackMessage,
          'HTTP_ERROR',
          response.status
        );
      }

      return payload.data;
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        throw err;
      }
      const message = err instanceof Error ? err.message : 'Unknown network error';
      throw new ApiClientError(message, 'NETWORK_ERROR', 0);
    }
  }

  async checkHealth(): Promise<HealthzResponse> {
    return this.fetch<HealthzResponse>('/api/healthz');
  }

  async getIp(): Promise<IpCheckResponse> {
    return this.fetch<IpCheckResponse>('/api/ip');
  }

  async getIpDetails(ip?: string): Promise<IpDetailsResponse> {
    const query = ip ? `?ip=${encodeURIComponent(ip)}` : '';
    return this.fetch<IpDetailsResponse>(`/api/ip/details${query}`);
  }

  async getIpNetworkIntelligence(ip?: string): Promise<IpNetworkIntelligenceResponse> {
    const query = ip ? `?ip=${encodeURIComponent(ip)}` : '';
    return this.fetch<IpNetworkIntelligenceResponse>(`/api/ip/network-intelligence${query}`);
  }

  async getIpReputation(ip?: string): Promise<IpReputationResponse> {
    const query = ip ? `?ip=${encodeURIComponent(ip)}` : '';
    return this.fetch<IpReputationResponse>(`/api/ip/reputation${query}`);
  }

  async analyzeBrowser(payload: AnalyzeBrowserInput = {}): Promise<PrivacyScoreAnalysis> {
    return this.fetch<PrivacyScoreAnalysis>('/api/analyze/browser', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getPrivacyScore(): Promise<PrivacyScoreAnalysis> {
    return this.fetch<PrivacyScoreAnalysis>('/api/privacy/score');
  }

  async getHeaders(): Promise<HeadersAnalysisResponse> {
    return this.fetch<HeadersAnalysisResponse>('/api/headers');
  }

  async getPopulationInsight(score: number): Promise<PopulationInsightResponse> {
    return this.fetch<PopulationInsightResponse>(`/api/insights/population?score=${encodeURIComponent(String(score))}`);
  }

}

export const apiClient = new ApiClient();
