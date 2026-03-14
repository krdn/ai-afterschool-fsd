"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import type { CompatibilityBreakdown } from "@/features/analysis"

interface CompatibilityBarProps {
  label: string
  value: number
  max: number
  color: string
}

function CompatibilityBar({ label, value, max, color }: CompatibilityBarProps) {
  const percentage = (value / max) * 100

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium" data-testid={label === "MBTI" ? "mbti-compatibility" : label === "학습 스타일" ? "learning-style-compatibility" : undefined}>
          {value.toFixed(1)} / {max}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted">
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

interface CompatibilityScoreCardProps {
  score: number
  breakdown: CompatibilityBreakdown
  reasons: string[]
}

export function CompatibilityScoreCard({
  score: _score,
  breakdown,
  reasons,
}: CompatibilityScoreCardProps) {
  return (
    <Card className="h-full" data-testid="compatibility-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">궁합 상세 점수</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <CompatibilityBar
          label="MBTI"
          value={breakdown.mbti}
          max={25}
          color="#3b82f6"
        />
        <CompatibilityBar
          label="학습 스타일"
          value={breakdown.learningStyle}
          max={25}
          color="#10b981"
        />
        <CompatibilityBar
          label="사주"
          value={breakdown.saju}
          max={20}
          color="#8b5cf6"
        />
        <CompatibilityBar
          label="성명학"
          value={breakdown.name}
          max={15}
          color="#f59e0b"
        />
        <CompatibilityBar
          label="부하 분산"
          value={breakdown.loadBalance}
          max={15}
          color="#ef4444"
        />

        {reasons.length > 0 && (
          <div className="pt-3 border-t space-y-1">
            <h4 className="text-sm font-medium text-foreground">추천 이유</h4>
            <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
              {reasons.slice(0, 3).map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
