"use server"

import { verifySession } from "@/lib/dal"
import { getRBACPrisma } from "@/lib/db/common/rbac"
import { ok, fail, type ActionResult } from "@/lib/errors/action-result"
import { logger } from "@/lib/logger"

export type ActivityItem = {
  id: string
  type: "counseling" | "grade"
  date: Date
  studentName: string
  description: string
}

/**
 * 대시보드 최근 활동 조회
 * 최근 상담 기록 + 성적 입력 이력을 시간순으로 통합
 */
export async function getRecentActivityAction(): Promise<ActionResult<ActivityItem[]>> {
  try {
    const session = await verifySession()
    const rbacDb = getRBACPrisma(session)

    const [counselings, grades] = await Promise.all([
      rbacDb.counselingSession.findMany({
        select: {
          id: true,
          sessionDate: true,
          type: true,
          summary: true,
          student: { select: { name: true } },
        },
        orderBy: { sessionDate: "desc" },
        take: 7,
      }),
      rbacDb.gradeHistory.findMany({
        select: {
          id: true,
          createdAt: true,
          subject: true,
          score: true,
          gradeType: true,
          student: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 7,
      }),
    ])

    const gradeTypeLabels: Record<string, string> = {
      MIDTERM: "중간고사",
      FINAL: "기말고사",
      QUIZ: "쪽지시험",
      ASSIGNMENT: "수행평가",
    }

    const counselingTypeLabels: Record<string, string> = {
      ACADEMIC: "학업",
      CAREER: "진로",
      PERSONAL: "개인",
      BEHAVIORAL: "행동",
      PARENT: "학부모",
      OTHER: "기타",
    }

    const activities: ActivityItem[] = [
      ...counselings.map((c) => ({
        id: c.id,
        type: "counseling" as const,
        date: c.sessionDate,
        studentName: c.student.name,
        description: `${counselingTypeLabels[c.type] ?? c.type} 상담 · ${c.summary.slice(0, 40)}${c.summary.length > 40 ? "..." : ""}`,
      })),
      ...grades.map((g) => ({
        id: g.id,
        type: "grade" as const,
        date: g.createdAt,
        studentName: g.student.name,
        description: `${g.subject} ${gradeTypeLabels[g.gradeType] ?? g.gradeType} · ${g.score}점`,
      })),
    ]

    // 시간순 정렬 (최신순) 후 10건만
    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return ok(activities.slice(0, 10))
  } catch (error) {
    logger.error({ err: error }, "Failed to get recent activity")
    return fail("최근 활동을 불러오는 중 오류가 발생했습니다.")
  }
}
