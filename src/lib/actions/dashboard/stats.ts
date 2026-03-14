"use server"

import { verifySession } from "@/lib/dal"
import { db } from "@/lib/db/client"
import { getRBACPrisma } from "@/lib/db/common/rbac"
import { ok, fail, type ActionResult } from "@/lib/errors/action-result"
import { logger } from "@/lib/logger"
import { startOfWeek, endOfWeek } from "date-fns"

// --- 타입 정의 ---

export type DashboardStats = {
  totalStudents: number
  totalTeachers: number
  unassignedStudents: number
  weeklyCounselingSessions: number
  recentIssuesCount: number
}

/**
 * 대시보드 핵심 KPI 통계 조회
 *
 * RBAC:
 *  - DIRECTOR/MANAGER: 전체 통계
 *  - TEAM_LEADER: 팀 내 통계
 *  - TEACHER: 담당 학생 기준 통계
 */
export async function getDashboardStatsAction(): Promise<ActionResult<DashboardStats>> {
  const session = await verifySession()

  try {
    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }) // 월요일 시작
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

    const rbacDb = getRBACPrisma(session)

    // 병렬 쿼리 (개별 실패 방어)
    const [
      studentsResult,
      teachersResult,
      unassignedResult,
      counselingResult,
      issuesResult,
    ] = await Promise.allSettled([
      // 학생 수 (RBAC 적용)
      rbacDb.student.count(),
      // 교사 수 (전체)
      db.teacher.count(),
      // 미배정 학생 수
      rbacDb.student.count({ where: { teacherId: null } }),
      // 이번 주 상담 세션 수
      rbacDb.counselingSession.count({
        where: {
          sessionDate: { gte: weekStart, lte: weekEnd },
        },
      }),
      // 미해결 이슈 수
      db.issue.count({
        where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
      }),
    ])

    const stats: DashboardStats = {
      totalStudents: studentsResult.status === "fulfilled" ? studentsResult.value : 0,
      totalTeachers: teachersResult.status === "fulfilled" ? teachersResult.value : 0,
      unassignedStudents: unassignedResult.status === "fulfilled" ? unassignedResult.value : 0,
      weeklyCounselingSessions: counselingResult.status === "fulfilled" ? counselingResult.value : 0,
      recentIssuesCount: issuesResult.status === "fulfilled" ? issuesResult.value : 0,
    }

    return ok(stats)
  } catch (error) {
    logger.error({ err: error }, "Failed to fetch dashboard stats")
    return fail("대시보드 통계 조회에 실패했습니다.")
  }
}
