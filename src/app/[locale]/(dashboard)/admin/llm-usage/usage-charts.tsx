"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

// 색상 팔레트
const PROVIDER_COLORS: Record<string, string> = {
  anthropic: "#D97706", // amber
  openai: "#10B981", // emerald
  google: "#3B82F6", // blue
  ollama: "#8B5CF6", // violet
};

const FEATURE_COLORS: Record<string, string> = {
  learning_analysis: "#3B82F6",
  counseling_suggest: "#10B981",
  report_generate: "#F59E0B",
  face_analysis: "#EF4444",
  palm_analysis: "#8B5CF6",
  personality_summary: "#EC4899",
};

const FEATURE_LABELS: Record<string, string> = {
  learning_analysis: "학습 분석",
  counseling_suggest: "상담 제안",
  report_generate: "리포트 생성",
  face_analysis: "얼굴 분석",
  palm_analysis: "손금 분석",
  personality_summary: "성향 요약",
};

// =============================================================================
// Types
// =============================================================================

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

// =============================================================================
// Daily Cost Trend Chart
// =============================================================================

interface DailyCostChartProps {
  data: DailyUsageData[];
  loading?: boolean;
}

export function DailyCostChart({ data, loading = false }: DailyCostChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>일별 비용 추이</CardTitle>
          <CardDescription>최근 30일간 LLM 사용 비용</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[300px] bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>일별 비용 추이</CardTitle>
          <CardDescription>최근 30일간 LLM 사용 비용</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            아직 사용량 데이터가 없습니다
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>일별 비용 추이</CardTitle>
        <CardDescription>최근 30일간 LLM 사용 비용</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => {
                const parts = value.split("-");
                return `${parts[1]}/${parts[2]}`;
              }}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `$${value.toFixed(2)}`}
            />
            <Tooltip
              formatter={(value) => [`$${(value as number)?.toFixed(4) ?? "0"}`, "비용"]}
              labelFormatter={(label) => {
                const parts = String(label).split("-");
                return `${parts[0]}년 ${parts[1]}월 ${parts[2]}일`;
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="costUsd"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 6 }}
              name="비용 (USD)"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Daily Requests Chart
// =============================================================================

interface DailyRequestsChartProps {
  data: DailyUsageData[];
  loading?: boolean;
}

export function DailyRequestsChart({
  data,
  loading = false,
}: DailyRequestsChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>일별 요청 수</CardTitle>
          <CardDescription>최근 30일간 API 요청 횟수</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[300px] bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>일별 요청 수</CardTitle>
          <CardDescription>최근 30일간 API 요청 횟수</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            아직 사용량 데이터가 없습니다
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>일별 요청 수</CardTitle>
        <CardDescription>최근 30일간 API 요청 횟수</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => {
                const parts = value.split("-");
                return `${parts[1]}/${parts[2]}`;
              }}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value) => [value as number, "요청"]}
              labelFormatter={(label) => {
                const parts = String(label).split("-");
                return `${parts[0]}년 ${parts[1]}월 ${parts[2]}일`;
              }}
            />
            <Legend />
            <Bar dataKey="requests" fill="#10B981" name="요청 수" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Provider Distribution Chart (Pie)
// =============================================================================

interface ProviderDistributionChartProps {
  data: ProviderUsageData[];
  loading?: boolean;
}

