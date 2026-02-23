"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { PersonalitySummaryCard } from "@/components/counseling/PersonalitySummaryCard"
import { CompatibilityScoreCard } from "@/components/counseling/CompatibilityScoreCard"
import { AISummaryGenerator } from "@/components/counseling/AISummaryGenerator"
import {
  getStudentAISupportDataAction,
  type AISupportData,
} from "@/lib/actions/counseling/ai"
import { analyzeCompatibility } from "@/lib/actions/matching/compatibility"

interface AISupportPanelProps {
  studentId: string
  studentName: string
  teacherId: string // 현재 로그인한 선생님 ID
  sessionId?: string // 기존 상담 수정 시 전달
  content?: string // 새 상담 작성 시 - 현재 입력된 상담 내용
  sessionType?: string // 새 상담 작성 시 - 상담 유형
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onAISummaryApply?: (summary: string) => void
}

export function AISupportPanel({
  studentId,
  studentName,
  teacherId,
  sessionId,
  content,
  sessionType,
  isOpen,
  onOpenChange,
  onAISummaryApply,
}: AISupportPanelProps) {
  const router = useRouter()
  const [data, setData] = useState<AISupportData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)

  // 데이터 조회 (패널 열릴 때)
  useEffect(() => {
    if (isOpen && !data) {
      setIsLoading(true)
      getStudentAISupportDataAction(studentId)
        .then((result) => {
          if (result.success) {
            setData(result.data)
          } else {
            toast.error(result.error || "데이터 조회에 실패했습니다")
          }
        })
        .catch(() => {
          toast.error("데이터 조회 중 오류가 발생했습니다")
        })
        .finally(() => setIsLoading(false))
    }
  }, [isOpen, studentId, data])

  // 궁합 계산 핸들러
  const handleCalculateCompatibility = useCallback(async () => {
    if (isCalculating) return

    setIsCalculating(true)
    try {
      const result = await analyzeCompatibility(teacherId, studentId)

      if (result.success) {
        // 데이터 갱신 (CompatibilityScore.overall -> AISupportData.compatibility.overallScore)
        const { score } = result.data
        setData((prev) =>
          prev
            ? {
                ...prev,
                compatibility: {
                  overallScore: score.overall,
                  breakdown: score.breakdown as Record<string, number>,
                  reasons: score.reasons,
                },
                canCalculateCompatibility: false,
              }
            : null
        )
        toast.success("궁합 점수가 계산되었습니다")
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      console.error("궁합 계산 오류:", error)
      toast.error("궁합 점수 계산에 실패했습니다")
    } finally {
      setIsCalculating(false)
    }
  }, [teacherId, studentId, isCalculating])

  // 자동 궁합 계산 (궁합 점수가 없고 계산 가능할 때)
  useEffect(() => {
    if (data && !data.compatibility && data.canCalculateCompatibility && !isCalculating) {
      handleCalculateCompatibility()
    }
  }, [data, isCalculating, handleCalculateCompatibility])

  // 성향 분석 시작 핸들러 (학생 상세 페이지로 이동)
  const handleStartAnalysis = () => {
    router.push(`/students/${studentId}`)
    onOpenChange(false)
  }

  // AI 요약 적용 핸들러
  const handleSummaryGenerated = (summary: string) => {
    onAISummaryApply?.(summary)
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:w-[540px] overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>AI 상담 지원</SheetTitle>
          <SheetDescription>
            {studentName} 학생의 성향 분석과 궁합 점수를 참고하세요
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 mt-6">
            {/* 1. 성향 요약 */}
            <PersonalitySummaryCard
              summary={data?.personalitySummary ?? null}
              studentName={studentName}
              hasAnalysisData={data?.hasAnalysisData ?? false}
              onStartAnalysis={handleStartAnalysis}
            />

            {/* 2. 궁합 점수 */}
            <CompatibilityScoreCard
              score={data?.compatibility ?? null}
              onCalculate={handleCalculateCompatibility}
              isCalculating={isCalculating}
            />

            {/* 3. AI 요약 생성 */}
            <AISummaryGenerator
              sessionId={sessionId}
              studentId={studentId}
              content={content}
              sessionType={sessionType}
              onSummaryGenerated={handleSummaryGenerated}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
