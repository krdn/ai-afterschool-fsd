"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { assignStudentToTeacher } from "@/lib/actions/matching/assignment"
import type { CompatibilityScore } from "@/features/analysis"
import { CompatibilityScoreCard } from "./compatibility-score-card"
import { CompatibilityRadarChart } from "./compatibility-radar-chart"

export interface TeacherRecommendation {
  teacherId: string
  teacherName: string
  teacherRole: string
  score: CompatibilityScore
  breakdown: CompatibilityScore["breakdown"]
  reasons: string[]
}

interface TeacherRecommendationListProps {
  studentId: string
  recommendations: TeacherRecommendation[]
  currentTeacherId?: string | null
  onAssign?: () => void
}

export function TeacherRecommendationList({
  studentId,
  recommendations,
  currentTeacherId,
  onAssign,
}: TeacherRecommendationListProps) {
  const [assigningTeacherId, setAssigningTeacherId] = useState<string | null>(null)

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-center text-muted-foreground">
            추천 가능한 선생님이 없습니다.
          </p>
        </CardContent>
      </Card>
    )
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "TEAM_LEADER":
        return "팀장"
      case "MANAGER":
        return "매니저"
      case "TEACHER":
        return "선생님"
      default:
        return role
    }
  }

  const getScoreColorClass = (score: number): string => {
    if (score >= 80) return "bg-green-100 text-green-700"
    if (score >= 60) return "bg-blue-100 text-blue-700"
    if (score >= 40) return "bg-yellow-100 text-yellow-700"
    return "bg-muted text-foreground"
  }

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return "매우 좋음"
    if (score >= 60) return "좋음"
    if (score >= 40) return "보통"
    return "낮음"
  }

  const handleAssign = async (teacherId: string) => {
    setAssigningTeacherId(teacherId)
    try {
      const result = await assignStudentToTeacher(studentId, teacherId)
      if (result.success) {
        toast.success("배정이 완료되었습니다.")
        onAssign?.()
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "배정 중 오류가 발생했습니다.")
    } finally {
      setAssigningTeacherId(null)
    }
  }

  return (
    <div className="space-y-4">
      {recommendations.map((recommendation, index) => {
        const isCurrentTeacher = recommendation.teacherId === currentTeacherId
        const rank = index + 1

        return (
          <Card
            key={recommendation.teacherId}
            className={isCurrentTeacher ? "border-blue-500 ring-1 ring-blue-500" : ""}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-sm ${
                      rank === 1
                        ? "bg-yellow-100 text-yellow-700"
                        : rank === 2
                          ? "bg-muted text-foreground"
                          : rank === 3
                            ? "bg-amber-100 text-amber-700"
                            : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {rank}
                  </div>

                  <div>
                    <CardTitle className="text-lg">
                      {recommendation.teacherName}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                        {getRoleLabel(recommendation.teacherRole)}
                      </span>
                      {isCurrentTeacher && (
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          현재 배정
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${getScoreColorClass(recommendation.score.overall)}`}>
                    {recommendation.score.overall.toFixed(1)}점
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">
                    {getScoreLabel(recommendation.score.overall)}
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CompatibilityRadarChart breakdown={recommendation.breakdown} />
                <CompatibilityScoreCard
                  score={recommendation.score.overall}
                  breakdown={recommendation.breakdown}
                  reasons={recommendation.reasons}
                />
              </div>

              {!isCurrentTeacher && (
                <div className="flex justify-end pt-2 border-t">
                  <Button
                    onClick={() => handleAssign(recommendation.teacherId)}
                    disabled={assigningTeacherId === recommendation.teacherId}
                    variant={rank <= 3 ? "default" : "outline"}
                  >
                    {assigningTeacherId === recommendation.teacherId
                      ? "배정 중..."
                      : "이 선생님으로 배정"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
