"use client"

import { Brain } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface PersonalitySummaryCardProps {
  summary: string | null
  studentName: string
  hasAnalysisData: boolean
  onStartAnalysis?: () => void
}

export function PersonalitySummaryCard({
  summary,
  studentName,
  hasAnalysisData,
  onStartAnalysis,
}: PersonalitySummaryCardProps) {
  return (
    <Card className="bg-muted/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Brain className="size-4" />
          {studentName}의 성향
        </CardTitle>
      </CardHeader>
      <CardContent>
        {summary ? (
          <p className="text-sm text-muted-foreground">{summary}</p>
        ) : hasAnalysisData ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              분석 데이터는 있지만 요약이 생성되지 않았습니다.
            </p>
            {onStartAnalysis && (
              <Button
                variant="outline"
                size="sm"
                onClick={onStartAnalysis}
              >
                성향 요약 생성하기
              </Button>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            성향 분석이 아직 완료되지 않았습니다
          </p>
        )}
      </CardContent>
    </Card>
  )
}
