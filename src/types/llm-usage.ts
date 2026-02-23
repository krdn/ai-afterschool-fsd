export interface DailyUsageData {
  date: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  avgResponseTimeMs: number;
}

export interface ProviderUsageData {
  provider: string;
  totalRequests: number;
  totalCostUsd: number;
  successRate: number;
}

export interface FeatureUsageData {
  featureType: string;
  totalRequests: number;
  totalCostUsd: number;
}
