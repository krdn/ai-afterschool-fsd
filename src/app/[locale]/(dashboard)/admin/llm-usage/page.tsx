import { redirect } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { getCurrentPeriodCost } from "@/features/ai-engine";
import {
  getUsageStatsByProvider,
  getUsageStatsByFeature,
} from "@/features/ai-engine";
import { getBudgetSummary } from "@/features/ai-engine";
import { db } from "@/lib/db/client";
import {
  UsageCharts,
  type DailyUsageData,
  type ProviderUsageData,
  type FeatureUsageData,
} from "./usage-charts";
import { CostAlerts, CostSummaryCards } from "./cost-alerts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, DollarSign, Zap, Clock } from "lucide-react";
import type { ProviderName, FeatureType } from "@/features/ai-engine";

export const metadata = {
  title: "LLM 사용량 대시보드 | AI AfterSchool",
  description: "LLM 토큰 사용량 및 비용 추적 대시보드",
};

// 30일 일별 사용량 조회
async function getDailyUsageData(): Promise<DailyUsageData[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  try {
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
        COALESCE(SUM("inputTokens"), 0) as "inputTokens",
        COALESCE(SUM("outputTokens"), 0) as "outputTokens",
        COALESCE(SUM("costUsd"), 0) as "costUsd",
        COALESCE(SUM("responseTimeMs"), 0) as "totalResponseTimeMs"
      FROM "LLMUsage"
      WHERE "createdAt" >= '${startDate.toISOString()}'
        AND "createdAt" <= '${endDate.toISOString()}'
      GROUP BY DATE("createdAt")
      ORDER BY DATE("createdAt") ASC
    `);

    return dailyData.map((row) => ({
      date: row.date.toISOString().split("T")[0],
      requests: Number(row.requests),
      inputTokens: Number(row.inputTokens),
      outputTokens: Number(row.outputTokens),
      costUsd: Number(row.costUsd) || 0,
      avgResponseTimeMs:
        Number(row.requests) > 0
          ? Number(row.totalResponseTimeMs) / Number(row.requests)
          : 0,
    }));
  } catch (error) {
    console.error("Failed to fetch daily usage data:", error);
    return [];
  }
}

// 제공자별 사용량 조회
async function getProviderUsageData(): Promise<ProviderUsageData[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  try {
    const stats = await getUsageStatsByProvider({ startDate, endDate });

    const providers: ProviderName[] = ["anthropic", "openai", "google", "ollama"];
    return providers.map((provider) => ({
      provider,
      totalRequests: stats[provider]?.totalRequests || 0,
      totalCostUsd: stats[provider]?.totalCostUsd || 0,
      successRate: stats[provider]?.successRate || 1,
    }));
  } catch (error) {
    console.error("Failed to fetch provider usage data:", error);
    return [];
  }
}

// 기능별 사용량 조회
async function getFeatureUsageData(): Promise<FeatureUsageData[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  try {
    const stats = await getUsageStatsByFeature({ startDate, endDate });

    const features: FeatureType[] = [
      "learning_analysis",
      "counseling_suggest",
      "report_generate",
      "face_analysis",
      "palm_analysis",
      "personality_summary",
    ];
    return features.map((featureType) => ({
      featureType,
      totalRequests: stats[featureType]?.totalRequests || 0,
      totalCostUsd: stats[featureType]?.totalCostUsd || 0,
    }));
  } catch (error) {
    console.error("Failed to fetch feature usage data:", error);
    return [];
  }
}

// 전체 통계 요약
async function getOverallStats() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  try {
    const aggregate = await db.lLMUsage.aggregate({
      where: {
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

    const successCount = await db.lLMUsage.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        success: true,
      },
    });

    const totalRequests = aggregate._count.id || 0;
    const totalTokens =
      (aggregate._sum.inputTokens || 0) + (aggregate._sum.outputTokens || 0);
    const totalCost = aggregate._sum.costUsd || 0;
    const avgResponseTime =
      totalRequests > 0
        ? (aggregate._sum.responseTimeMs || 0) / totalRequests
        : 0;
    const successRate = totalRequests > 0 ? successCount / totalRequests : 1;

    return {
      totalRequests,
      totalTokens,
      totalCost,
      avgResponseTime,
      successRate,
    };
  } catch (error) {
    console.error("Failed to fetch overall stats:", error);
    return {
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      avgResponseTime: 0,
      successRate: 1,
    };
  }
}

export default async function LLMUsagePage() {
  const session = await verifySession();
  if (!session || session.role !== "DIRECTOR") {
    redirect("/dashboard");
  }

  // 병렬로 데이터 조회
  const [
    dailyCost,
    weeklyCost,
    monthlyCost,
    dailyUsageData,
    providerUsageData,
    featureUsageData,
    budgetSummary,
    overallStats,
  ] = await Promise.all([
    getCurrentPeriodCost("daily"),
    getCurrentPeriodCost("weekly"),
    getCurrentPeriodCost("monthly"),
    getDailyUsageData(),
    getProviderUsageData(),
    getFeatureUsageData(),
    getBudgetSummary(),
    getOverallStats(),
  ]);

  return (
    <div className="container py-6 space-y-8" data-testid="admin-llm-usage-page">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold">LLM 사용량 대시보드</h1>
        <p className="text-muted-foreground">
          AI 분석 기능의 토큰 사용량 및 비용을 모니터링합니다.
        </p>
      </div>

      {/* 비용 요약 카드 */}
      <section>
        <CostSummaryCards
          dailyCost={dailyCost}
          weeklyCost={weeklyCost}
          monthlyCost={monthlyCost}
        />
      </section>

      {/* 전체 통계 카드 */}
      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 요청 수</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overallStats.totalRequests.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">최근 30일</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 토큰</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div data-testid="total-tokens" className="text-2xl font-bold">
              {formatTokenCount(overallStats.totalTokens)}
            </div>
            <p className="text-xs text-muted-foreground">최근 30일</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 비용</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div data-testid="estimated-cost" className="text-2xl font-bold">
              ${overallStats.totalCost.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">최근 30일</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균 응답시간</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatResponseTime(overallStats.avgResponseTime)}
            </div>
            <p className="text-xs text-muted-foreground">
              성공률 {(overallStats.successRate * 100).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </section>

      {/* 예산 현황 */}
      <section>
        <CostAlerts initialData={budgetSummary} />
      </section>

      {/* 차트 섹션 */}
      <section>
        <UsageCharts
          dailyData={dailyUsageData}
          providerData={providerUsageData}
          featureData={featureUsageData}
        />
      </section>
    </div>
  );
}

function formatTokenCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

function formatResponseTime(ms: number): string {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  return `${Math.round(ms)}ms`;
}
