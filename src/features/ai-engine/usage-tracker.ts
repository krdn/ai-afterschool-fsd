import { db } from '@/lib/db/client';
import { COST_PER_MILLION_TOKENS, type ProviderName, type FeatureType } from './providers';

export function calculateCost(
  provider: ProviderName,
  inputTokens: number,
  outputTokens: number
): number {
  const costs = COST_PER_MILLION_TOKENS[provider];
  if (!costs) return 0;

  const inputCost = (inputTokens / 1_000_000) * costs.input;
  const outputCost = (outputTokens / 1_000_000) * costs.output;

  return Math.round((inputCost + outputCost) * 1000000) / 1000000;
}

interface TrackUsageInput {
  provider: ProviderName;
  modelId: string;
  featureType: FeatureType;
  teacherId?: string;
  inputTokens: number;
  outputTokens: number;
  responseTimeMs: number;
  success?: boolean;
  errorMessage?: string;
  failoverFrom?: ProviderName;
}

export async function trackUsage(input: TrackUsageInput) {
  const {
    provider,
    modelId,
    featureType,
    teacherId,
    inputTokens,
    outputTokens,
    responseTimeMs,
    success = true,
    errorMessage,
    failoverFrom,
  } = input;

  const totalTokens = inputTokens + outputTokens;
  const costUsd = calculateCost(provider, inputTokens, outputTokens);

  return db.lLMUsage.create({
    data: {
      provider,
      modelId,
      featureType,
      teacherId,
      inputTokens,
      outputTokens,
      totalTokens,
      costUsd,
      responseTimeMs,
      success,
      errorMessage,
      failoverFrom,
    },
  });
}

export async function trackFailure(input: {
  provider: ProviderName;
  modelId: string;
  featureType: FeatureType;
  teacherId?: string;
  errorMessage: string;
  responseTimeMs: number;
}) {
  return db.lLMUsage.create({
    data: {
      provider: input.provider,
      modelId: input.modelId,
      featureType: input.featureType,
      teacherId: input.teacherId,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      costUsd: 0,
      responseTimeMs: input.responseTimeMs,
      success: false,
      errorMessage: input.errorMessage,
    },
  });
}

interface UsageStats {
  totalRequests: number;
  successfulRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  avgResponseTimeMs: number;
  successRate: number;
}

export async function getUsageStats(options: {
  startDate: Date;
  endDate: Date;
  provider?: ProviderName;
  featureType?: FeatureType;
  teacherId?: string;
}): Promise<UsageStats> {
  const { startDate, endDate, provider, featureType, teacherId } = options;

  const where = {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
    ...(provider && { provider }),
    ...(featureType && { featureType }),
    ...(teacherId && { teacherId }),
  };

  const aggregate = await db.lLMUsage.aggregate({
    where,
    _count: { id: true },
    _sum: {
      inputTokens: true,
      outputTokens: true,
      costUsd: true,
      responseTimeMs: true,
    },
  });

  const successCount = await db.lLMUsage.count({
    where: { ...where, success: true },
  });

  const totalRequests = aggregate._count.id || 0;

  return {
    totalRequests,
    successfulRequests: successCount,
    totalInputTokens: aggregate._sum.inputTokens || 0,
    totalOutputTokens: aggregate._sum.outputTokens || 0,
    totalCostUsd: aggregate._sum.costUsd || 0,
    avgResponseTimeMs: totalRequests > 0
      ? (aggregate._sum.responseTimeMs || 0) / totalRequests
      : 0,
    successRate: totalRequests > 0 ? successCount / totalRequests : 1,
  };
}

export async function getUsageStatsByProvider(options: {
  startDate: Date;
  endDate: Date;
}): Promise<Record<ProviderName, UsageStats>> {
  const providers: ProviderName[] = ['anthropic', 'openai', 'google', 'ollama'];
  const result: Partial<Record<ProviderName, UsageStats>> = {};

  await Promise.all(
    providers.map(async (provider) => {
      result[provider] = await getUsageStats({ ...options, provider });
    })
  );

  return result as Record<ProviderName, UsageStats>;
}

export async function getUsageStatsByFeature(options: {
  startDate: Date;
  endDate: Date;
}): Promise<Record<FeatureType, UsageStats>> {
  const features: FeatureType[] = [
    'learning_analysis',
    'counseling_suggest',
    'report_generate',
    'face_analysis',
    'palm_analysis',
    'personality_summary',
  ];
  const result: Partial<Record<FeatureType, UsageStats>> = {};

  await Promise.all(
    features.map(async (featureType) => {
      result[featureType] = await getUsageStats({ ...options, featureType });
    })
  );

  return result as Record<FeatureType, UsageStats>;
}

export async function getCurrentPeriodCost(period: 'daily' | 'weekly' | 'monthly'): Promise<number> {
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case 'daily':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'weekly':
      const dayOfWeek = now.getDay();
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
      break;
    case 'monthly':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
  }

  const aggregate = await db.lLMUsage.aggregate({
    where: {
      createdAt: { gte: startDate },
    },
    _sum: { costUsd: true },
  });

  return aggregate._sum.costUsd || 0;
}
