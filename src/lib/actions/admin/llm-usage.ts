'use server';

import { verifySession } from '@/lib/dal';
import { getUsageStats, getUsageStatsByProvider, getUsageStatsByFeature, getCurrentPeriodCost } from '@/features/ai-engine';
import { getMonthlyAggregations, getMonthlyTotalCost, getYearlyCostTrend } from '@/features/ai-engine';
import { db } from '@/lib/db/client';
import type { ProviderName, FeatureType } from '@/features/ai-engine';
import { ok, fail, type ActionResult } from "@/lib/errors/action-result";

async function requireAuth() {
  const session = await verifySession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}

async function requireDirector() {
  const session = await verifySession();
  if (!session || session.role !== 'DIRECTOR') {
    throw new Error('Unauthorized: DIRECTOR role required');
  }
  return session;
}

// =============================================================================
// 사용량 통계 조회 Actions
// =============================================================================

export interface UsageStatsResult {
  totalRequests: number;
  successfulRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  avgResponseTimeMs: number;
  successRate: number;
}

export interface GetUsageStatsActionInput {
  startDate: Date;
  endDate: Date;
  provider?: ProviderName;
  featureType?: FeatureType;
}

/**
 * 사용량 통계 조회
 * - 기간, 제공자, 기능별 필터링 가능
 */
