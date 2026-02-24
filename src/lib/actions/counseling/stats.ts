"use server"

import { verifySession } from "@/lib/dal"
import { getRBACPrisma } from "@/lib/db/common/rbac"
import { CounselingType, Prisma } from '@/lib/db'
import { startOfMonth, subMonths } from "date-fns"
import type {
  TeacherMonthlyStats,
  StudentCumulativeStats,
  TypeDistribution,
  MonthlyTrend,
} from "@/types/statistics"
import { ok, fail, type ActionResult } from "@/lib/errors/action-result"
import { logger } from "@/lib/logger"

/**
 * 선생님별 월간 상담 통계 조회
 *
 * RBAC: TEACHER - 자신의 통계만 조회 가능
 *       TEAM_LEADER - 팀 내 선생님 통계 조회 가능
 *       MANAGER, DIRECTOR - 모든 선생님 통계 조회 가능
 */
export async function getTeacherMonthlyStatsAction(params?: {
  dateFrom?: string
  dateTo?: string
}): Promise<ActionResult<TeacherMonthlyStats[]>> {
  const session = await verifySession()
  if (!session) {
    return fail("인증이 필요합니다.")
  }

  const rbacDb = getRBACPrisma(session)

  try {
    // 날짜 필터링 설정
    const whereClause: Prisma.CounselingSessionWhereInput = {}
    if (params?.dateFrom || params?.dateTo) {
      whereClause.sessionDate = {}
      if (params.dateFrom) {
        whereClause.sessionDate.gte = new Date(params.dateFrom)
      }
      if (params.dateTo) {
        whereClause.sessionDate.lte = new Date(params.dateTo)
      }
    }

    // 상담 세션 조회 (RBAC 자동 적용됨)
    const sessions = await rbacDb.counselingSession.findMany({
      where: whereClause,
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
          }
        }
      },
    })

    // 선생님별, 연월별, 유형별 집계
    const statsMap = new Map<string, TeacherMonthlyStats>()

    sessions.forEach((session) => {
      const date = new Date(session.sessionDate)
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      const key = `${session.teacherId}-${year}-${month}`

      if (!statsMap.has(key)) {
        statsMap.set(key, {
          teacherId: session.teacherId,
          teacherName: session.teacher.name,
          year,
          month,
          sessionCount: 0,
          typeBreakdown: {
            ACADEMIC: 0,
            CAREER: 0,
            PSYCHOLOGICAL: 0,
            BEHAVIORAL: 0,
          }
        })
      }

      const stats = statsMap.get(key)!
      stats.sessionCount++
      stats.typeBreakdown[session.type]++
    })

    const data = Array.from(statsMap.values()).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year
      if (a.month !== b.month) return b.month - a.month
      return a.teacherName.localeCompare(b.teacherName)
    })

    return ok(data)
  } catch (error) {
    logger.error({ err: error }, 'Error fetching teacher monthly stats')
    return fail("선생님별 월간 통계 조회에 실패했습니다.")
  }
}

/**
 * 학생별 누적 상담 통계 조회
 *
 * RBAC: TEACHER - 자신이 담당하는 학생만 조회 가능
 *       TEAM_LEADER, MANAGER, DIRECTOR - 권한에 따라 학생 조회 가능
 */
export async function getStudentCumulativeStatsAction(params?: {
  teacherId?: string
}): Promise<ActionResult<StudentCumulativeStats[]>> {
  const session = await verifySession()
  if (!session) {
    return fail("인증이 필요합니다.")
  }

  const rbacDb = getRBACPrisma(session)

  try {
    // teacherId 필터링 (지정된 경우)
    const whereClause: Prisma.CounselingSessionWhereInput = {}
    if (params?.teacherId) {
      // TEACHER는 자신의 ID만 조회 가능
      if (session.role === "TEACHER" && session.userId !== params.teacherId) {
        return fail("자신이 담당하는 학생만 조회할 수 있습니다.")
      }
      whereClause.teacherId = params.teacherId
    }

    // 상담 세션 조회 (RBAC 자동 적용됨)
    const sessions = await rbacDb.counselingSession.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: {
        sessionDate: 'desc'
      }
    })

    // 학생별 집계
    const statsMap = new Map<string, StudentCumulativeStats>()

    sessions.forEach((session) => {
      const studentId = session.studentId

      if (!statsMap.has(studentId)) {
        statsMap.set(studentId, {
          studentId,
          studentName: session.student.name,
          totalSessions: 0,
          lastSessionDate: null,
          typeBreakdown: {
            ACADEMIC: 0,
            CAREER: 0,
            PSYCHOLOGICAL: 0,
            BEHAVIORAL: 0,
          }
        })
      }

      const stats = statsMap.get(studentId)!
      stats.totalSessions++
      stats.typeBreakdown[session.type]++

      // 가장 최근 상담 날짜 업데이트
      if (!stats.lastSessionDate || session.sessionDate > stats.lastSessionDate) {
        stats.lastSessionDate = session.sessionDate
      }
    })

    const data = Array.from(statsMap.values()).sort((a, b) => {
      // 상담 횟수 내림차순 정렬
      return b.totalSessions - a.totalSessions
    })

    return ok(data)
  } catch (error) {
    logger.error({ err: error }, 'Error fetching student cumulative stats')
    return fail("학생별 누적 통계 조회에 실패했습니다.")
  }
}

