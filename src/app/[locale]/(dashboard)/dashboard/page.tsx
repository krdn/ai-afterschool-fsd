import { getTranslations } from "next-intl/server"
import { getCurrentTeacher } from "@/lib/dal"
import { getUpcomingCounseling } from "@/lib/actions/counseling/upcoming"
import { getDashboardStatsAction } from "@/lib/actions/dashboard/stats"
import { UpcomingCounselingWidget } from "@/components/counseling/upcoming-counseling-widget"
import { DashboardStatCards } from "@/components/dashboard/stat-cards"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { AlertTriangle } from "lucide-react"
import { Link } from "@/i18n/navigation"

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

      {/* 주의 배너: 미배정 학생 */}
      {stats && stats.unassignedStudents > 0 && (
        <Link
          href="/matching"
          className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4 transition-colors hover:bg-amber-100 dark:hover:bg-amber-950/50"
        >
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              미배정 학생 {stats.unassignedStudents}명
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              배정 관리 페이지에서 선생님을 배정해주세요
            </p>
          </div>
        </Link>
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
