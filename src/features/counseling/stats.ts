/**
 * 상담 통계 유틸리티
 *
 * 상담 세션 데이터로부터 통계를 계산하는 순수 함수들입니다.
 * DB 의존성 없음 - apps/web에서 데이터를 조회한 후 이 함수들에 전달합니다.
 */

import type {
  CounselingSession,
  CounselingType,
  TypeDistribution,
  MonthlyTrend,
  FollowUpItem,
  FollowUpStatus,
} from "./types"

const COUNSELING_TYPES: CounselingType[] = [
  "ACADEMIC", "CAREER", "PSYCHOLOGICAL", "BEHAVIORAL",
]

/**
 * 상담 유형별 분포 계산
 */
export function calculateTypeDistribution(sessions: CounselingSession[]): TypeDistribution[] {
  const total = sessions.length
  if (total === 0) {
    return COUNSELING_TYPES.map((type) => ({ type, count: 0, percentage: 0 }))
  }

  const counts: Record<CounselingType, number> = {
    ACADEMIC: 0, CAREER: 0, PSYCHOLOGICAL: 0, BEHAVIORAL: 0,
  }

  for (const session of sessions) {
    if (session.type in counts) {
      counts[session.type]++
    }
  }

  return COUNSELING_TYPES.map((type) => ({
    type,
    count: counts[type],
    percentage: Math.round((counts[type] / total) * 1000) / 10,
  }))
}

/**
 * 월별 상담 추이 계산
 *
 * @param sessions - 상담 세션 목록
 * @param months - 포함할 월 수 (기본: 6)
 */
export function calculateMonthlyTrend(
  sessions: CounselingSession[],
  months: number = 6
): MonthlyTrend[] {
  const now = new Date()
  const trends: MonthlyTrend[] = []

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = date.getFullYear()
    const month = date.getMonth() + 1

    const byType: Record<CounselingType, number> = {
      ACADEMIC: 0, CAREER: 0, PSYCHOLOGICAL: 0, BEHAVIORAL: 0,
    }

    let count = 0
    for (const session of sessions) {
      const sessionDate = new Date(session.sessionDate)
      if (sessionDate.getFullYear() === year && sessionDate.getMonth() + 1 === month) {
        count++
        if (session.type in byType) {
          byType[session.type]++
        }
      }
    }

    trends.push({
      year,
      month,
      label: `${year}-${String(month).padStart(2, "0")}`,
      count,
      byType,
    })
  }

  return trends
}

/**
 * 후속 조치 상태 판별
 */
export function determineFollowUpStatus(
  followUpDate: Date | null,
  satisfactionScore: number | null
): FollowUpStatus {
  if (satisfactionScore !== null) return "completed"
  if (followUpDate && new Date(followUpDate) < new Date()) return "overdue"
  return "pending"
}

/**
 * 후속 조치 목록 필터링 및 상태 계산
 */
export function processFollowUps(
  items: FollowUpItem[],
  includeCompleted: boolean = false
): FollowUpItem[] {
  if (includeCompleted) return items
  return items.filter((item) => item.status !== "completed")
}

/**
 * 지연된 후속 조치 개수 계산
 */
export function countOverdueFollowUps(items: FollowUpItem[]): number {
  return items.filter((item) => item.status === "overdue").length
}

/**
 * 상담 유형 한글 표시명
 */
export function getCounselingTypeLabel(type: CounselingType): string {
  const labels: Record<CounselingType, string> = {
    ACADEMIC: "학업 상담",
    CAREER: "진로 상담",
    PSYCHOLOGICAL: "심리 상담",
    BEHAVIORAL: "행동 상담",
  }
  return labels[type] || type
}

/**
 * 예약 상태 한글 표시명
 */
export function getReservationStatusLabel(
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW"
): string {
  const labels = {
    SCHEDULED: "예약됨",
    COMPLETED: "완료",
    CANCELLED: "취소",
    NO_SHOW: "불참",
  }
  return labels[status] || status
}