/**
 * 상담 유형별 분포 조회
 *
 * RBAC: TEACHER - 자신의 상담만 조회 가능
 *       TEAM_LEADER - 팀 내 상담 조회 가능
 *       MANAGER, DIRECTOR - 권한에 따라 상담 조회 가능
 */
export async function getCounselingTypeDistributionAction(params?: {
  dateFrom?: string
  dateTo?: string
  teacherId?: string
}): Promise<ActionResult<TypeDistribution[]>> {
  const session = await verifySession()
  if (!session) {
    return fail("인증이 필요합니다.")
  }

  const rbacDb = getRBACPrisma(session)

  try {
    // 필터링 조건 설정
    const whereClause: Prisma.CounselingSessionWhereInput = {}

    // teacherId 필터
    if (params?.teacherId) {
      if (session.role === "TEACHER" && session.userId !== params.teacherId) {
        return fail("자신의 상담만 조회할 수 있습니다.")
      }
      whereClause.teacherId = params.teacherId
    }

    // 날짜 필터
    if (params?.dateFrom || params?.dateTo) {
      whereClause.sessionDate = {}
      if (params.dateFrom) {
        whereClause.sessionDate.gte = new Date(params.dateFrom)
      }
      if (params.dateTo) {
        whereClause.sessionDate.lte = new Date(params.dateTo)
      }
    }

    // 상담 세션 조회 (RBAC 자동 적용됨)
    const sessions = await rbacDb.counselingSession.findMany({
      where: whereClause,
      select: {
        type: true,
      }
    })

    // 유형별 집계
    const typeCount: Record<CounselingType, number> = {
      ACADEMIC: 0,
      CAREER: 0,
      PSYCHOLOGICAL: 0,
      BEHAVIORAL: 0,
    }

    sessions.forEach((session) => {
      typeCount[session.type]++
    })

    const totalCount = sessions.length

    // TypeDistribution 배열 생성 (비율 계산 포함)
    const data: TypeDistribution[] = Object.entries(typeCount).map(([type, count]) => ({
      type: type as CounselingType,
      count,
      percentage: totalCount > 0 ? Math.round((count / totalCount) * 1000) / 10 : 0
    }))

    return ok(data)
  } catch (error) {
    logger.error({ err: error }, 'Error fetching counseling type distribution')
    return fail("상담 유형별 분포 조회에 실패했습니다.")
  }
}

/**
 * 월별 상담 추이 조회
 *
 * RBAC: TEACHER - 자신의 상담만 조회 가능
 *       TEAM_LEADER - 팀 내 상담 조회 가능
 *       MANAGER, DIRECTOR - 권한에 따라 상담 조회 가능
 */
export async function getMonthlyTrendAction(params?: {
  months?: number
  teacherId?: string
}): Promise<ActionResult<MonthlyTrend[]>> {
  const session = await verifySession()
  if (!session) {
    return fail("인증이 필요합니다.")
  }

  const rbacDb = getRBACPrisma(session)

  try {
    const months = params?.months ?? 6
    const now = new Date()
    const startDate = startOfMonth(subMonths(now, months - 1))

    // 필터링 조건 설정
    const whereClause: Prisma.CounselingSessionWhereInput = {
      sessionDate: {
        gte: startDate
      }
    }

    // teacherId 필터
    if (params?.teacherId) {
      if (session.role === "TEACHER" && session.userId !== params.teacherId) {
        return fail("자신의 상담만 조회할 수 있습니다.")
      }
      whereClause.teacherId = params.teacherId
    }

    // 상담 세션 조회 (RBAC 자동 적용됨)
    const sessions = await rbacDb.counselingSession.findMany({
      where: whereClause,
      select: {
        sessionDate: true,
        type: true,
      }
    })

    // 월별 집계
    const trendMap = new Map<string, MonthlyTrend>()

    // 빈 월도 포함하도록 초기화
    for (let i = 0; i < months; i++) {
      const date = subMonths(now, months - 1 - i)
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      const key = `${year}-${String(month).padStart(2, '0')}`

      trendMap.set(key, {
        year,
        month,
        label: key,
        count: 0,
        byType: {
          ACADEMIC: 0,
          CAREER: 0,
          PSYCHOLOGICAL: 0,
          BEHAVIORAL: 0,
        }
      })
    }

    // 실제 데이터로 집계
    sessions.forEach((session) => {
      const date = new Date(session.sessionDate)
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      const key = `${year}-${String(month).padStart(2, '0')}`

      const trend = trendMap.get(key)
      if (trend) {
        trend.count++
        trend.byType![session.type]++
      }
    })

    const data = Array.from(trendMap.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year
      return a.month - b.month
    })

    return ok(data)
  } catch (error) {
    logger.error({ err: error }, 'Error fetching monthly trend')
    return fail("월별 상담 추이 조회에 실패했습니다.")
  }
}
