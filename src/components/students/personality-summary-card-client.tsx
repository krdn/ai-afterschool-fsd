"use client"

import { Button } from "@/components/ui/button"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { generateLearningStrategy } from "@/lib/actions/student/personality-integration"

/**
 * AI 통합 분석 생성 버튼 (Client Component)
 */
export function GenerateActionButton({ studentId }: { studentId: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleClick = () => {
    startTransition(async () => {
      const result = await generateLearningStrategy(studentId)

      if (result.success) {
        toast.success(result.data.message || "AI 분석을 시작했습니다.")
        // 페이지 새로고침으로 상태 업데이트 반영
        router.refresh()
      } else {
        toast.error(result.error || "AI 분석 시작에 실패했습니다.")
      }
    })
  }

  return (
    <Button
      onClick={handleClick}
      disabled={isPending}
      className="bg-blue-600 hover:bg-blue-700"
    >
      {isPending ? "생성 중..." : "AI 통합 분석 생성"}
    </Button>
  )
}
