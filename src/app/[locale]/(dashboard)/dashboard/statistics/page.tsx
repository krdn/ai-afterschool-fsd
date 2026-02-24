import { StatisticsDashboard } from "@/components/statistics/statistics-dashboard"
import {
  getTeacherMonthlyStatsAction,
  getCounselingTypeDistributionAction,
  getMonthlyTrendAction,
} from "@/lib/actions/counseling/stats"
import { getDateRangeFromPreset } from "@/shared"
import { getFollowUpsAction, getOverdueCountAction } from "@/lib/actions/counseling/follow-up"
import { getReservationStatsAction } from "@/lib/actions/counseling/reservations-query"
import { startOfMonth, endOfMonth } from "date-fns"

/**
 * 통계 대시보드 페이지 (Server Component)
 *
 * 초기 데이터를 Server-side에서 fetch하여 StatisticsDashboard로 전달합니다.
 */
export default async function StatisticsPage() {
  // 기본 기간: 최근 6개월
  const dateRange = getDateRangeFromPreset('6M')

  // 이번 달 범위 (완료율 계산용)
  const now = new Date()
  const thisMonthStart = startOfMonth(now)
  const thisMonthEnd = endOfMonth(now)

  // 병렬 데이터 fetch
  const [
    teacherStatsRes,
    typeDistributionRes,
    monthlyTrendRes,
    followUpsRes,
    overdueCountRes,
    reservationStatsRes,
    thisMonthStatsRes,
  ] = await Promise.all([
    // 선생님별 월간 통계 (최근 6개월)
    getTeacherMonthlyStatsAction({
      dateFrom: dateRange.start.toISOString(),
      dateTo: dateRange.end.toISOString(),
    }),
    // 유형별 분포 (최근 6개월)
    getCounselingTypeDistributionAction({
      dateFrom: dateRange.start.toISOString(),
      dateTo: dateRange.end.toISOString(),
    }),
    // 월별 추이 (최근 6개월)
    getMonthlyTrendAction({ months: 6 }),
    // 후속 조치 목록 (이번 주)
    getFollowUpsAction({ scope: 'week' }),
    // 지연된 후속 조치 개수
    getOverdueCountAction(),
    // 예약 통계 (대기 예약 수)
    getReservationStatsAction(),
    // 이번 달 통계 (완료율 계산용)
    getTeacherMonthlyStatsAction({
      dateFrom: thisMonthStart.toISOString(),
      dateTo: thisMonthEnd.toISOString(),
    }),
  ])

  // 데이터 추출 (실패 시 기본값 사용)
  const teacherStats = (teacherStatsRes.success && teacherStatsRes.data) ? teacherStatsRes.data : []
  const typeDistribution = (typeDistributionRes.success && typeDistributionRes.data) ? typeDistributionRes.data : []
  const monthlyTrend = (monthlyTrendRes.success && monthlyTrendRes.data) ? monthlyTrendRes.data : []
  const followUps = (followUpsRes.success && followUpsRes.data) ? followUpsRes.data : []
  const overdueFollowUpCount = (overdueCountRes.success && overdueCountRes.data) ? overdueCountRes.data.count : 0
  const reservationStats = (reservationStatsRes.success && reservationStatsRes.data) ? reservationStatsRes.data : null
  const thisMonthStats = (thisMonthStatsRes.success && thisMonthStatsRes.data) ? thisMonthStatsRes.data : []

  // 이번 달 상담 횟수 계산
  const monthlySessionCount = thisMonthStats.reduce((sum, stat) => sum + stat.sessionCount, 0)

  // 대기 예약 수 (SCHEDULED 상태)
  const pendingReservationCount = reservationStats?.SCHEDULED ?? 0

  // 완료율 계산 (이번 달 완료 / 이번 달 전체 * 100)
  // Note: 완료 = COMPLETED 상태의 예약이 CounselingSession으로 전환된 것
  // 현재는 간단하게 이번 달 상담 횟수 / (이번 달 상담 + 대기 예약) * 100으로 계산
  const totalThisMonth = monthlySessionCount + pendingReservationCount
  const completionRate = totalThisMonth > 0
    ? Math.round((monthlySessionCount / totalThisMonth) * 100)
    : 0

  // StatisticsDashboard에 전달할 데이터
  const initialStats = {
    monthlySessionCount,
    pendingReservationCount,
    overdueFollowUpCount,
    completionRate,
    teacherStats,
    typeDistribution,
    monthlyTrend,
  }

  return (
    <StatisticsDashboard
      initialStats={initialStats}
      initialFollowUps={followUps}
    />
  )
}
