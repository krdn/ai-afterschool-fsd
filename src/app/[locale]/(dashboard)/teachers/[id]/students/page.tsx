import { notFound } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { getRBACPrisma } from '@/lib/db/common/rbac'
import { getTeacherStudents, getTeacherStudentMetrics } from '@/lib/actions/teacher/performance'
import { TeacherStudentList } from '@/components/teachers/TeacherStudentList'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft, Users, TrendingUp, MessageSquare, Heart } from 'lucide-react'
import type { TeacherRole } from '@/lib/db/common/rbac'

type PageProps = {
  params: Promise<{ id: string }>
}

async function checkTeacherAccess(
  session: { userId: string; role?: TeacherRole; teamId?: string | null },
  teacherId: string
): Promise<boolean> {
  if (session.role === 'DIRECTOR') {
    return true
  }

  if (session.role === 'TEACHER' || session.role === 'MANAGER') {
    return session.userId === teacherId
  }

  if (session.role === 'TEAM_LEADER') {
    if (session.userId === teacherId) {
      return true
    }

    const rbacDb = getRBACPrisma(session)
    const teacher = await rbacDb.teacher.findUnique({
      where: { id: teacherId },
      select: { teamId: true },
    })

    return teacher?.teamId === session.teamId
  }

  return false
}

export default async function TeacherStudentsPage({ params }: PageProps) {
  const session = await verifySession()
  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500">로그인이 필요합니다</p>
        </div>
      </div>
    )
  }

  const { id } = await params

  // RBAC 권한 체크
  const canAccess = await checkTeacherAccess(session, id)
  if (!canAccess) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500">접근 권한이 없습니다</p>
        </div>
      </div>
    )
  }

  // 선생님 정보 조회
  const rbacDb = getRBACPrisma(session)
  const teacher = await rbacDb.teacher.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      team: {
        select: {
          name: true,
        },
      },
    },
  })

  if (!teacher) {
    notFound()
  }

  // 담당 학생 목록 및 통계 조회
  const studentsResult = await getTeacherStudents(id)
  const metricsResult = await getTeacherStudentMetrics(id)

  if (!studentsResult.success) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-red-500">{studentsResult.error}</p>
        </div>
      </div>
    )
  }

  if (!metricsResult.success) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-red-500">{metricsResult.error}</p>
        </div>
      </div>
    )
  }

  const students = studentsResult.data
  const metrics = metricsResult.data

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/teachers/${id}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            기본 정보로
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{teacher.name} 선생님 담당 학생</h1>
          <p className="text-gray-600">
            {teacher.email}
            {teacher.team && ` · ${teacher.team.name}`}
          </p>
        </div>
      </div>

      {/* 요약 메트릭 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="h-4 w-4" />
              총 담당 학생
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.totalStudents}명</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              평균 성적 변화
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold">
                {metrics.averageGradeChange >= 0 ? '+' : ''}
                {metrics.averageGradeChange.toFixed(1)}%
              </span>
              <span
                className={`text-sm ${
                  metrics.averageGradeChange >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {metrics.averageGradeChange >= 0 ? '↑' : '↓'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              총 상담 횟수
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.totalCounselingSessions}회</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Heart className="h-4 w-4" />
              평균 궁합 점수
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold">
                {metrics.averageCompatibilityScore.toFixed(0)}점
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100">
                <div
                  className={`h-2 rounded-full transition-all ${
                    metrics.averageCompatibilityScore >= 80
                      ? 'bg-green-500'
                      : metrics.averageCompatibilityScore >= 60
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                  }`}
                  style={{ width: `${metrics.averageCompatibilityScore}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 학생 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>담당 학생 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <TeacherStudentList
            teacherId={id}
            students={students}
            metrics={metrics}
          />
        </CardContent>
      </Card>
    </div>
  )
}
