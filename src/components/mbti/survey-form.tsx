"use client"

import { useForm, FormProvider } from "react-hook-form"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useMbtiAutosave } from "@/lib/hooks/use-mbti-autosave"
import { saveMbtiDraft, submitMbtiSurvey } from "@/lib/actions/student/mbti-survey"
import { ProgressIndicator } from "./progress-indicator"
import { QuestionGroup } from "./question-group"
import questions from "@/data/mbti/questions.json"

type FormData = {
  responses: Record<string, number>
}

const dimensionLabels = {
  EI: "외향(E) / 내향(I) - 에너지 방향",
  SN: "감각(S) / 직관(N) - 정보 인식",
  TF: "사고(T) / 감정(F) - 판단 기준",
  JP: "판단(J) / 인식(P) - 생활 양식"
}

export function MbtiSurveyForm({ studentId, initialDraft }: {
  studentId: string
  initialDraft?: Record<string, number>
}) {
  const router = useRouter()
  const [focusedQuestionId, setFocusedQuestionId] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [unansweredIds, setUnansweredIds] = useState<Set<number>>(new Set())

  const methods = useForm<FormData>({
    defaultValues: {
      responses: initialDraft || {}
    }
  })

  const { cancelAutosave } = useMbtiAutosave(
    studentId,
    async (responses) => {
      await saveMbtiDraft(studentId, responses)
    },
    methods.watch
  )

  useEffect(() => {
    function handleKeyPress(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (focusedQuestionId === null) return

      const key = parseInt(e.key)
      if (key >= 1 && key <= 5) {
        methods.setValue(`responses.${focusedQuestionId}`, key, { shouldDirty: true })
        
        if (focusedQuestionId < 60) {
          setFocusedQuestionId(focusedQuestionId + 1)
          document.getElementById(`question-${focusedQuestionId + 1}`)?.scrollIntoView({
            behavior: "smooth",
            block: "center"
          })
        }
        e.preventDefault()
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [focusedQuestionId, methods])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting)
        if (visible.length > 0) {
          const centered = visible.reduce((prev, curr) => {
            return curr.intersectionRatio > prev.intersectionRatio ? curr : prev
          })
          const id = parseInt(centered.target.id.replace("question-", ""))
          setFocusedQuestionId(id)
        }
      },
      { threshold: 0.5, rootMargin: "-20% 0px -20% 0px" }
    )

    questions.forEach(q => {
      const el = document.getElementById(`question-${q.id}`)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  // 응답이 변경될 때 unansweredIds 업데이트
  const responses = methods.watch("responses")
  useEffect(() => {
    if (unansweredIds.size > 0 && responses) {
      const stillUnanswered = new Set<number>()
      for (const id of unansweredIds) {
        if (responses[id] === undefined) {
          stillUnanswered.add(id)
        }
      }
      setUnansweredIds(stillUnanswered)
    }
  }, [responses, unansweredIds])

  const onSubmit = useCallback(async (data: FormData) => {
    const unanswered = questions.filter(q => data.responses[q.id] === undefined)
    if (unanswered.length > 0) {
      // unanswered 문항 ID 목록을 설정하여 빨간 테두리 표시
      setUnansweredIds(new Set(unanswered.map(q => q.id)))
      document.getElementById(`question-${unanswered[0].id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      })
      return
    }

    // unanswered 상태 초기화
    setUnansweredIds(new Set())

    setIsSubmitting(true)
    cancelAutosave()

    try {
      const result = await submitMbtiSurvey(studentId, data.responses)
      if (result.success) {
        router.push(`/students/${studentId}`)
      }
    } catch (error) {
      console.error("Submit failed:", error)
    } finally {
      setIsSubmitting(false)
    }
  }, [studentId, cancelAutosave, router])

  const grouped = questions.reduce((acc, q) => {
    if (!acc[q.dimension]) acc[q.dimension] = []
    acc[q.dimension].push(q)
    return acc
  }, {} as Record<string, typeof questions>)

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8">
        <ProgressIndicator responses={methods.watch("responses")} total={60} />

        <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
          <p className="font-medium mb-1">키보드 단축키</p>
          <p>문항에 포커스된 상태에서 1~5 키를 눌러 빠르게 응답할 수 있습니다.</p>
        </div>

        {(["EI", "SN", "TF", "JP"] as const).map(dim => (
          <QuestionGroup
            key={dim}
            dimensionLabel={dimensionLabels[dim]}
            questions={grouped[dim] || []}
            focusedQuestionId={focusedQuestionId}
            unansweredIds={unansweredIds}
          />
        ))}

        <div className="sticky bottom-0 bg-white border-t py-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "제출 중..." : "설문 제출"}
          </button>
          <p className="text-sm text-gray-500 text-center mt-2">
            응답은 자동으로 저장됩니다.
          </p>
        </div>
      </form>
    </FormProvider>
  )
}
