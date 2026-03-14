"use server"

import { verifySession } from "@/lib/dal"
import { getRBACPrisma } from "@/lib/db/common/rbac"
import { ok, fail, type ActionResult } from "@/lib/errors/action-result"
import { logger } from "@/lib/logger"

export type GradeTrendPoint = {
  date: string
  avgScore: number
  count: number
}

/**
 * 기간별 성적 트렌드 데이터 집계
 * GradeHistory에서 날짜별 평균 점수를 계산합니다.
 */
export async function getGradeTrendAction(
  startDate: string,
  endDate: string
): Promise<ActionResult<GradeTrendPoint[]>> {
  try {
    const session = await verifySession()
    const rbacDb = getRBACPrisma(session)

    const grades = await rbacDb.gradeHistory.findMany({
      where: {
        testDate: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      select: {
        testDate: true,
        normalizedScore: true,
      },
      orderBy: { testDate: "asc" },
    })

    if (grades.length === 0) {
      return ok([])
    }

    // 날짜별 그룹핑 후 평균 계산
    const grouped = new Map<string, { total: number; count: number }>()

    for (const grade of grades) {
      const dateKey = new Date(grade.testDate).toLocaleDateString("ko-KR", {
        month: "short",
        day: "numeric",
      })
      const existing = grouped.get(dateKey) || { total: 0, count: 0 }
      existing.total += grade.normalizedScore
      existing.count += 1
      grouped.set(dateKey, existing)
    }

    const trendData: GradeTrendPoint[] = Array.from(grouped.entries()).map(
      ([date, { total, count }]) => ({
        date,
        avgScore: Math.round((total / count) * 10) / 10,
        count,
      })
    )

    return ok(trendData)
  } catch (error) {
    logger.error({ err: error }, "Failed to get grade trend")
    return fail("성적 트렌드를 불러오는 중 오류가 발생했습니다.")
  }
}
