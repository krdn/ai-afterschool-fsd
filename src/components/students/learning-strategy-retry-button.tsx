"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { generateLearningStrategy } from "@/lib/actions/student/personality-integration"

type Props = {
  studentId: string
}

export function LearningStrategyRetryButton({ studentId }: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleClick = () => {
    startTransition(async () => {
      const result = await generateLearningStrategy(studentId)
      if (result.success) {
        router.refresh()
      } else {
        alert(result.error || "다시 시도해주세요.")
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex items-center gap-2 px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? "처리 중..." : "다시 시도"}
    </button>
  )
}
