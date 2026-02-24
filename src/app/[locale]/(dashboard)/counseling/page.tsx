import Link from "next/link"
import { verifySession } from "@/lib/dal"
import { getRBACPrisma } from "@/lib/db/common/rbac"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare } from "lucide-react"
import { CounselingPageTabs } from "@/components/counseling/CounselingPageTabs"
import { CounselingSearchBar } from "@/components/counseling/CounselingSearchBar"
import { CounselingFilters } from "@/components/counseling/CounselingFilters"
import type { CounselingType, Prisma } from '@/lib/db'
import type { CounselingSessionData } from "@/components/counseling/types"

type PageProps = {
  searchParams: Promise<{
    query?: string
    studentName?: string
    teacherName?: string
    type?: string
    startDate?: string
    endDate?: string
    followUpRequired?: string
    teacherId?: string
    tab?: string
  }>
}

export default async function CounselingPage({
  searchParams,
}: PageProps) {
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

  const params = await searchParams

  const canViewAll = session.role === "DIRECTOR"
  const canViewTeam =
    session.role === "TEAM_LEADER" ||
    session.role === "MANAGER" ||
    session.role === "DIRECTOR"

  const rbacDb = getRBACPrisma(session)

  // 선생님 목록 조회 (필터용)
  let teachers: Array<{ id: string; name: string }> = []
  if (canViewTeam) {
    const teacherQuery: Prisma.TeacherWhereInput = {}
    if (session.role === "TEAM_LEADER" && session.teamId) {
      teacherQuery.teamId = session.teamId
    }

    teachers = await rbacDb.teacher.findMany({
      where: teacherQuery,
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    })
  }

  // Build teacher filter conditions
  const teacherConditions: Prisma.TeacherWhereInput = {}
  if (params.teacherName && canViewTeam) {
    teacherConditions.name = {
      contains: params.teacherName,
      mode: "insensitive",
    }
  }
  if (session.role === "TEAM_LEADER" && session.teamId) {
    teacherConditions.teamId = session.teamId
  }

  const where: Prisma.CounselingSessionWhereInput = {}

  // 통합 검색 지원 (query 파라미터)
  if (params.query && params.query.trim()) {
    const query = params.query.trim()
    where.OR = [
      {
        student: {
          name: {
            contains: query,
            mode: "insensitive",
          },
        },
      },
      {
        summary: {
          contains: query,
          mode: "insensitive",
        },
      },
    ]
  }

  // 기존 studentName 파라미터 호환성 유지
  if (params.studentName && !params.query) {
    where.student = {
      name: {
        contains: params.studentName,
        mode: "insensitive",
      },
    }
  }

  if (Object.keys(teacherConditions).length > 0) {
    where.teacher = teacherConditions
  }

  // teacherId 필터 지원 (새 필터 컴포넌트)
  if (params.teacherId && canViewTeam) {
    where.teacherId = params.teacherId
  }

  if (params.type && params.type !== "all") {
    where.type = params.type as CounselingType
  }

  if (params.startDate || params.endDate) {
    where.sessionDate = {}
    if (params.startDate) {
      where.sessionDate.gte = new Date(params.startDate)
    }
    if (params.endDate) {
      where.sessionDate.lte = new Date(params.endDate)
    }
  }

  if (params.followUpRequired === "true") {
    where.followUpRequired = true
  }

  if (!canViewAll && !canViewTeam) {
    where.teacherId = session.userId
  }

  const sessions = await rbacDb.counselingSession.findMany({
    where,
    include: {
      student: {
        select: {
          id: true,
          name: true,
          school: true,
          grade: true,
        },
      },
      teacher: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
    },
    orderBy: {
      sessionDate: "desc",
    },
    take: 100,
  })

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const monthlySessions = sessions.filter(
    (s) => new Date(s.sessionDate) >= startOfMonth
  )

  const totalSessions = sessions.length
  const monthlyCount = monthlySessions.length
  const avgDuration =
    sessions.length > 0
      ? sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length
      : 0
  const followUpCount = sessions.filter((s) => s.followUpRequired).length

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">상담 관리</h1>
          <p className="text-gray-600">선생님-학생 상담 기록과 예약을 관리합니다</p>
        </div>
      </div>

      {/* 탭 UI */}
      <CounselingPageTabs
        initialTab={params.tab}
        sessions={sessions as CounselingSessionData[]}
        session={session}
      >
        <CounselingHistoryContent
          sessions={sessions}
          params={params}
          monthlyCount={monthlyCount}
          totalSessions={totalSessions}
          avgDuration={avgDuration}
          followUpCount={followUpCount}
          canViewAll={canViewAll}
          canViewTeam={canViewTeam}
          teachers={teachers}
        />
      </CounselingPageTabs>
    </div>
  )
}

