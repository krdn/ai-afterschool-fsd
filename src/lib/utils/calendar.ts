import { startOfMonth, endOfMonth, format } from "date-fns"
import type { ReservationWithRelations } from "@/components/counseling/ReservationCard"

/**
 * 예약 목록을 날짜별로 그룹화
 *
 * @param reservations - 예약 목록
 * @param month - 기준 월
 * @returns Map<날짜키(YYYY-MM-DD), 예약목록>
 */
export function groupReservationsByDate(
  reservations: ReservationWithRelations[],
  month: Date
): Map<string, ReservationWithRelations[]> {
  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)

  const grouped = new Map<string, ReservationWithRelations[]>()

  for (const reservation of reservations) {
    const reservationDate = new Date(reservation.scheduledAt)

    // 월 범위 내인지 확인
    if (reservationDate >= monthStart && reservationDate <= monthEnd) {
      const dateKey = format(reservationDate, "yyyy-MM-dd")

      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, [])
      }

      grouped.get(dateKey)!.push(reservation)
    }
  }

  return grouped
}

/**
 * 날짜별 예약 건수 계산
 *
 * @param reservations - 예약 목록
 * @param month - 기준 월
 * @returns Map<날짜키(YYYY-MM-DD), 예약건수>
 */
export function getReservationCountByDate(
  reservations: ReservationWithRelations[],
  month: Date
): Map<string, number> {
  const grouped = groupReservationsByDate(reservations, month)

  const counts = new Map<string, number>()

  for (const [dateKey, reservations] of grouped) {
    counts.set(dateKey, reservations.length)
  }

  return counts
}
