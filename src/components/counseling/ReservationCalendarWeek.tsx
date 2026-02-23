"use client"

import { startOfWeek, endOfWeek, format, isSameDay } from "date-fns"
import { ko } from "date-fns/locale"
import { cn } from "@/lib/utils"
import type { ReservationWithRelations } from "./ReservationCard"

// 영업시간 (9:00 ~ 18:00, 30분 단위)
const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
]

// 요일 한글 표시
const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"]

interface ReservationCalendarWeekProps {
  weekStart: Date // 주간 뷰 기준 날짜
  reservations: ReservationWithRelations[]
  className?: string
}

export function ReservationCalendarWeek({
  weekStart,
  reservations,
  className,
}: ReservationCalendarWeekProps) {
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })

  // 주간 날짜 배열 생성 (월~일)
  const weekDates: Date[] = []
  let current = startOfWeek(weekStart, { weekStartsOn: 1 })

  while (current <= weekEnd) {
    weekDates.push(new Date(current))
    current = new Date(current.getTime() + 86400000) // +1 day
  }

  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      {/* 요일 헤더 */}
      <div className="grid grid-cols-8 border-b bg-muted">
        <div className="p-2 text-sm font-medium text-center">시간</div>
        {weekDates.map((date, index) => (
          <div key={date.toISOString()} className="p-2 text-center border-l">
            <div className="text-xs text-muted-foreground">
              {WEEKDAY_LABELS[index]}
            </div>
            <div className="text-sm font-medium">
              {format(date, "M/d", { locale: ko })}
            </div>
          </div>
        ))}
      </div>

      {/* 시간 슬롯 그리드 */}
      <div className="max-h-96 overflow-y-auto">
        {TIME_SLOTS.map((time) => (
          <div key={time} className="grid grid-cols-8 border-b last:border-b-0">
            {/* 시간 라벨 */}
            <div className="p-2 text-xs text-muted-foreground text-center border-r">
              {time}
            </div>

            {/* 요일별 슬롯 */}
            {weekDates.map((date) => {
              // 해당 날짜와 시간의 예약 찾기
              const [hour, minute] = time.split(":").map(Number)
              const slotDateTime = new Date(
                date.getFullYear(),
                date.getMonth(),
                date.getDate(),
                hour,
                minute
              )

              const reservation = reservations.find((r) => {
                const reservationDate = new Date(r.scheduledAt)
                return (
                  isSameDay(reservationDate, slotDateTime) &&
                  reservationDate.getHours() === slotDateTime.getHours() &&
                  reservationDate.getMinutes() === slotDateTime.getMinutes()
                )
              })

              return (
                <div
                  key={date.toISOString()}
                  className={cn(
                    "p-2 border-l text-xs text-center min-h-[40px] flex items-center justify-center",
                    reservation && "bg-primary/10 font-medium"
                  )}
                >
                  {reservation ? (
                    <span className="truncate" title={reservation.student.name}>
                      {reservation.student.name}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export default ReservationCalendarWeek
