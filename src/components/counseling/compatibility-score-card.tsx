"use client"

import { useState } from "react"
import { ChevronDown, Loader2, Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface CompatibilityScore {
  overallScore: number
  breakdown: Record<string, number>
  reasons: string[]
}

interface CompatibilityScoreCardProps {
  score: CompatibilityScore | null
  onCalculate?: () => void
  isCalculating?: boolean
}

function getScoreInterpretation(score: number): string {
  if (score >= 80) return "매우 좋은 궁합"
  if (score >= 70) return "좋은 궁합"
  if (score >= 60) return "보통 궁합"
  return "노력이 필요한 궁합"
}

function getTeachingTip(score: number): string | null {
  if (score < 60) return "이 학생과는 천천히 진행하며, 자주 피드백을 확인하세요."
  return null
}

// breakdown 키를 한글 라벨로 변환
function getBreakdownLabel(key: string): string {
  const labels: Record<string, string> = {
    mbti: "MBTI 궁합",
    saju: "사주 궁합",
    learningStyle: "학습스타일 궁합",
    communication: "소통 스타일",
    teachingStyle: "교수 방식",
  }
  return labels[key] || key
}

export function CompatibilityScoreCard({
  score,
  onCalculate,
  isCalculating = false,
}: CompatibilityScoreCardProps) {
  const [isOpen, setIsOpen] = useState(false)

  const teachingTip = score ? getTeachingTip(score.overallScore) : null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Users className="size-4" />
          선생님-학생 궁합
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {score ? (
          <>
            {/* 점수 표시 */}
            <div className="flex items-center gap-3">
              <span className="text-4xl font-bold">{score.overallScore}</span>
              <Badge
                variant={score.overallScore >= 70 ? "default" : "secondary"}
              >
                {getScoreInterpretation(score.overallScore)}
              </Badge>
            </div>

            {/* 세부 항목 Collapsible */}
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between px-0"
                >
                  세부 항목 보기
                  <ChevronDown
                    className={`size-4 transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2">
                {Object.entries(score.breakdown).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-muted-foreground">
                      {getBreakdownLabel(key)}
                    </span>
                    <span className="font-medium">{value}점</span>
                  </div>
                ))}
                {score.reasons.length > 0 && (
                  <div className="mt-3 space-y-1 border-t pt-3">
                    <p className="text-xs font-medium">분석 근거</p>
                    <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
                      {score.reasons.map((reason, idx) => (
                        <li key={idx}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* 상담 팁 Alert */}
            {teachingTip && (
              <Alert>
                <AlertTitle>상담 팁</AlertTitle>
                <AlertDescription>{teachingTip}</AlertDescription>
              </Alert>
            )}
          </>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              궁합 점수가 아직 계산되지 않았습니다
            </p>
            {onCalculate && (
              <Button
                variant="outline"
                size="sm"
                onClick={onCalculate}
                disabled={isCalculating}
              >
                {isCalculating ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    계산 중...
                  </>
                ) : (
                  "지금 계산하기"
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
