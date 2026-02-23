"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, Loader2, Zap, CheckCircle2 } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  UnassignedStudentCombobox,
  type UnassignedStudent,
  type AssignedStudent,
} from "./unassigned-student-combobox"
import {
  MatchingModelSelector,
  type MatchingModel,
  type LlmProviderOption,
} from "./matching-model-selector"
import {
  TeacherRecommendationList,
  type TeacherRecommendation,
} from "./teacher-recommendation-list"
import { getTeacherRecommendations, assignStudentToTeacher } from "@/lib/actions/matching/assignment"
import { getLLMTeacherRecommendations } from "@/lib/actions/admin/llm-compatibility"
import { toast } from "sonner"

interface SmartMatchingSectionProps {
  unassignedStudents: UnassignedStudent[]
  assignedStudents?: AssignedStudent[]
  llmProviders?: LlmProviderOption[]
}

export function SmartMatchingSection({
  unassignedStudents,
  assignedStudents = [],
  llmProviders = [],
}: SmartMatchingSectionProps) {
  const router = useRouter()
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<MatchingModel>("rule-based")
  const [recommendations, setRecommendations] = useState<TeacherRecommendation[]>([])
  const [studentName, setStudentName] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [assigningTeacherId, setAssigningTeacherId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // 배정 확인 다이얼로그 상태
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    teacherId: string
    teacherName: string
  }>({ open: false, teacherId: "", teacherName: "" })

  const isLlmModel = selectedModel.startsWith("llm:")

  // 추천 목록 가져오기 (모델에 따라 분기)
  const fetchRecommendations = async (studentId: string, model: MatchingModel) => {
    setRecommendations([])
    setStudentName("")
    setIsLoading(true)

    try {
      if (model.startsWith("llm:")) {
        const providerId = model.replace("llm:", "")
        const result = await getLLMTeacherRecommendations(studentId, providerId)
        setRecommendations(result.recommendations)
        setStudentName(result.studentName)
      } else {
        const result = await getTeacherRecommendations(studentId)
        if (result.success) {
          setRecommendations(result.data.recommendations)
          setStudentName(result.data.studentName)
        } else {
          toast.error(result.error ?? "추천 목록을 불러오는데 실패했습니다.")
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "추천 목록을 불러오는데 실패했습니다."
      toast.error(message)
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  // 학생 선택 (상태만 저장, 자동 분석 안 함)
  const handleStudentChange = (studentId: string | null) => {
    setSelectedStudentId(studentId)
    if (!studentId) {
      setRecommendations([])
      setStudentName("")
    }
  }

  // 모델 변경 (상태만 저장, 자동 분석 안 함)
  const handleModelChange = (model: MatchingModel) => {
    setSelectedModel(model)
  }

  // 분석 시작 버튼 클릭
  const handleAnalyze = async () => {
    if (!selectedStudentId) return
    await fetchRecommendations(selectedStudentId, selectedModel)
  }

  // 배정 버튼 클릭 → 확인 다이얼로그 열기
  const handleAssignClick = (teacherId: string) => {
    const teacher = recommendations.find((r) => r.teacherId === teacherId)
    if (!teacher) return

    setConfirmDialog({
      open: true,
      teacherId,
      teacherName: teacher.teacherName,
    })
  }

  // 배정 확정
  const handleConfirmAssign = async () => {
    const { teacherId } = confirmDialog
    setConfirmDialog((prev) => ({ ...prev, open: false }))
    setAssigningTeacherId(teacherId)

    try {
      await assignStudentToTeacher(selectedStudentId!, teacherId)
      toast.success(
        `${studentName} 학생이 ${confirmDialog.teacherName} 선생님에게 배정되었습니다.`
      )

      // 상태 초기화 및 페이지 새로고침
      setSelectedStudentId(null)
      setRecommendations([])
      setStudentName("")
      startTransition(() => {
        router.refresh()
      })
    } catch (error) {
      toast.error("배정 중 오류가 발생했습니다.")
      console.error(error)
    } finally {
      setAssigningTeacherId(null)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            스마트 배정
          </CardTitle>
          <CardDescription>
            미배정 학생을 선택하면 모든 선생님과의 궁합 점수를 분석하여 추천합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 미배정 학생이 없을 때 - 완료 상태 */}
          {unassignedStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-500 mb-3" />
              <p className="text-sm font-medium text-green-700">모든 학생이 배정 완료되었습니다</p>
              <p className="text-xs text-muted-foreground mt-1">미배정 학생이 없어 스마트 배정이 필요하지 않습니다.</p>
            </div>
          ) : (
            <>
              {/* 선택 영역 */}
              <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-[1fr_1fr_auto]">
                <div className="space-y-2">
                  <label className="text-sm font-medium">미배정 학생</label>
                  <UnassignedStudentCombobox
                    students={unassignedStudents}
                    assignedStudents={assignedStudents}
                    value={selectedStudentId}
                    onChange={handleStudentChange}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">계산 모델</label>
                  <MatchingModelSelector
                    value={selectedModel}
                    onChange={handleModelChange}
                    disabled={isLoading}
                    llmProviders={llmProviders}
                  />
                </div>
                <Button
                  onClick={handleAnalyze}
                  disabled={!selectedStudentId || isLoading}
                  className="h-10"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  분석
                </Button>
              </div>

              {/* 로딩 상태 */}
              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                  <span className="ml-2 text-sm text-muted-foreground">
                    {isLlmModel
                      ? "AI가 궁합을 분석하고 있습니다... (20~30초 소요)"
                      : "궁합 점수 계산 중..."}
                  </span>
                </div>
              )}

              {/* 추천 결과 */}
              {!isLoading && recommendations.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {studentName} 학생의 추천 선생님 ({recommendations.length}명)
                  </h3>
                  <TeacherRecommendationList
                    recommendations={recommendations}
                    currentTeacherId={assignedStudents.find((s) => s.id === selectedStudentId)?.teacherId}
                    onAssign={handleAssignClick}
                    assigningTeacherId={assigningTeacherId}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 배정 확인 다이얼로그 */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>배정 확인</DialogTitle>
            <DialogDescription>
              <strong>{studentName}</strong> 학생을{" "}
              <strong>{confirmDialog.teacherName}</strong> 선생님에게
              배정하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setConfirmDialog((prev) => ({ ...prev, open: false }))
              }
            >
              취소
            </Button>
            <Button onClick={handleConfirmAssign}>배정하기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
