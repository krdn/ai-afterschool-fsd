"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { FairnessMetrics } from "@/features/matching"
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
} from "lucide-react"

interface FairnessMetricsPanelProps {
  metrics: FairnessMetrics
}

/**
 * 공정성 메트릭 시각화 패널
 *
 * 3개의 공정성 메트릭을 카드 형태로 표시하고 개선 제안을 제공합니다.
 */
export function FairnessMetricsPanel({ metrics }: FairnessMetricsPanelProps) {
  return (
    <div className="space-y-6">
      {/* 메트릭 카드 그리드 */}
      <div className="grid gap-4 md:grid-cols-3">
        <DisparityIndexCard value={metrics.disparityIndex} />
        <ABROCACard value={metrics.abroca} />
        <DistributionBalanceCard value={metrics.distributionBalance} />
      </div>

      {/* 추천 사항 섹션 */}
      <RecommendationsSection recommendations={metrics.recommendations} />
    </div>
  )
}

/**
 * Disparity Index 카드
 */
function DisparityIndexCard({ value }: { value: number }) {
  const status = getDisparityStatus(value)

  return (
    <Card data-testid="fairness-metric">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground" data-testid="metric-label">
          집단 간 궁합 점수 차이
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <span className={`text-2xl font-bold ${status.colorClass}`} data-testid="metric-value gini-coefficient">
            {value.toFixed(3)}
          </span>
          <StatusBadge status={status} />
        </div>
        <Progress
          value={value * 100}
          className="mt-3"
          // Custom styling based on status
          style={
            {
              "--progress-indicator-color": status.progressColor,
            } as React.CSSProperties
          }
        />
        <p className="mt-2 text-xs text-muted-foreground">
          학교별 평균 궁합 점수의 차이 (0 = 공정, 1 = 불공정)
        </p>
      </CardContent>
    </Card>
  )
}

/**
 * ABROCA 카드
 */
function ABROCACard({ value }: { value: number }) {
  const status = getABROCAStatus(value)

  return (
    <Card data-testid="fairness-metric">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground" data-testid="metric-label">
          궁합 점수 분포 편향
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <span className={`text-2xl font-bold ${status.colorClass}`} data-testid="metric-value">
            {value.toFixed(3)}
          </span>
          <StatusBadge status={status} />
        </div>
        <Progress
          value={value * 100}
          className="mt-3"
          style={
            {
              "--progress-indicator-color": status.progressColor,
            } as React.CSSProperties
          }
        />
        <p className="mt-2 text-xs text-muted-foreground">
          점수 분포의 균등성 (0 = 균등, 1 = 편향)
        </p>
      </CardContent>
    </Card>
  )
}

/**
 * Distribution Balance 카드
 */
function DistributionBalanceCard({ value }: { value: number }) {
  const status = getDistributionBalanceStatus(value)

  return (
    <Card data-testid="fairness-metric">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground" data-testid="metric-label">
          선생님별 배정 균형
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <span className={`text-2xl font-bold ${status.colorClass}`} data-testid="metric-value">
            {value.toFixed(3)}
          </span>
          <StatusBadge status={status} />
        </div>
        <Progress
          value={value * 100}
          className="mt-3"
          style={
            {
              "--progress-indicator-color": status.progressColor,
            } as React.CSSProperties
          }
        />
        <p className="mt-2 text-xs text-muted-foreground">
          선생님별 학생 배정 균형 (1 = 균등, 0 = 불균형)
        </p>
      </CardContent>
    </Card>
  )
}

/**
 * 상태 뱃지 컴포넌트
 */
function StatusBadge({
  status,
}: {
  status: { label: string; colorClass: string }
}) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-medium ${status.colorClass}`}
    >
      {status.label}
    </span>
  )
}

/**
 * 추천 사항 섹션
 */
function RecommendationsSection({
  recommendations,
}: {
  recommendations: string[]
}) {
  return (
    <Card data-testid="fairness-suggestions">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Info className="h-5 w-5 text-blue-500" />
          개선 제안
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {recommendations.map((recommendation, index) => (
            <li key={index} className="flex items-start gap-3">
              <RecommendationIcon recommendation={recommendation} />
              <span className="text-foreground">{recommendation}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

/**
 * 추천 사항 아이콘
 */
function RecommendationIcon({ recommendation }: { recommendation: string }) {
  // 정상 메시지
  if (recommendation.includes("정상")) {
    return <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
  }

  // 경고 메시지
  if (recommendation.includes("불균형") || recommendation.includes("차이")) {
    return <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-500" />
  }

  // 오류 메시지
  if (recommendation.includes("편향") || recommendation.includes("검토")) {
    return <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
  }

  // 기본
  return <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
}

/**
 * Disparity Index 상태 계산
 */
function getDisparityStatus(value: number) {
  if (value < 0.2) {
    return {
      label: "양호",
      colorClass: "text-green-600",
      progressColor: "#16a34a",
    }
  }
  if (value < 0.4) {
    return {
      label: "주의",
      colorClass: "text-yellow-600",
      progressColor: "#ca8a04",
    }
  }
  return {
    label: "위험",
    colorClass: "text-red-600",
    progressColor: "#dc2626",
  }
}

/**
 * ABROCA 상태 계산
 */
function getABROCAStatus(value: number) {
  if (value < 0.3) {
    return {
      label: "양호",
      colorClass: "text-green-600",
      progressColor: "#16a34a",
    }
  }
  if (value < 0.5) {
    return {
      label: "주의",
      colorClass: "text-yellow-600",
      progressColor: "#ca8a04",
    }
  }
  return {
    label: "위험",
    colorClass: "text-red-600",
    progressColor: "#dc2626",
  }
}

/**
 * Distribution Balance 상태 계산
 */
function getDistributionBalanceStatus(value: number) {
  if (value > 0.7) {
    return {
      label: "양호",
      colorClass: "text-green-600",
      progressColor: "#16a34a",
    }
  }
  if (value > 0.5) {
    return {
      label: "주의",
      colorClass: "text-yellow-600",
      progressColor: "#ca8a04",
    }
  }
  return {
    label: "위험",
    colorClass: "text-red-600",
    progressColor: "#dc2626",
  }
}
