"use client"

import { useForm, FormProvider } from "react-hook-form"
import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useVarkAutosave } from "@/lib/hooks/use-vark-autosave"
import { saveVarkDraft, submitVarkSurvey } from "@/lib/actions/student/vark-survey"
import questions from "@/data/vark/questions.json"

type FormData = {
  responses: Record<string, number>
}

const typeLabels: Record<string, { label: string; color: string }> = {
  V: { label: "시각형 (Visual)", color: "bg-blue-100 text-blue-800" },
  A: { label: "청각형 (Auditory)", color: "bg-green-100 text-green-800" },
  R: { label: "읽기쓰기형 (Read/Write)", color: "bg-amber-100 text-amber-800" },
  K: { label: "체험형 (Kinesthetic)", color: "bg-rose-100 text-rose-800" },
}

const scaleLabels = ["전혀 아님", "약간", "보통", "그런 편", "매우 그러함"]

export function VarkSurveyForm({ studentId, initialDraft }: {
  studentId: string
  initialDraft?: Record<string, number>
}) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [unansweredIds, setUnansweredIds] = useState<Set<number>>(new Set())

  const methods = useForm<FormData>({
    defaultValues: {
      responses: initialDraft || {},
    },
  })

  const { cancelAutosave } = useVarkAutosave(
    studentId,
    async (responses) => {
      await saveVarkDraft(studentId, responses)
    },
    methods.watch
  )

  const responses = methods.watch("responses")
  const answeredCount = Object.keys(responses || {}).length
  const progress = Math.round((answeredCount / 28) * 100)

  const handleSubmit = useCallback(async () => {
    const currentResponses = methods.getValues("responses")

    // 미답변 문항 확인
    const unanswered = new Set<number>()
    questions.forEach((q) => {
      if (currentResponses[q.id.toString()] === undefined) {
        unanswered.add(q.id)
      }
    })

    if (unanswered.size > 0) {
      setUnansweredIds(unanswered)
      // 첫 미답변 문항으로 스크롤
      const firstId = Math.min(...unanswered)
      document.getElementById(`question-${firstId}`)?.scrollIntoView({ behavior: "smooth", block: "center" })
      return
    }

    setIsSubmitting(true)
    cancelAutosave()

    try {
      const result = await submitVarkSurvey(studentId, currentResponses)
      if (result.success) {
        router.push(`/students/${studentId}`)
        router.refresh()
      }
    } catch (error) {
      console.error("Submit failed:", error)
      alert(error instanceof Error ? error.message : "제출에 실패했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }, [methods, studentId, router, cancelAutosave])

  // 유형별로 문항 그룹화
  const groupedQuestions = questions.reduce((groups, q) => {
    if (!groups[q.type]) groups[q.type] = []
    groups[q.type].push(q)
    return groups
  }, {} as Record<string, typeof questions>)

  return (
    <FormProvider {...methods}>
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit() }}>
        {/* 진행률 바 */}
        <div className="sticky top-0 z-10 bg-white border-b pb-3 mb-6">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>응답 진행률</span>
            <span>{answeredCount}/28 ({progress}%)</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-teal-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 유형별 문항 */}
        {(["V", "A", "R", "K"] as const).map((type) => (
          <div key={type} className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${typeLabels[type].color}`}>
                {typeLabels[type].label}
              </span>
              <span className="text-xs text-gray-500">{groupedQuestions[type]?.length ?? 0}문항</span>
            </div>
            <div className="space-y-4">
              {(groupedQuestions[type] ?? []).map((question) => {
                const value = responses?.[question.id.toString()]
                const isUnanswered = unansweredIds.has(question.id)

                return (
                  <div
                    key={question.id}
                    id={`question-${question.id}`}
                    className={`p-4 rounded-lg border transition-colors ${
                      isUnanswered ? "border-red-300 bg-red-50" : value !== undefined ? "border-green-200 bg-green-50/30" : "border-gray-200"
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-800 mb-3">
                      <span className="text-gray-400 mr-2">{question.id}.</span>
                      {question.text}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {[1, 2, 3, 4, 5].map((score) => (
                        <button
                          key={score}
                          type="button"
                          onClick={() => {
                            methods.setValue(`responses.${question.id}`, score)
                            setUnansweredIds((prev) => {
                              const next = new Set(prev)
                              next.delete(question.id)
                              return next
                            })
                          }}
                          className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                            value === score
                              ? "bg-teal-600 text-white border-teal-600"
                              : "bg-white text-gray-600 border-gray-300 hover:border-teal-400"
                          }`}
                        >
                          {score}
                        </button>
                      ))}
                      <span className="text-xs text-gray-400 ml-2">
                        {value !== undefined ? scaleLabels[value - 1] : ""}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* 제출 버튼 */}
        <div className="sticky bottom-0 bg-white border-t pt-4 pb-2">
          {unansweredIds.size > 0 && (
            <p className="text-sm text-red-600 mb-2">
              {unansweredIds.size}개 문항이 미응답입니다.
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 font-medium"
          >
            {isSubmitting ? "제출 중..." : "검사 결과 확인"}
          </button>
        </div>
      </form>
    </FormProvider>
  )
}