export function ProviderDistributionChart({
  data,
  loading = false,
}: ProviderDistributionChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>제공자별 사용 비율</CardTitle>
          <CardDescription>LLM 제공자별 요청 분포</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[300px] bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  const chartData = data.filter((d) => d.totalRequests > 0);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>제공자별 사용 비율</CardTitle>
          <CardDescription>LLM 제공자별 요청 분포</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            아직 사용량 데이터가 없습니다
          </div>
        </CardContent>
      </Card>
    );
  }

  const PROVIDER_NAMES: Record<string, string> = {
    anthropic: "Anthropic",
    openai: "OpenAI",
    google: "Google",
    ollama: "Ollama",
  };

  return (
    <Card data-testid="model-breakdown">
      <CardHeader>
        <CardTitle>제공자별 사용 비율</CardTitle>
        <CardDescription>LLM 제공자별 요청 분포</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) =>
                `${PROVIDER_NAMES[name as string] || name} (${((percent ?? 0) * 100).toFixed(0)}%)`
              }
              outerRadius={100}
              fill="#8884d8"
              dataKey="totalRequests"
              nameKey="provider"
            >
              {chartData.map((entry) => (
                <Cell
                  key={`cell-${entry.provider}`}
                  fill={PROVIDER_COLORS[entry.provider] || "#6B7280"}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [
                value as number,
                `${PROVIDER_NAMES[name as string] || name} 요청`,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Feature Usage Bar Chart
// =============================================================================

interface FeatureUsageChartProps {
  data: FeatureUsageData[];
  loading?: boolean;
}

export function FeatureUsageChart({
  data,
  loading = false,
}: FeatureUsageChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>기능별 사용량</CardTitle>
          <CardDescription>AI 기능별 요청 및 비용</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[300px] bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  const chartData = data
    .filter((d) => d.totalRequests > 0)
    .map((d) => ({
      ...d,
      name: FEATURE_LABELS[d.featureType] || d.featureType,
    }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>기능별 사용량</CardTitle>
          <CardDescription>AI 기능별 요청 및 비용</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            아직 사용량 데이터가 없습니다
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="feature-breakdown">
      <CardHeader>
        <CardTitle>기능별 사용량</CardTitle>
        <CardDescription>AI 기능별 요청 및 비용</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis
              dataKey="name"
              type="category"
              tick={{ fontSize: 12 }}
              width={70}
            />
            <Tooltip
              formatter={(value, name) => {
                const numValue = value as number;
                const strName = name as string;
                if (strName === "비용 (USD)") {
                  return [`$${numValue.toFixed(4)}`, strName];
                }
                return [numValue, strName];
              }}
            />
            <Legend />
            <Bar dataKey="totalRequests" fill="#3B82F6" name="요청 수" />
            <Bar dataKey="totalCostUsd" fill="#F59E0B" name="비용 (USD)" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Token Usage Chart
// =============================================================================

interface TokenUsageChartProps {
  data: DailyUsageData[];
  loading?: boolean;
}

export function TokenUsageChart({
  data,
  loading = false,
}: TokenUsageChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>토큰 사용량 추이</CardTitle>
          <CardDescription>입력/출력 토큰 사용량</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full h-[300px] bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>토큰 사용량 추이</CardTitle>
          <CardDescription>입력/출력 토큰 사용량</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            아직 사용량 데이터가 없습니다
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>토큰 사용량 추이</CardTitle>
        <CardDescription>입력/출력 토큰 사용량</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => {
                const parts = value.split("-");
                return `${parts[1]}/${parts[2]}`;
              }}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => {
                if (value >= 1000000) {
                  return `${(value / 1000000).toFixed(1)}M`;
                }
                if (value >= 1000) {
                  return `${(value / 1000).toFixed(0)}K`;
                }
                return value.toString();
              }}
            />
            <Tooltip
              formatter={(value, name) => [
                (value as number).toLocaleString(),
                name as string,
              ]}
              labelFormatter={(label) => {
                const parts = String(label).split("-");
                return `${parts[0]}년 ${parts[1]}월 ${parts[2]}일`;
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="inputTokens"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="입력 토큰"
            />
            <Line
              type="monotone"
              dataKey="outputTokens"
              stroke="#10B981"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="출력 토큰"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// UsageCharts (Combined Export)
// =============================================================================

interface UsageChartsProps {
  dailyData: DailyUsageData[];
  providerData: ProviderUsageData[];
  featureData: FeatureUsageData[];
  loading?: boolean;
}

export function UsageCharts({
  dailyData,
  providerData,
  featureData,
  loading = false,
}: UsageChartsProps) {
  return (
    <div data-testid="usage-chart" className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <DailyCostChart data={dailyData} loading={loading} />
        <DailyRequestsChart data={dailyData} loading={loading} />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <ProviderDistributionChart data={providerData} loading={loading} />
        <FeatureUsageChart data={featureData} loading={loading} />
      </div>
      <TokenUsageChart data={dailyData} loading={loading} />
    </div>
  );
}
