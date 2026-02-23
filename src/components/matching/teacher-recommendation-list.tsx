"use client"

import { UserPlus, Loader2 } from "lucide-react"
import type { TeacherRecommendation } from "@/lib/actions/matching/assignment"

export type { TeacherRecommendation }

interface TeacherRecommendationListProps {
  recommendations: TeacherRecommendation[]
  currentTeacherId?: string | null
  onAssign?: (teacherId: string) => void
  assigningTeacherId?: string | null
}

/**
 * 학생별 선생님 추천 목록 컴포넌트
 *
 * 궁합 점수별로 정렬된 선생님 목록을 표시합니다.
 */
export function TeacherRecommendationList({
  recommendations,
  currentTeacherId,
  onAssign,
  assigningTeacherId,
}: TeacherRecommendationListProps) {
  if (recommendations.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <p className="text-center text-gray-500">
          추천 가능한 선생님이 없습니다.
        </p>
      </div>
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

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-blue-600"
    if (score >= 40) return "text-yellow-600"
    return "text-gray-600"
  }

  return (
    <div className="space-y-4" data-testid="matching-results">
      {recommendations.map((recommendation, index) => {
        const isCurrentTeacher = recommendation.teacherId === currentTeacherId

        return (
          <div
            key={recommendation.teacherId}
            data-testid={`teacher-match-${recommendation.teacherId}`}
            className={`rounded-lg border bg-white p-6 shadow-sm transition-colors ${
              isCurrentTeacher ? "border-blue-500 bg-blue-50" : ""
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold">
                    {index + 1}. {recommendation.teacherName}
                  </h3>
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                    {getRoleLabel(recommendation.teacherRole)}
                  </span>
                  {recommendation.currentStudentCount != null && (
                    <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
                      담당 {recommendation.currentStudentCount}명
                    </span>
                  )}
                  {isCurrentTeacher && (
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                      현재 배정
                    </span>
                  )}
                </div>

                <div className="mt-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">
                      {recommendation.score.overall.toFixed(1)}
                    </span>
                    <span className="text-sm text-gray-500">/ 100점</span>
                    <span
                      className={`text-sm font-medium ${getScoreColor(recommendation.score.overall)}`}
                    >
                      {recommendation.score.overall >= 80
                        ? "매우 좋음"
                        : recommendation.score.overall >= 60
                          ? "좋음"
                          : recommendation.score.overall >= 40
                            ? "보통"
                            : "낮음"}
                    </span>
                  </div>
                </div>

                {/* 점수 분해 */}
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
                  <div>
                    <span className="text-gray-600">MBTI</span>
                    <div className="font-semibold">
                      {recommendation.breakdown.mbti.toFixed(1)}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">학습 스타일</span>
                    <div className="font-semibold">
                      {recommendation.breakdown.learningStyle.toFixed(1)}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">사주</span>
                    <div className="font-semibold">
                      {recommendation.breakdown.saju === 0
                        ? <span className="text-gray-400 text-xs">미분석</span>
                        : recommendation.breakdown.saju.toFixed(1)}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">성명학</span>
                    <div className="font-semibold">
                      {recommendation.breakdown.name === 0
                        ? <span className="text-gray-400 text-xs">미분석</span>
                        : recommendation.breakdown.name.toFixed(1)}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">부하 분산</span>
                    <div className="font-semibold">
                      {recommendation.breakdown.loadBalance.toFixed(1)}
                    </div>
                  </div>
                </div>

                {/* 추천 이유 */}
                {recommendation.reasons.length > 0 && (
                  <div className="mt-4 space-y-1">
                    <h4 className="text-sm font-medium text-gray-700">추천 이유</h4>
                    <ul className="list-inside list-disc space-y-1 text-sm text-gray-600">
                      {recommendation.reasons.map((reason, idx) => (
                        <li key={idx}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {onAssign && !isCurrentTeacher && (
                <div className="ml-4 flex shrink-0 items-start">
                  <button
                    onClick={() => onAssign(recommendation.teacherId)}
                    disabled={assigningTeacherId === recommendation.teacherId}
                    className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
                  >
                    {assigningTeacherId === recommendation.teacherId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                    배정하기
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
