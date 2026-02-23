"use client";

import { useState, useEffect } from "react";
import { AlertCircle, AlertTriangle, Check, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { getBudgetStatusSummary } from "@/lib/actions/common/notifications";

interface BudgetStatus {
  period: string;
  budget: number;
  currentCost: number;
  percentUsed: number;
  isOverBudget: boolean;
  remaining: number;
}

interface CostAlertsProps {
  initialData?: BudgetStatus[];
}

const PERIOD_LABELS: Record<string, string> = {
  daily: "오늘",
  weekly: "이번 주",
  monthly: "이번 달",
};

const PERIOD_DESCRIPTIONS: Record<string, string> = {
  daily: "일별 예산 현황",
  weekly: "주별 예산 현황",
  monthly: "월별 예산 현황",
};

export function CostAlerts({ initialData }: CostAlertsProps) {
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus[]>(
    initialData || []
  );
  const [isLoading, setIsLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<string>("30d");

  useEffect(() => {
    if (!initialData) {
      fetchBudgetStatus();
    }
  }, [initialData]);

  const fetchBudgetStatus = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getBudgetStatusSummary();
      if (result.success) {
        setBudgetStatus(result.data);
      } else {
        setError(result.error ?? "예산 현황을 불러오는 중 오류가 발생했습니다.");
      }
    } catch {
      setError("예산 현황을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>예산 현황</CardTitle>
          <CardDescription>
            기간별 LLM 사용 비용 및 예산 대비 현황
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 bg-muted animate-pulse rounded-lg"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>예산 현황</CardTitle>
          <CardDescription>
            기간별 LLM 사용 비용 및 예산 대비 현황
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-6 text-red-500">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (budgetStatus.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>예산 현황</CardTitle>
          <CardDescription>
            기간별 LLM 사용 비용 및 예산 대비 현황
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>예산이 설정되지 않았습니다.</p>
            <p className="text-sm mt-1">
              LLM 설정에서 예산을 설정해주세요.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>예산 현황</CardTitle>
          <CardDescription>
            기간별 LLM 사용 비용 및 예산 대비 현황
          </CardDescription>
        </div>
        <div data-testid="date-range-selector" className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDateRange("7d")}
            className={`px-3 py-1 text-sm rounded ${
              dateRange === "7d"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            7일
          </button>
          <button
            type="button"
            onClick={() => setDateRange("30d")}
            className={`px-3 py-1 text-sm rounded ${
              dateRange === "30d"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            30일
          </button>
          <button
            type="button"
            onClick={() => setDateRange("90d")}
            className={`px-3 py-1 text-sm rounded ${
              dateRange === "90d"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            90일
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {budgetStatus.map((status) => (
            <BudgetCard key={status.period} status={status} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function BudgetCard({ status }: { status: BudgetStatus }) {
  const { period, budget, currentCost, percentUsed, isOverBudget, remaining } =
    status;

  const getStatusColor = () => {
    if (isOverBudget) return "border-red-300 bg-red-50 dark:bg-red-900/20";
    if (percentUsed >= 80)
      return "border-amber-300 bg-amber-50 dark:bg-amber-900/20";
    return "border-green-300 bg-green-50 dark:bg-green-900/20";
  };

  const getProgressColor = () => {
    if (isOverBudget) return "bg-red-500";
    if (percentUsed >= 80) return "bg-amber-500";
    return "bg-green-500";
  };

  const getStatusIcon = () => {
    if (isOverBudget) return <AlertCircle className="h-5 w-5 text-red-500" />;
    if (percentUsed >= 80)
      return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    return <Check className="h-5 w-5 text-green-500" />;
  };

  const getStatusText = () => {
    if (isOverBudget) return "예산 초과";
    if (percentUsed >= 80) return "주의 필요";
    return "정상";
  };

  // 예산이 0인 경우 (설정되지 않음)
  if (budget === 0) {
    return (
      <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h4 className="font-medium">
              {PERIOD_LABELS[period] || period}
            </h4>
            <p className="text-xs text-muted-foreground">
              {PERIOD_DESCRIPTIONS[period] || ""}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">${currentCost.toFixed(4)}</p>
            <p className="text-xs text-muted-foreground">사용 중</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          예산이 설정되지 않았습니다.
        </p>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-lg border ${getStatusColor()}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{PERIOD_LABELS[period] || period}</h4>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                isOverBudget
                  ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                  : percentUsed >= 80
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                  : "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
              }`}
            >
              {getStatusText()}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {PERIOD_DESCRIPTIONS[period] || ""}
          </p>
        </div>
        {getStatusIcon()}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>현재 사용량</span>
          <span className="font-medium">${currentCost.toFixed(4)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>예산</span>
          <span className="font-medium">${budget.toFixed(2)}</span>
        </div>

        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
          <div
            className={`h-2 rounded-full transition-all ${getProgressColor()}`}
            style={{ width: `${Math.min(100, percentUsed)}%` }}
          />
        </div>

        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{percentUsed.toFixed(1)}% 사용</span>
          {!isOverBudget && (
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              ${remaining.toFixed(4)} 남음
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Cost Summary Cards (대시보드 상단용)
// =============================================================================

interface CostSummaryCardsProps {
  dailyCost: number;
  weeklyCost: number;
  monthlyCost: number;
}

export function CostSummaryCards({
  dailyCost,
  weeklyCost,
  monthlyCost,
}: CostSummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <CostCard
        title="오늘 비용"
        value={dailyCost}
        description="오늘 누적 LLM 사용 비용"
      />
      <CostCard
        title="이번 주 비용"
        value={weeklyCost}
        description="이번 주 누적 LLM 사용 비용"
      />
      <CostCard
        title="이번 달 비용"
        value={monthlyCost}
        description="이번 달 누적 LLM 사용 비용"
      />
    </div>
  );
}

function CostCard({
  title,
  value,
  description,
}: {
  title: string;
  value: number;
  description: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          ${value.toFixed(4)}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}
