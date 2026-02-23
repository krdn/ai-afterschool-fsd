"use client"

import { useState } from "react"
import { Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  generateCounselingSummaryAction,
  generateCounselingSummaryFromContentAction,
} from "@/lib/actions/counseling/ai"

interface AISummaryGeneratorProps {
  sessionId?: string // 기존 상담 수정 시
  studentId?: string // 새 상담 작성 시
  content?: string // 새 상담 작성 시 - 현재 입력된 상담 내용
  sessionType?: string // 새 상담 작성 시 - 상담 유형
  onSummaryGenerated: (summary: string) => void
  disabled?: boolean
}

export function AISummaryGenerator({
  sessionId,
  studentId,
  content,
  sessionType,
  onSummaryGenerated,
  disabled = false,
}: AISummaryGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedSummary, setGeneratedSummary] = useState<string | null>(null)
  const [showRegenerate, setShowRegenerate] = useState(false)

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      let result: { success: boolean; data?: string; error?: string }

      if (sessionId) {
        // 기존 상담 수정: sessionId로 DB에서 내용 조회
        result = await generateCounselingSummaryAction(sessionId)
      } else if (studentId && content) {
        // 새 상담 작성: content를 직접 전달
        result = await generateCounselingSummaryFromContentAction(
          studentId,
          content,
          sessionType || "ACADEMIC"
        )
      } else {
        toast.error("상담 내용을 입력해주세요")
        setIsGenerating(false)
        return
      }

      if (result.success && result.data) {
        setGeneratedSummary(result.data)
        setShowRegenerate(true)
        toast.success("AI 요약이 생성되었습니다")
      } else {
        toast.error(result.error || "요약 생성에 실패했습니다")
      }
    } catch (error) {
      console.error("AI 요약 생성 중 오류:", error)
      toast.error("요약 생성 중 오류가 발생했습니다")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApply = () => {
    if (generatedSummary) {
      onSummaryGenerated(generatedSummary)
      toast.success("요약이 적용되었습니다")
    }
  }

  const handleRegenerate = () => {
    setGeneratedSummary(null)
    setShowRegenerate(false)
    handleGenerate()
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="size-4" />
          AI 요약 생성
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {generatedSummary ? (
          <>
            {/* 생성된 요약 표시 */}
            <div className="rounded-md border bg-muted/50 p-4">
              <p className="whitespace-pre-wrap text-sm">{generatedSummary}</p>
            </div>

            {/* 버튼 영역 */}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleApply} disabled={disabled}>
                요약 적용
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                disabled={disabled || isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  "다시 생성"
                )}
              </Button>
            </div>

            {/* 안내 문구 */}
            <p className="text-xs text-muted-foreground">
              적용 후에도 직접 수정할 수 있습니다
            </p>
          </>
        ) : (
          <>
            {/* 초기 상태 */}
            <p className="text-sm text-muted-foreground">
              상담 내용과 학생 성향을 고려한 요약을 생성합니다
            </p>
            <Button
              size="sm"
              onClick={handleGenerate}
              disabled={disabled || isGenerating || (!sessionId && (!studentId || !content || content.length < 10))}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  AI 요약 생성
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
