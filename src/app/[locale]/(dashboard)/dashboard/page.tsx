import { getTranslations } from "next-intl/server"
import { getCurrentTeacher } from "@/lib/dal"
import { getUpcomingCounseling } from "@/lib/actions/counseling/upcoming"
import { getDashboardStatsAction } from "@/lib/actions/dashboard/stats"
import { UpcomingCounselingWidget } from "@/components/counseling/upcoming-counseling-widget"
import { DashboardStatCards } from "@/components/dashboard/stat-cards"
import { QuickActions } from "@/components/dashboard/quick-actions"

export default async function DashboardPage() {
  const [teacher, statsResult, counselingResult, t] = await Promise.all([
    getCurrentTeacher(),
    getDashboardStatsAction(),
    getUpcomingCounseling(),
    getTranslations("Dashboard"),
  ])

  const stats = statsResult.success ? statsResult.data : null
  const upcomingReservations = counselingResult.success ? counselingResult.data || [] : []

  return (
    <div className="space-y-6">
      {/* 인사 + 빠른 액션 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">
            {t("welcome", { name: teacher.name })}
          </p>
        </div>
      </div>

      {/* 빠른 실행 버튼 */}
      <QuickActions role={teacher.role} />

      {/* KPI 통계 카드 */}
      {stats ? (
        <DashboardStatCards stats={stats} />
      ) : (
        <p className="text-sm text-destructive">{t("statsError")}</p>
      )}

      {/* 다가오는 상담 */}
      {upcomingReservations.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {t("upcomingCounseling")}
          </h2>
          <UpcomingCounselingWidget reservations={upcomingReservations} />
        </div>
      )}

      {upcomingReservations.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <p>{t("noUpcoming")}</p>
        </div>
      )}
    </div>
  )
}
