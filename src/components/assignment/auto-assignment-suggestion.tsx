'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  generateAutoAssignmentSuggestions,
  applyAutoAssignment,
} from '@/lib/actions/matching/assignment'
import type { Assignment } from '@/lib/optimization/auto-assignment'
import type { FairnessMetrics } from '@/features/matching'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { toast } from 'sonner'
import { Brain, Check, X, Loader2, Users, Star, AlertCircle } from 'lucide-react'

interface Student {
  id: string
  name: string
  school: string
  grade: number
  teacherId: string | null
}

interface Teacher {
  id: string
  name: string
}

interface AutoAssignmentSuggestionProps {
  allStudents: Student[]
  allTeachers: Teacher[]
}

interface SuggestionResult {
  assignments: Assignment[]
  fairnessMetrics: FairnessMetrics
  summary: {
    totalStudents: number
    assignedStudents: number
    averageScore: number
    minScore: number
    maxScore: number
  }
}

export function AutoAssignmentSuggestion({
  allStudents,
  allTeachers,
}: AutoAssignmentSuggestionProps) {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [suggestion, setSuggestion] = useState<SuggestionResult | null>(null)
  const [isApplying, setIsApplying] = useState(false)

  const handleGenerate = async () => {
    if (allStudents.length === 0) {
      toast.error('배정할 학생이 없습니다.')
      return
    }

    setIsGenerating(true)
    try {
      const studentIds = allStudents.map((s) => s.id)
      const result = await generateAutoAssignmentSuggestions(studentIds, {
        maxStudentsPerTeacher: Math.ceil(allStudents.length / 3) + 2,
      })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setSuggestion(result.data)
      toast.success('자동 배정 제안이 생성되었습니다.')
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : '자동 배정 제안 생성 중 오류가 발생했습니다.'
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApply = async () => {
    if (!suggestion || suggestion.assignments.length === 0) {
      toast.error('적용할 배정이 없습니다.')
      return
    }

    setIsApplying(true)
    try {
      const result = await applyAutoAssignment(suggestion.assignments)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(`${result.data.count}명의 학생이 성공적으로 배정되었습니다.`)
      setSuggestion(null)
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : '배정 적용 중 오류가 발생했습니다.'
      )
    } finally {
      setIsApplying(false)
    }
  }

  const handleCancel = () => {
    setSuggestion(null)
  }

  // 학생 ID로 이름 조회
  const getStudentName = (id: string) => {
    return allStudents.find((s) => s.id === id)?.name || 'Unknown'
  }

  // 선생님 ID로 이름 조회
  const getTeacherName = (id: string) => {
    return allTeachers.find((t) => t.id === id)?.name || 'Unknown'
  }

  return (
    <div className="space-y-6">
      {/* 제안 생성 버튼 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI 자동 배정
          </CardTitle>
          <CardDescription>
            전체 학생 <span data-testid="unassigned-student">{allStudents.length}명</span>을 대상으로 최적의 학생-선생님 배정을 제안합니다.
            <br />
            궁합 점수와 부하 분산을 고려하여 기존 배정을 포함한 전체 재배정안을 생성합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || allStudents.length === 0}
            className="w-full sm:w-auto"
            data-testid={isGenerating ? "assignment-loading" : "generate-assignment-button"}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                생성 중...
              </>
            ) : (
              <>
                <Brain className="mr-2 h-4 w-4" />
                자동 배정 생성
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* 생성된 제안 표시 */}
      {suggestion && (
        <div className="space-y-4" data-testid="assignment-proposal">
          {/* 요약 카드 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">전체 학생</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="student-count">
                  {suggestion.summary.totalStudents}명
                </div>
                <p className="text-xs text-muted-foreground">
                  배정 대상 학생
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">배정 학생</CardTitle>
                <Check className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {suggestion.summary.assignedStudents}명
                </div>
                <p className="text-xs text-muted-foreground">
                  {suggestion.summary.totalStudents -
                    suggestion.summary.assignedStudents}
                  명 배정 불가
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">평균 점수</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(suggestion.summary.averageScore)}점
                </div>
                <p className="text-xs text-muted-foreground">
                  {Math.round(suggestion.summary.minScore)} ~{' '}
                  {Math.round(suggestion.summary.maxScore)}점
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 공정성 메트릭 (임시 placeholder) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                공정성 분석
              </CardTitle>
              <CardDescription>
                배정 결과의 공정성 메트릭입니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Disparity Index</p>
                  <p className="font-medium">
                    {(suggestion.fairnessMetrics.disparityIndex * 100).toFixed(
                      1
                    )}
                    %
                  </p>
                  <p className="text-xs text-muted-foreground">
                    학교 간 점수 차이 (낮을수록 공정)
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">ABROCA</p>
                  <p className="font-medium">
                    {(suggestion.fairnessMetrics.abroca * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    점수 분포 편향 (낮을수록 공정)
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Distribution Balance</p>
                  <p className="font-medium">
                    {(suggestion.fairnessMetrics.distributionBalance * 100).toFixed(
                      1
                    )}
                    %
                  </p>
                  <p className="text-xs text-muted-foreground">
                    선생님별 배정 균형 (높을수록 균등)
                  </p>
                </div>
              </div>
              {suggestion.fairnessMetrics.recommendations.length > 0 && (
                <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                  <p className="text-sm font-medium text-yellow-800 mb-1">
                    개선 제안
                  </p>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {suggestion.fairnessMetrics.recommendations.map(
                      (rec, idx) => (
                        <li key={idx}>• {rec}</li>
                      )
                    )}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 배정 목록 */}
          <Card>
            <CardHeader>
              <CardTitle>제안된 배정 목록</CardTitle>
              <CardDescription>
                AI가 제안한 학생-선생님 배정 목록입니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">학생</th>
                      <th className="px-4 py-2 text-left font-medium">배정 선생님</th>
                      <th className="px-4 py-2 text-left font-medium">총점</th>
                      <th className="px-4 py-2 text-left font-medium">세부 점수</th>
                      <th className="px-4 py-2 text-left font-medium">추천 이유</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {suggestion.assignments.map((assignment) => (
                      <tr key={assignment.studentId} className="hover:bg-muted" data-testid="teacher-assignment">
                        <td className="px-4 py-3">
                          <p className="font-medium">
                            {getStudentName(assignment.studentId)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {allStudents.find(
                              (s) => s.id === assignment.studentId
                            )?.school || ''}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium">
                            {getTeacherName(assignment.teacherId)}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-lg">
                            {Math.round(assignment.score.overall)}
                          </span>
                          <span className="text-muted-foreground text-sm">/100</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">MBTI</span>
                              <span>{Math.round(assignment.score.breakdown.mbti / 25 * 100)}%</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">학습 스타일</span>
                              <span>
                                {Math.round(assignment.score.breakdown.learningStyle / 25 * 100)}%
                              </span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">사주</span>
                              <span>{Math.round(assignment.score.breakdown.saju / 20 * 100)}%</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">성명학</span>
                              <span>{Math.round(assignment.score.breakdown.name / 15 * 100)}%</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">부하 분산</span>
                              <span>
                                {Math.round(assignment.score.breakdown.loadBalance / 15 * 100)}%
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <ul className="text-xs space-y-1">
                            {assignment.score.reasons.slice(0, 2).map((reason, idx) => (
                              <li key={idx} className="text-muted-foreground">
                                • {reason}
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* 액션 버튼 */}
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isApplying}
            >
              <X className="mr-2 h-4 w-4" />
              취소
            </Button>
            <Button onClick={handleApply} disabled={isApplying}>
              {isApplying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  적용 중...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {suggestion.assignments.length}명 배정 적용
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
