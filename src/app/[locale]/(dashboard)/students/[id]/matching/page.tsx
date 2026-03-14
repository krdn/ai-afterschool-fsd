import { notFound } from "next/navigation"
import { verifySession } from "@/lib/dal"
import { db } from "@/lib/db/client"
import { getTeacherRecommendations } from "@/lib/actions/matching/assignment"
import { TeacherRecommendationList } from "@/components/matching/teacher-recommendation-list"

export default async function StudentMatchingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // 인증 확인
  await verifySession()

  // Student 조회 (본인 팀 데이터만)
  const student = await db.student.findFirst({
    where: { id },
    select: {
      id: true,
      name: true,
      teacherId: true,
    },
  })

  if (!student) {
    notFound()
  }

  // 선생님 추천 목록 조회
  const result = await getTeacherRecommendations(id)

  if (!result.success) {
    return (
      <div className="p-4 text-red-600">
        <p>{result.error}</p>
      </div>
    )
  }

  const recommendations = result.data

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {student.name}님의 적합 선생님
        </h1>
        <p className="mt-2 text-muted-foreground">
          학생의 성향 분석 데이터를 기반으로 가장 적합한 선생님을 추천합니다.
        </p>
      </div>

      {/* 추천 목록 */}
      <TeacherRecommendationList
        recommendations={recommendations.recommendations}
        currentTeacherId={student.teacherId}
      />

      {/* 현재 배정 정보 */}
      {student.teacherId && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-900">
            <strong>현재 배정된 선생님:</strong>{" "}
            {
              recommendations.recommendations.find(
                (r) => r.teacherId === student.teacherId
              )?.teacherName
            }
          </p>
        </div>
      )}
    </div>
  )
}
