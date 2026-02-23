import { db } from '@/lib/db/client';
import type { ProviderName, FeatureType } from './providers';

const PROVIDERS: ProviderName[] = ['anthropic', 'openai', 'google', 'ollama'];
const FEATURES: FeatureType[] = [
  'learning_analysis',
  'counseling_suggest',
  'report_generate',
  'face_analysis',
  'palm_analysis',
  'personality_summary',
];

interface AggregationResult {
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
 * 월별 사용량 집계
 * - 각 제공자/기능별로 해당 월의 사용량을 집계하여 LLMUsageMonthly 테이블에 upsert
 *
 * @param year - 집계 대상 연도
 * @param month - 집계 대상 월 (1-12)
 * @returns 집계된 레코드 수
 */
export async function aggregateMonthlyUsage(
  year: number,
  month: number
): Promise<{ aggregated: number; records: AggregationResult[] }> {
  const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const results: AggregationResult[] = [];

  for (const provider of PROVIDERS) {
    for (const featureType of FEATURES) {
      // 해당 제공자/기능에 대한 월간 집계 쿼리
      const aggregate = await db.lLMUsage.aggregate({
        where: {
          provider,
          featureType,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: { id: true },
        _sum: {
          inputTokens: true,
          outputTokens: true,
          costUsd: true,
          responseTimeMs: true,
        },
      });

      // 성공 요청 수
      const successCount = await db.lLMUsage.count({
        where: {
          provider,
          featureType,
          success: true,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const totalRequests = aggregate._count.id || 0;

      // 데이터가 없으면 스킵
      if (totalRequests === 0) {
        continue;
      }

      const totalInputTokens = BigInt(aggregate._sum.inputTokens || 0);
      const totalOutputTokens = BigInt(aggregate._sum.outputTokens || 0);
      const totalCostUsd = aggregate._sum.costUsd || 0;
      const avgResponseTimeMs =
        totalRequests > 0
          ? (aggregate._sum.responseTimeMs || 0) / totalRequests
          : 0;
      const successRate = totalRequests > 0 ? successCount / totalRequests : 1;

      // LLMUsageMonthly 테이블에 upsert
      await db.lLMUsageMonthly.upsert({
        where: {
          year_month_provider_featureType: {
            year,
            month,
            provider,
            featureType,
          },
        },
        update: {
          totalRequests,
          totalInputTokens,
          totalOutputTokens,
          totalCostUsd,
          avgResponseTimeMs,
          successRate,
        },
        create: {
          year,
          month,
          provider,
          featureType,
          totalRequests,
          totalInputTokens,
          totalOutputTokens,
          totalCostUsd,
          avgResponseTimeMs,
          successRate,
        },
      });

      results.push({
        year,
        month,
        provider,
        featureType,
        totalRequests,
        totalInputTokens,
        totalOutputTokens,
        totalCostUsd,
        avgResponseTimeMs,
        successRate,
      });
    }
  }

  return { aggregated: results.length, records: results };
}

/**
 * 이전 달 사용량 집계 (가장 일반적인 cron 작업용)
 * @returns 집계 결과
 */
export async function aggregatePreviousMonth(): Promise<{
  year: number;
  month: number;
  aggregated: number;
  records: AggregationResult[];
}> {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth(); // 0-indexed, so this is previous month

  // 1월인 경우 이전 해 12월
  if (month === 0) {
    month = 12;
    year -= 1;
  }

  const result = await aggregateMonthlyUsage(year, month);
  return { year, month, ...result };
}

interface CleanupResult {
  deletedUsage: number;
  retainedMonthly: number;
}

/**
 * 오래된 사용량 데이터 정리
 * - LLMUsage 테이블에서 보존 기간 이전의 세부 데이터 삭제
 * - LLMUsageMonthly 테이블의 월별 집계 데이터는 유지
 *
 * @param retentionDays - 세부 데이터 보존 기간 (일), 기본 90일
 * @returns 삭제된 레코드 수
 */
export async function cleanupOldUsageData(
  retentionDays: number = 90
): Promise<CleanupResult> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  // 삭제 전 월별 집계 확인 (삭제 대상 기간의 데이터가 집계되었는지)
  const oldestData = await db.lLMUsage.findFirst({
    where: {
      createdAt: { lt: cutoffDate },
    },
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true },
  });

  if (oldestData) {
    // 삭제 대상 중 가장 오래된 데이터의 월부터 집계 확인
    const oldestDate = oldestData.createdAt;
    const cutoffMonth = cutoffDate.getMonth() + 1;
    const cutoffYear = cutoffDate.getFullYear();
    const oldestMonth = oldestDate.getMonth() + 1;
    const oldestYear = oldestDate.getFullYear();

    // 삭제 대상 기간의 각 월에 대해 집계가 있는지 확인하고 없으면 생성
    let currentYear = oldestYear;
    let currentMonth = oldestMonth;

    while (
      currentYear < cutoffYear ||
      (currentYear === cutoffYear && currentMonth <= cutoffMonth)
    ) {
      const existingAggregation = await db.lLMUsageMonthly.count({
        where: {
          year: currentYear,
          month: currentMonth,
        },
      });

      if (existingAggregation === 0) {
        // 집계가 없으면 생성
        await aggregateMonthlyUsage(currentYear, currentMonth);
      }

      // 다음 달로 이동
      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
    }
  }

  // 세부 데이터 삭제
  const deleted = await db.lLMUsage.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
    },
  });

  // 유지되는 월별 집계 수
  const retainedMonthly = await db.lLMUsageMonthly.count();

  return {
    deletedUsage: deleted.count,
    retainedMonthly,
  };
}

/**
 * 월별 집계 데이터 조회
 * @param options - 조회 옵션
 * @returns 월별 집계 데이터 목록
 */
export async function getMonthlyAggregations(options: {
  year?: number;
  month?: number;
  provider?: ProviderName;
  featureType?: FeatureType;
  limit?: number;
}) {
  const { year, month, provider, featureType, limit = 12 } = options;

  return db.lLMUsageMonthly.findMany({
    where: {
      ...(year !== undefined && { year }),
      ...(month !== undefined && { month }),
      ...(provider && { provider }),
      ...(featureType && { featureType }),
    },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    take: limit,
  });
}

/**
 * 월별 총 비용 조회
 * @param year - 연도
 * @param month - 월 (1-12)
 * @returns 해당 월의 총 비용
 */
export async function getMonthlyTotalCost(
  year: number,
  month: number
): Promise<number> {
  const aggregate = await db.lLMUsageMonthly.aggregate({
    where: {
      year,
      month,
    },
    _sum: {
      totalCostUsd: true,
    },
  });

  return aggregate._sum.totalCostUsd || 0;
}

/**
 * 연간 비용 추이 조회
 * @param year - 연도
 * @returns 월별 비용 배열
 */
export async function getYearlyCostTrend(
  year: number
): Promise<{ month: number; cost: number }[]> {
  const monthlyData = await db.lLMUsageMonthly.groupBy({
    by: ['month'],
    where: { year },
    _sum: { totalCostUsd: true },
    orderBy: { month: 'asc' },
  });

  return monthlyData.map((data) => ({
    month: data.month,
    cost: data._sum.totalCostUsd || 0,
  }));
}
