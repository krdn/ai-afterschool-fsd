import { verifySession } from "@/lib/dal"
import { getRBACPrisma } from "@/lib/db/common/rbac"
import { CounselingPageTabs } from "@/components/counseling/counseling-page-tabs"
import { CounselingHistoryContent } from "@/components/counseling/counseling-history-content"
import { InlineHelp } from "@/components/help/inline-help"
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
          <p className="text-muted-foreground">로그인이 필요합니다</p>
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
    select: {
      id: true,
      sessionDate: true,
      duration: true,
      type: true,
      summary: true,
      followUpRequired: true,
      followUpDate: true,
      satisfactionScore: true,
      aiSummary: true,
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
          <InlineHelp helpId="counseling-overview">
            <h1 className="text-3xl font-bold">상담 관리</h1>
          </InlineHelp>
          <p className="text-muted-foreground">선생님-학생 상담 기록과 예약을 관리합니다</p>
        </div>
      </div>

      {/* 탭 UI */}
      <CounselingPageTabs
        initialTab={params.tab}
      >
        <CounselingHistoryContent
          sessions={sessions as CounselingSessionData[]}
          params={params}
          monthlyCount={monthlyCount}
          totalSessions={totalSessions}
          avgDuration={avgDuration}
          followUpCount={followUpCount}
          canViewTeam={canViewTeam}
          teachers={teachers}
        />
      </CounselingPageTabs>
    </div>
  )
}
