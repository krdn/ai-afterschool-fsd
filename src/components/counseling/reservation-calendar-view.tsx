"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { getReservationsAction } from "@/lib/actions/counseling/reservations-query"
import { ReservationCalendarMonth } from "./reservation-calendar-month"
import { ReservationCalendarWeek } from "./reservation-calendar-week"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ReservationWithRelations } from "./reservation-card"

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
  const [displayMonth, setDisplayMonth] = useState<Date>(initialDate || new Date())
  const [reservations, setReservations] = useState<ReservationWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const abortControllerRef = useRef<AbortController | null>(null)

  // 연/월이 변경될 때만 데이터 페칭 (Date 참조 비교 방지)
  const yearMonth = `${displayMonth.getFullYear()}-${displayMonth.getMonth()}`

  useEffect(() => {
    // 이전 요청 취소
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    async function fetchReservations() {
      setLoading(true)
      try {
        const monthStart = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), 1)
        const monthEnd = new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 0, 23, 59, 59)

        const result = await getReservationsAction({
          dateFrom: monthStart.toISOString(),
          dateTo: monthEnd.toISOString(),
        })

        if (!controller.signal.aborted && result.success && result.data) {
          setReservations(result.data)
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Failed to fetch reservations:", error)
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchReservations()

    return () => controller.abort()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearMonth])

  // 날짜 선택 핸들러
  const handleDateSelect = useCallback((date: Date | undefined) => {
    if (date) {
      setSelectedDate(date)
      onDateSelect?.(date)
    }
  }, [onDateSelect])

  // 월 변경 핸들러 (날짜 선택과 분리 - 데이터 페칭만 트리거)
  const handleMonthChange = useCallback((month: Date) => {
    setDisplayMonth(month)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" data-testid="calendar-loading">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">로딩 중...</span>
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
          displayMonth={displayMonth}
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