export async function getUsageStatsAction(
  input: GetUsageStatsActionInput
): Promise<ActionResult<UsageStatsResult>> {
  try {
    await requireAuth();

    const stats = await getUsageStats({
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      provider: input.provider,
      featureType: input.featureType,
    });

    return ok(stats);
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * 제공자별 사용량 통계 조회
 */
export async function getUsageStatsByProviderAction(input: {
  startDate: Date;
  endDate: Date;
}): Promise<ActionResult<Record<ProviderName, UsageStatsResult>>> {
  try {
    await requireAuth();

    const stats = await getUsageStatsByProvider({
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
    });

    return ok(stats);
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * 기능별 사용량 통계 조회
 */
export async function getUsageStatsByFeatureAction(input: {
  startDate: Date;
  endDate: Date;
}): Promise<ActionResult<Record<FeatureType, UsageStatsResult>>> {
  try {
    await requireAuth();

    const stats = await getUsageStatsByFeature({
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
    });

    return ok(stats);
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Unknown error');
  }
}

// =============================================================================
// 일별 사용량 조회 Actions
// =============================================================================

export interface DailyUsageData {
  date: string; // YYYY-MM-DD
  requests: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  avgResponseTimeMs: number;
}

/**
 * 일별 사용량 데이터 조회
 * - 대시보드 차트용
 */
export async function getDailyUsageAction(input: {
  startDate: Date;
  endDate: Date;
  provider?: ProviderName;
  featureType?: FeatureType;
}): Promise<ActionResult<DailyUsageData[]>> {
  try {
    await requireAuth();

    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);

    // 일별 그룹화를 위해 raw query 사용
    const whereConditions: string[] = [
      `"createdAt" >= '${startDate.toISOString()}'`,
      `"createdAt" <= '${endDate.toISOString()}'`,
    ];

    if (input.provider) {
      whereConditions.push(`"provider" = '${input.provider}'`);
    }

    if (input.featureType) {
      whereConditions.push(`"featureType" = '${input.featureType}'`);
    }

    const whereClause = whereConditions.join(' AND ');

    const dailyData = await db.$queryRawUnsafe<
      {
        date: Date;
        requests: bigint;
        inputTokens: bigint;
        outputTokens: bigint;
        costUsd: number;
        totalResponseTimeMs: bigint;
      }[]
    >(`
      SELECT
        DATE("createdAt") as date,
        COUNT(*) as requests,
        SUM("inputTokens") as "inputTokens",
        SUM("outputTokens") as "outputTokens",
        SUM("costUsd") as "costUsd",
        SUM("responseTimeMs") as "totalResponseTimeMs"
      FROM "LLMUsage"
      WHERE ${whereClause}
      GROUP BY DATE("createdAt")
      ORDER BY DATE("createdAt") ASC
    `);

    const result: DailyUsageData[] = dailyData.map((row) => ({
      date: row.date.toISOString().split('T')[0],
      requests: Number(row.requests),
      inputTokens: Number(row.inputTokens),
      outputTokens: Number(row.outputTokens),
      costUsd: row.costUsd || 0,
      avgResponseTimeMs:
        Number(row.requests) > 0
          ? Number(row.totalResponseTimeMs) / Number(row.requests)
          : 0,
    }));

    return ok(result);
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Unknown error');
  }
}

// =============================================================================
// 현재 기간 비용 조회 Actions
// =============================================================================

/**
 * 현재 기간 비용 조회
 * - 일별, 주별, 월별 선택 가능
 */
export async function getCurrentPeriodCostAction(
  period: 'daily' | 'weekly' | 'monthly'
): Promise<ActionResult<number>> {
  try {
    await requireAuth();
    const cost = await getCurrentPeriodCost(period);
    return ok(cost);
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Unknown error');
  }
}

// =============================================================================
// 월별 집계 조회 Actions
// =============================================================================

export interface MonthlyAggregation {
  id: string;
  year: number;
  month: number;
  provider: string;
  featureType: string;
  totalRequests: number;
  totalInputTokens: bigint;
  totalOutputTokens: bigint;
  totalCostUsd: number;
  avgResponseTimeMs: number;
  successRate: number;
}

/**
 * 월별 집계 데이터 조회
 */
export async function getMonthlyAggregationsAction(input: {
  year?: number;
  month?: number;
  provider?: ProviderName;
  featureType?: FeatureType;
  limit?: number;
}): Promise<ActionResult<MonthlyAggregation[]>> {
  try {
    await requireAuth();

    const data = await getMonthlyAggregations({
      year: input.year,
      month: input.month,
      provider: input.provider,
      featureType: input.featureType,
      limit: input.limit,
    });

    return ok(data);
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * 월별 총 비용 조회
 */
export async function getMonthlyTotalCostAction(input: {
  year: number;
  month: number;
}): Promise<ActionResult<number>> {
  try {
    await requireAuth();
    const cost = await getMonthlyTotalCost(input.year, input.month);
    return ok(cost);
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * 연간 비용 추이 조회
 */
export async function getYearlyCostTrendAction(input: {
  year: number;
}): Promise<ActionResult<{ month: number; cost: number }[]>> {
  try {
    await requireAuth();
    const trend = await getYearlyCostTrend(input.year);
    return ok(trend);
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Unknown error');
  }
}

// =============================================================================
// 예산 관련 Actions
// =============================================================================

export interface BudgetStatus {
  period: string;
  budgetUsd: number;
  currentCostUsd: number;
  usagePercent: number;
  isOverBudget: boolean;
  alertThreshold: number | null;
}

/**
 * 예산 현황 조회
 */
export async function getBudgetStatusAction(): Promise<ActionResult<BudgetStatus[]>> {
  try {
    await requireAuth();

    const budgets = await db.lLMBudget.findMany();
    const result: BudgetStatus[] = [];

    for (const budget of budgets) {
      let currentCost: number;

      switch (budget.period) {
        case 'daily':
          currentCost = await getCurrentPeriodCost('daily');
          break;
        case 'weekly':
          currentCost = await getCurrentPeriodCost('weekly');
          break;
        case 'monthly':
          currentCost = await getCurrentPeriodCost('monthly');
          break;
        default:
          currentCost = 0;
      }

      const usagePercent = budget.budgetUsd > 0 ? (currentCost / budget.budgetUsd) * 100 : 0;
      const isOverBudget = usagePercent >= 100;

      let alertThreshold: number | null = null;
      if (budget.alertAt100 && usagePercent >= 100) {
        alertThreshold = 100;
      } else if (budget.alertAt80 && usagePercent >= 80) {
        alertThreshold = 80;
      }

      result.push({
        period: budget.period,
        budgetUsd: budget.budgetUsd,
        currentCostUsd: currentCost,
        usagePercent,
        isOverBudget,
        alertThreshold,
      });
    }

    return ok(result);
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Unknown error');
  }
}

// =============================================================================
// 최근 사용량 기록 조회 (DIRECTOR 전용)
// =============================================================================

export interface RecentUsageRecord {
  id: string;
  provider: string;
  modelId: string;
  featureType: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  responseTimeMs: number;
  success: boolean;
  errorMessage: string | null;
  failoverFrom: string | null;
  createdAt: Date;
}

/**
 * 최근 사용량 기록 조회 (DIRECTOR 전용)
 */
export async function getRecentUsageRecordsAction(input: {
  limit?: number;
  provider?: ProviderName;
  featureType?: FeatureType;
  success?: boolean;
}): Promise<ActionResult<RecentUsageRecord[]>> {
  try {
    await requireDirector();

    const { limit = 50, provider, featureType, success } = input;

    const records = await db.lLMUsage.findMany({
      where: {
        ...(provider && { provider }),
        ...(featureType && { featureType }),
        ...(success !== undefined && { success }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return ok(records);
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Unknown error');
  }
}