interface CounselingHistoryContentProps {
  sessions: Array<{
    id: string
    student: {
      id: string
      name: string
      school: string | null
      grade: number | null
    }
    teacher: {
      id: string
      name: string
      role: string
    }
    sessionDate: Date
    duration: number
    type: string
    summary: string
    followUpRequired: boolean
    followUpDate: Date | null
  }>
  params: {
    query?: string
    studentName?: string
    teacherName?: string
    type?: string
    startDate?: string
    endDate?: string
    followUpRequired?: string
  }
  monthlyCount: number
  totalSessions: number
  avgDuration: number
  followUpCount: number
  canViewAll: boolean
  canViewTeam: boolean
  teachers: Array<{ id: string; name: string }>
}

function CounselingHistoryContent({
  sessions,
  params,
  monthlyCount,
  totalSessions,
  avgDuration,
  followUpCount,
  canViewAll: _canViewAll,
  canViewTeam,
  teachers,
}: CounselingHistoryContentProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" asChild data-testid="new-counseling-button">
          <Link href="/counseling/new">새 상담 기록</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="counseling-stat-card-monthly">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              이번 달 상담 횟수
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{monthlyCount}회</div>
          </CardContent>
        </Card>

        <Card data-testid="counseling-stat-card-total">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              전체 상담 횟수
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalSessions}회</div>
          </CardContent>
        </Card>

        <Card data-testid="counseling-stat-card-duration">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              평균 상담 시간
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {avgDuration.toFixed(0)}분
            </div>
          </CardContent>
        </Card>

        <Card data-testid="counseling-stat-card-followup">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              후속 조치 예정
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{followUpCount}건</div>
          </CardContent>
        </Card>
      </div>

      {/* 통합 검색 */}
      <Card>
        <CardHeader>
          <CardTitle>통합 검색</CardTitle>
        </CardHeader>
        <CardContent>
          <CounselingSearchBar initialQuery={params.query || params.studentName || ""} />
        </CardContent>
      </Card>

      {/* 다중 필터 */}
      <Card data-testid="counseling-filters">
        <CardHeader>
          <CardTitle>필터</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <CounselingFilters canViewTeam={canViewTeam} teachers={teachers} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>상담 기록 ({sessions.length}건)</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <MessageSquare className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-gray-900">
                조건에 맞는 상담 기록이 없어요
              </h3>
              <p className="mb-4 max-w-sm text-sm text-gray-500">
                검색 조건을 변경하거나, 새 상담 기록을 추가해보세요.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" asChild>
                  <Link href="/counseling">필터 초기화</Link>
                </Button>
                <Button asChild>
                  <Link href="/counseling/new">새 상담 기록</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="border rounded-lg p-4 space-y-2"
                  data-testid="counseling-session"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {session.student.name} ({session.student.school}{" "}
                        {session.student.grade}학년)
                      </div>
                      <div className="text-sm text-gray-600">
                        {session.teacher.name} · {session.duration}분
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(
                        session.type
                      )}`}
                    >
                      {getTypeLabel(session.type)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700">{session.summary}</div>
                  {session.followUpRequired && (
                    <div className="text-sm text-amber-600">
                      후속 조치:{" "}
                      {session.followUpDate
                        ? new Date(session.followUpDate).toLocaleDateString(
                            "ko-KR"
                          )
                        : "예정됨"}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    ACADEMIC: "학업",
    CAREER: "진로",
    PSYCHOLOGICAL: "심리",
    BEHAVIORAL: "행동",
  }
  return labels[type] || type
}

function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    ACADEMIC: "bg-blue-100 text-blue-800",
    CAREER: "bg-green-100 text-green-800",
    PSYCHOLOGICAL: "bg-purple-100 text-purple-800",
    BEHAVIORAL: "bg-orange-100 text-orange-800",
  }
  return colors[type] || "bg-gray-100 text-gray-800"
}
