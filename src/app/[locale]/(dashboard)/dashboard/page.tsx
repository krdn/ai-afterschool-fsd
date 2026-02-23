import { getUpcomingCounseling } from '@/lib/actions/counseling/upcoming'
import { UpcomingCounselingWidget } from '@/components/counseling/UpcomingCounselingWidget'

export default async function DashboardPage() {
  const result = await getUpcomingCounseling()
  const upcomingReservations = result.success ? result.data || [] : []

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* 페이지 타이틀 */}
      <div>
        <h1 className="text-2xl font-bold">대시보드</h1>
        <p className="text-muted-foreground">환영합니다!</p>
      </div>

      {/* 다가오는 상담 알림 위젯 */}
      {upcomingReservations.length > 0 && (
        <UpcomingCounselingWidget reservations={upcomingReservations} />
      )}

      {/* 빈 상태 메시지 */}
      {upcomingReservations.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>최근 7일 이내 예정된 상담이 없습니다.</p>
        </div>
      )}
    </div>
  )
}
