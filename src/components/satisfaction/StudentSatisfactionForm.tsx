"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { recordSatisfactionAction } from "@/lib/actions/common/performance"
import { satisfactionSchema, type SatisfactionFormData } from "@/lib/validations/satisfaction"
import { toast } from "sonner"

interface StudentSatisfactionFormProps {
  studentId: string
  teacherId: string
  onSuccess?: () => void
}

const RATING_LEVELS = {
  LOW: { label: "불만족", min: 1, max: 3, color: "bg-red-100 text-red-800" },
  MEDIUM: { label: "보통", min: 4, max: 6, color: "bg-yellow-100 text-yellow-800" },
  HIGH: { label: "만족", min: 7, max: 8, color: "bg-blue-100 text-blue-800" },
  EXCELLENT: { label: "매우 만족", min: 9, max: 10, color: "bg-green-100 text-green-800" },
}

export function StudentSatisfactionForm({
  studentId,
  teacherId,
  onSuccess,
}: StudentSatisfactionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<SatisfactionFormData>({
    resolver: zodResolver(satisfactionSchema),
    defaultValues: {
      studentId,
      teacherId,
      surveyDate: new Date().toISOString().split("T")[0],
      overallSatisfaction: 7,
      teachingQuality: 7,
      communication: 7,
      supportLevel: 7,
      feedback: "",
    },
    mode: "onChange",
  })

  const onSubmit = async (data: SatisfactionFormData) => {
    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append("studentId", data.studentId)
      formData.append("teacherId", data.teacherId)
      formData.append("surveyDate", data.surveyDate)
      formData.append("overallSatisfaction", data.overallSatisfaction.toString())
      formData.append("teachingQuality", data.teachingQuality.toString())
      formData.append("communication", data.communication.toString())
      formData.append("supportLevel", data.supportLevel.toString())
      if (data.feedback) {
        formData.append("feedback", data.feedback)
      }

      const result = await recordSatisfactionAction(undefined, formData)

      if (result.success) {
        toast.success("만족도 조사가 완료되었습니다.")
        form.reset()
        onSuccess?.()
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      console.error("Satisfaction survey submission error:", error)
      toast.error("오류가 발생했습니다. 다시 시도해주세요.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const RatingSlider = ({
    label,
    name,
    description,
  }: {
    label: string
    name: "overallSatisfaction" | "teachingQuality" | "communication" | "supportLevel"
    description?: string
  }) => {
    const value = form.watch(name)

    const getLevel = (score: number) => {
      if (score <= 3) return RATING_LEVELS.LOW
      if (score <= 6) return RATING_LEVELS.MEDIUM
      if (score <= 8) return RATING_LEVELS.HIGH
      return RATING_LEVELS.EXCELLENT
    }

    const level = getLevel(value)

    return (
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label htmlFor={name} className="text-base font-medium">
              {label}
            </Label>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${level.color}`}
            >
              {level.label}
            </span>
          </div>
          {description && (
            <p className="text-sm text-gray-600 mb-3">{description}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 w-12">1</span>
          <input
            type="range"
            id={name}
            min={1}
            max={10}
            step={1}
            {...form.register(name, { valueAsNumber: true })}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <span className="text-sm text-gray-600 w-12 text-right">10</span>
          <span className="text-lg font-bold w-12 text-center">{value}</span>
        </div>

        <div className="flex justify-between text-xs text-gray-500 px-0">
          <span>불만족</span>
          <span>매우 만족</span>
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>학생 만족도 조사</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {form.formState.errors.root && (
            <div className="p-3 rounded-md bg-red-50 text-red-600 text-sm">
              {form.formState.errors.root.message}
            </div>
          )}

          <input type="hidden" {...form.register("studentId")} />
          <input type="hidden" {...form.register("teacherId")} />

          <div className="space-y-2">
            <Label htmlFor="surveyDate">조사일</Label>
            <input
              id="surveyDate"
              type="date"
              max={new Date().toISOString().split("T")[0]}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              {...form.register("surveyDate")}
            />
            {form.formState.errors.surveyDate && (
              <p className="text-sm text-red-600">
                {form.formState.errors.surveyDate.message}
              </p>
            )}
          </div>

          <div className="space-y-8">
            <RatingSlider
              name="overallSatisfaction"
              label="전반적 만족도"
              description="선생님의 전반적인 교육 활동에 대한 만족도"
            />

            <RatingSlider
              name="teachingQuality"
              label="교육 품질"
              description="수업 내용, 교재, 설명 등 교육의 질적 수준"
            />

            <RatingSlider
              name="communication"
              label="의사소통"
              description="질문에 대한 답변, 피드백, 상호작용의 효율성"
            />

            <RatingSlider
              name="supportLevel"
              label="지원 수준"
              description="학습 어려움에 대한 도움, 개인적인 관심"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback">자유 의견</Label>
            <textarea
              id="feedback"
              className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="추가 피드백이 있다면 자유롭게 작성해주세요 (선택사항)"
              {...form.register("feedback")}
            />
            <p className="text-xs text-gray-500">
              {form.watch("feedback")?.length || 0} / 500자
            </p>
            {form.formState.errors.feedback && (
              <p className="text-sm text-red-600">
                {form.formState.errors.feedback.message}
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "제출 중..." : "조사 제출"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
