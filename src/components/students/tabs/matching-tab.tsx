"use client"

import { useState, useEffect } from "react"
import { Users, Loader2, RefreshCw, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getAssignedTeacherCompatibility, type AssignedCompatibilityData } from "@/lib/actions/matching/assignment"
import Link from "next/link"

type MatchingTabProps = {
  studentId: string
  studentName: string
  currentTeacherId?: string | null
}

const getScoreColor = (score: number) => {
  if (score >= 80) return "text-green-600"
  if (score >= 60) return "text-blue-600"
  if (score >= 40) return "text-yellow-600"
  return "text-gray-600"
}

const getScoreLabel = (score: number) => {
  if (score >= 80) return "매우 좋음"
  if (score >= 60) return "좋음"
  if (score >= 40) return "보통"
  return "낮음"
}

const getScoreBgColor = (score: number) => {
  if (score >= 80) return "bg-green-50 border-green-200"
  if (score >= 60) return "bg-blue-50 border-blue-200"
  if (score >= 40) return "bg-yellow-50 border-yellow-200"
  return "bg-gray-50 border-gray-200"
}

const getRoleLabel = (role: string) => {
  switch (role) {
    case "TEAM_LEADER": return "팀장"
    case "MANAGER": return "매니저"
    case "TEACHER": return "선생님"
    default: return role
  }
}

/** 세부 점수 항목 */
const breakdownItems = [
  { key: "mbti" as const, label: "MBTI", max: 25 },
  { key: "learningStyle" as const, label: "학습 스타일", max: 25 },
  { key: "saju" as const, label: "사주", max: 20 },
  { key: "name" as const, label: "성명학", max: 15 },
  { key: "loadBalance" as const, label: "부하 분산", max: 15 },
]

export default function MatchingTab({ studentId, studentName, currentTeacherId }: MatchingTabProps) {
  const [data, setData] = useState<AssignedCompatibilityData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getAssignedTeacherCompatibility(studentId)
      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error ?? "궁합 데이터를 불러오는 데 실패했습니다.")
      }
    } catch {
      setError("궁합 데이터를 불러오는 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500">
        <Loader2 className="h-8 w-8 animate-spin mb-3" />
        <p className="text-sm">매칭 궁합 데이터를 불러오고 있습니다...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertCircle className="h-8 w-8 text-red-400 mb-3" />
        <p className="text-sm text-red-600 mb-3">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-1" />
          다시 시도
        </Button>
      </div>
    )
  }

  // 배정된 선생님이 없는 경우
  if (!currentTeacherId || !data) {
    return (
      <div data-testid="matching-tab-content" className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold">선생님 매칭 궁합</h3>
            <p className="text-sm text-gray-500">담당 선생님과의 매칭 점수 및 상세 분석을 표시합니다.</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-12 rounded-lg border border-dashed border-gray-300 bg-gray-50">
          <Users className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm text-gray-500 mb-1">아직 배정된 선생님이 없습니다.</p>
          <p className="text-xs text-gray-400 mb-4">
            배정 관리에서 스마트 배정을 통해 선생님을 배정하면 궁합 분석 결과가 여기에 표시됩니다.
          </p>
          <Link href="/matching">
            <Button variant="outline" size="sm">
              배정 관리로 이동
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div data-testid="matching-tab-content" className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold">선생님 매칭 궁합</h3>
            <p className="text-sm text-gray-500">
              {studentName} 학생과 {data.teacherName} 선생님의 궁합 분석 결과입니다.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-1" />
          새로고침
        </Button>
      </div>

      {/* 메인 점수 카드 */}
      <div className={`rounded-lg border p-6 ${getScoreBgColor(data.overallScore)}`}>
        <div className="flex items-center gap-3 mb-4">
          <h4 className="text-lg font-semibold">{data.teacherName}</h4>
          <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
            {getRoleLabel(data.teacherRole)}
          </span>
          <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
            현재 배정
          </span>
        </div>

        <div className="flex items-baseline gap-2 mb-6">
          <span className="text-4xl font-bold">{data.overallScore.toFixed(1)}</span>
          <span className="text-sm text-gray-500">/ 100점</span>
          <span className={`text-sm font-medium ${getScoreColor(data.overallScore)}`}>
            {getScoreLabel(data.overallScore)}
          </span>
        </div>

        {/* 세부 점수 - 프로그레스 바 */}
        <div className="space-y-3">
          <h5 className="text-sm font-semibold text-gray-700">세부 점수</h5>
          <div className="grid gap-3">
            {breakdownItems.map((item) => {
              const score = data.breakdown[item.key]
              const percent = (score / item.max) * 100
              const isZero = score === 0

              return (
                <div key={item.key} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-20 shrink-0">{item.label}</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        percent >= 80 ? "bg-green-500"
                          : percent >= 60 ? "bg-blue-500"
                          : percent >= 40 ? "bg-yellow-500"
                          : "bg-gray-400"
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold w-16 text-right shrink-0">
                    {isZero ? (
                      <span className="text-gray-400 text-xs font-normal">미분석</span>
                    ) : (
                      `${score.toFixed(1)} / ${item.max}`
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 추천 이유 */}
      {data.reasons.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">매칭 분석 요약</h4>
          <ul className="space-y-2">
            {data.reasons.map((reason, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 분석 시점 + 다른 선생님 추천 링크 */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>분석 시점: {new Date(data.calculatedAt).toLocaleString("ko-KR")}</span>
        <Link
          href={`/students/${studentId}/matching`}
          className="text-blue-500 hover:text-blue-600 hover:underline"
        >
          다른 선생님 추천 보기
        </Link>
      </div>
    </div>
  )
}
