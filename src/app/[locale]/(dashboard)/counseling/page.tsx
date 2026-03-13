import { verifySession } from "@/lib/dal"
import { getRBACPrisma } from "@/lib/db/common/rbac"
import { CounselingPageTabs } from "@/components/counseling/counseling-page-tabs"
import { CounselingHistoryContent } from "@/components/counseling/counseling-history-content"
import { InlineHelp } from "@/components/help/inline-help"
import { normalizePaginationParams, getPrismaSkipTake } from "@/shared/utils/pagination"
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
    page?: string
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

  // 필터 조건 구성
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

  // 통합 검색
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

  // 기존 studentName 호환
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

  // 페이지네이션 파라미터
  const paginationParams = normalizePaginationParams({
    page: params.page ? parseInt(params.page, 10) : 1,
    pageSize: 15,
  })
  const { skip, take } = getPrismaSkipTake(paginationParams)

  // 통계 쿼리와 목록 쿼리를 병렬 실행
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  // 통계용 where (필터와 무관하게 전체 통계)
  const statsWhere: Prisma.CounselingSessionWhereInput = {}
  if (!canViewAll && !canViewTeam) {
    statsWhere.teacherId = session.userId
  }
  if (session.role === "TEAM_LEADER" && session.teamId) {
    statsWhere.teacher = { teamId: session.teamId }
  }

  const [sessions, totalCount, monthlyCount, followUpCount, avgResult] =
    await Promise.all([
      // 페이지네이션된 목록 조회
      rbacDb.counselingSession.findMany({
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
        skip,
        take,
      }),
      // 필터 적용된 전체 개수 (페이지네이션용)
      rbacDb.counselingSession.count({ where }),
      // 이번 달 상담 수 (전체 통계)
      rbacDb.counselingSession.count({
        where: {
          ...statsWhere,
          sessionDate: { gte: startOfMonth },
        },
      }),
      // 후속 조치 필요 건수 (전체 통계)
      rbacDb.counselingSession.count({
        where: {
          ...statsWhere,
          followUpRequired: true,
        },
      }),
      // 평균 상담 시간 (전체 통계)
      rbacDb.counselingSession.aggregate({
        where: statsWhere,
        _avg: { duration: true },
        _count: true,
      }),
    ])

  const totalSessions = avgResult._count
  const avgDuration = avgResult._avg.duration ?? 0
  const totalPages = Math.ceil(totalCount / paginationParams.pageSize)

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
          pagination={{
            page: paginationParams.page,
            totalPages,
            total: totalCount,
            pageSize: paginationParams.pageSize,
          }}
        />
      </CounselingPageTabs>
    </div>
  )
}
