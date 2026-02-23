"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { recordCounselingAction } from "@/lib/actions/common/performance"
import { counselingSchema, type CounselingFormData } from "@/lib/validations/counseling"
import { toast } from "sonner"
import { AISupportPanel } from "./AISupportPanel"

interface CounselingSessionFormProps {
  studentId: string
  studentName: string
  teacherId: string
  sessionId?: string
  onSuccess?: () => void
}

export function CounselingSessionForm({
  studentId,
  studentName,
  teacherId,
  sessionId,
  onSuccess,
}: CounselingSessionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [followUpRequired, setFollowUpRequired] = useState(false)
  const [isPanelOpen, setIsPanelOpen] = useState(true)
  const [appliedAISummary, setAppliedAISummary] = useState<string | null>(null)

  const form = useForm<CounselingFormData>({
    resolver: zodResolver(counselingSchema),
    defaultValues: {
      studentId,
      sessionDate: new Date().toISOString().split("T")[0],
      duration: 30,
      type: "ACADEMIC",
      summary: "",
      followUpRequired: false,
      satisfactionScore: undefined,
    },
    mode: "onChange",
  })

  const handleFollowUpChange = (checked: boolean) => {
    setFollowUpRequired(checked)
    form.setValue("followUpRequired", checked)
    if (!checked) {
      form.setValue("followUpDate", undefined)
    }
  }

  const handleAISummaryApply = (aiSummary: string) => {
    setAppliedAISummary(aiSummary)
    const currentSummary = form.getValues("summary")
    const newSummary = aiSummary + (currentSummary ? `\n\n---\n\n${currentSummary}` : "")
    form.setValue("summary", newSummary, { shouldDirty: true })
    toast.success("AI 요약이 적용되었습니다. 필요시 수정하세요.")
    setIsPanelOpen(false)
  }

  const onSubmit = async (data: CounselingFormData) => {
    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append("studentId", data.studentId)
      formData.append("sessionDate", data.sessionDate)
      formData.append("duration", data.duration.toString())
      formData.append("type", data.type)
      formData.append("summary", data.summary)
      formData.append("followUpRequired", data.followUpRequired ? "true" : "false")
      if (data.followUpDate) {
        formData.append("followUpDate", data.followUpDate)
      }
      if (data.satisfactionScore !== undefined) {
        formData.append("satisfactionScore", data.satisfactionScore.toString())
      }
      if (appliedAISummary) {
        formData.append("aiSummary", appliedAISummary)
      }

      const result = await recordCounselingAction(undefined, formData)

      if (result.success) {
        toast.success("상담 기록이 완료되었습니다.")
        form.reset()
        onSuccess?.()
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      console.error("Counseling session creation error:", error)
      toast.error("오류가 발생했습니다. 다시 시도해주세요.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>상담 기록</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsPanelOpen(true)}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            AI 지원
          </Button>
        </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {form.formState.errors.root && (
            <div className="p-3 rounded-md bg-red-50 text-red-600 text-sm">
              {form.formState.errors.root.message}
            </div>
          )}

          <input type="hidden" {...form.register("studentId")} />

          <div className="space-y-2">
            <Label htmlFor="sessionDate">상담일 *</Label>
            <Input
              id="sessionDate"
              type="date"
              max={new Date().toISOString().split("T")[0]}
              {...form.register("sessionDate")}
            />
            {form.formState.errors.sessionDate && (
              <p className="text-sm text-red-600">
                {form.formState.errors.sessionDate.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">상담 시간 (분) *</Label>
            <Input
              id="duration"
              type="number"
              min={5}
              max={180}
              {...form.register("duration", { valueAsNumber: true })}
            />
            {form.formState.errors.duration && (
              <p className="text-sm text-red-600">
                {form.formState.errors.duration.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">상담 유형 *</Label>
            <Select
              value={form.watch("type")}
              onValueChange={(value) =>
                form.setValue("type", value as "ACADEMIC" | "CAREER" | "PSYCHOLOGICAL" | "BEHAVIORAL", { shouldDirty: true })
              }
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="상담 유형을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACADEMIC">학업 상담</SelectItem>
                <SelectItem value="CAREER">진로 상담</SelectItem>
                <SelectItem value="PSYCHOLOGICAL">심리 상담</SelectItem>
                <SelectItem value="BEHAVIORAL">행동 상담</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.type && (
              <p className="text-sm text-red-600">
                {form.formState.errors.type.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">상담 내용 요약 *</Label>
            <textarea
              id="summary"
              className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="상담 내용을 10-1000자로 요약해주세요"
              {...form.register("summary")}
            />
            <p className="text-xs text-gray-500">
              {form.watch("summary")?.length || 0} / 1000자
            </p>
            {form.formState.errors.summary && (
              <p className="text-sm text-red-600">
                {form.formState.errors.summary.message}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="followUpRequired"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={followUpRequired}
              onChange={(e) => handleFollowUpChange(e.target.checked)}
            />
            <Label htmlFor="followUpRequired" className="cursor-pointer">
              후속 조치 필요
            </Label>
          </div>

          {followUpRequired && (
            <div className="space-y-2">
              <Label htmlFor="followUpDate">후속 조치 예정일</Label>
              <Input
                id="followUpDate"
                type="date"
                {...form.register("followUpDate")}
              />
              {form.formState.errors.followUpDate && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.followUpDate.message}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="satisfactionScore">학생 만족도 (1-5)</Label>
            <Select
              value={form.watch("satisfactionScore")?.toString() || ""}
              onValueChange={(value) =>
                form.setValue(
                  "satisfactionScore",
                  value ? parseInt(value) : undefined,
                  { shouldDirty: true }
                )
              }
            >
              <SelectTrigger id="satisfactionScore">
                <SelectValue placeholder="선택하세요 (선택사항)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 - 매우 불만족</SelectItem>
                <SelectItem value="2">2 - 불만족</SelectItem>
                <SelectItem value="3">3 - 보통</SelectItem>
                <SelectItem value="4">4 - 만족</SelectItem>
                <SelectItem value="5">5 - 매우 만족</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.satisfactionScore && (
              <p className="text-sm text-red-600">
                {form.formState.errors.satisfactionScore.message}
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "저장 중..." : "상담 기록 저장"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>

      <AISupportPanel
        studentId={studentId}
        studentName={studentName}
        teacherId={teacherId}
        sessionId={sessionId}
        content={form.watch("summary")}
        sessionType={form.watch("type")}
        isOpen={isPanelOpen}
        onOpenChange={setIsPanelOpen}
        onAISummaryApply={handleAISummaryApply}
      />
    </>
  )
}
