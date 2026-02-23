"use client"

import { useState, useEffect } from "react"
import { getReservationsAction } from "@/lib/actions/counseling/reservations-query"
import { ReservationCalendarMonth } from "./ReservationCalendarMonth"
import { ReservationCalendarWeek } from "./ReservationCalendarWeek"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ReservationWithRelations } from "./ReservationCard"

type CalendarViewType = "month" | "week"

interface ReservationCalendarViewProps {
  initialDate?: Date
  onDateSelect?: (date: Date | undefined) => void
}

export function ReservationCalendarView({
  initialDate,
  onDateSelect,
}: ReservationCalendarViewProps) {
  const [viewType, setViewType] = useState<CalendarViewType>("month")
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate || new Date())
  const [reservations, setReservations] = useState<ReservationWithRelations[]>([])
  const [loading, setLoading] = useState(true)

  // 예약 데이터 페칭
  useEffect(() => {
    async function fetchReservations() {
      setLoading(true)
      try {
        // 월간/주간 모두 현재 월 기준으로 페칭 (주간 뷰에서 필터링)
        const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
        const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59)

        const result = await getReservationsAction({
          dateFrom: monthStart.toISOString(),
          dateTo: monthEnd.toISOString(),
        })

        if (result.success && result.data) {
          setReservations(result.data)
        }
      } catch (error) {
        console.error("Failed to fetch reservations:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchReservations()
  }, [selectedDate])

  // 날짜 선택 핸들러
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date)
      onDateSelect?.(date)
    }
  }

  // 월 변경 핸들러
  const handleMonthChange = (month: Date) => {
    setSelectedDate(month)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" data-testid="calendar-loading">
        <div className="text-muted-foreground">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4" data-testid="counseling-calendar">
      {/* 뷰 전환 버튼 */}
      <div className="flex items-center justify-center">
        <div className="inline-flex items-center rounded-lg bg-muted p-1">
          <Button
            variant={viewType === "month" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewType("month")}
            className={cn(
              "rounded-md",
              viewType === "month" && "shadow-sm"
            )}
          >
            월간
          </Button>
          <Button
            variant={viewType === "week" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewType("week")}
            className={cn(
              "rounded-md",
              viewType === "week" && "shadow-sm"
            )}
          >
            주간
          </Button>
        </div>
      </div>

      {/* 캘린더 뷰 렌더링 */}
      {viewType === "month" ? (
        <ReservationCalendarMonth
          reservations={reservations}
          selected={selectedDate}
          onSelect={handleDateSelect}
          onMonthChange={handleMonthChange}
        />
      ) : (
        <ReservationCalendarWeek
          weekStart={selectedDate}
          reservations={reservations}
        />
      )}
    </div>
  )
}

export default ReservationCalendarView
