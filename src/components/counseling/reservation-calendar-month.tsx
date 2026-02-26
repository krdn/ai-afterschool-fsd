"use client"

import React, { useMemo, useRef } from "react"
import { DayPicker, DayButtonProps } from "react-day-picker"
import "react-day-picker/style.css"
import { ko } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { getReservationCountByDate } from "@/lib/utils/calendar"
import type { ReservationWithRelations } from "./reservation-card"

interface CustomDayButtonProps extends DayButtonProps {
  reservationCount?: number
}

/**
 * Custom DayButton 컴포넌트
 * 기본 button 엘리먼트를 직접 렌더링 (useDayPicker의 components.DayButton 재귀 방지)
 */
function CustomDayButton({ day, modifiers, reservationCount = 0, className, ...buttonProps }: CustomDayButtonProps) {
  const ref = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <button
      ref={ref}
      {...buttonProps}
      className={cn(
        className,
        "relative h-14 w-14 flex flex-col items-center justify-center"
      )}
    >
      <span>{day.date.getDate()}</span>
      {reservationCount > 0 && (
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
          {Array.from({ length: Math.min(reservationCount, 3) }).map((_, i) => (
            <span
              key={i}
              className="h-1 w-1 rounded-full bg-primary"
              aria-hidden="true"
            />
          ))}
        </div>
      )}
    </button>
  )
}

interface ReservationCalendarMonthProps {
  reservations: ReservationWithRelations[]
  selected?: Date
  displayMonth?: Date
  onSelect?: (date: Date | undefined) => void
  onMonthChange?: (month: Date) => void
  className?: string
}

/**
 * 월간 캘린더 뷰 컴포넌트
 * 각 날짜에 예약 건수를 dot indicators로 표시
 */
export function ReservationCalendarMonth({
  reservations,
  selected,
  displayMonth: controlledMonth,
  onSelect,
  onMonthChange,
  className,
}: ReservationCalendarMonthProps) {
  // displayMonth를 기준으로 예약 건수 계산 (selected 의존 제거로 무한 루프 방지)
  const monthForCount = controlledMonth || selected || new Date()
  const reservationCounts = useMemo(
    () => getReservationCountByDate(reservations, monthForCount),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reservations, monthForCount.getFullYear(), monthForCount.getMonth()]
  )

  const reservedDates = useMemo(
    () => reservations.map((r) => new Date(r.scheduledAt)),
    [reservations]
  )

  // reservationCounts를 ref로 관리하여 components의 useMemo 의존성에서 제거
  const reservationCountsRef = useRef(reservationCounts)
  reservationCountsRef.current = reservationCounts

  // DayPicker의 components prop - 안정적인 참조 유지
  // reservationCountsRef를 사용하여 의존성 없이 최신 데이터 접근
  const dayPickerComponents = useMemo(
    () => ({
      DayButton: (props: DayButtonProps) => {
        const dateKey = props.day.date.toISOString().split("T")[0]
        const count = reservationCountsRef.current.get(dateKey) || 0
        return <CustomDayButton {...props} reservationCount={count} />
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const modifiers = useMemo(
    () => ({ reserved: reservedDates }),
    [reservedDates]
  )

  return (
    <div className={cn("w-full", className)}>
      <DayPicker
        mode="single"
        selected={selected}
        month={controlledMonth}
        onSelect={onSelect}
        onMonthChange={onMonthChange}
        locale={ko}
        components={dayPickerComponents}
        modifiers={modifiers}
        modifiersClassNames={{
          reserved: "bg-primary/10 border-primary/50",
        }}
        classNames={{
          // react-day-picker v9 classNames 키
          month_caption: "flex justify-center pt-1 relative items-center mb-4",
          caption_label: "text-sm font-medium",
          nav: "absolute top-0 right-0 flex items-center gap-1",
          button_previous: cn(
            "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:pointer-events-none disabled:opacity-50",
            "h-7 w-7 bg-transparent hover:bg-accent hover:text-accent-foreground"
          ),
          button_next: cn(
            "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:pointer-events-none disabled:opacity-50",
            "h-7 w-7 bg-transparent hover:bg-accent hover:text-accent-foreground"
          ),
          month_grid: "w-full border-collapse",
          weekdays: "",
          weekday: "w-14 text-sm font-normal text-muted-foreground text-center p-2",
          week: "",
          day: "p-0 relative text-center text-sm focus-within:relative focus-within:z-20",
          day_button: cn(
            "h-14 w-14 p-0 font-normal flex items-center justify-center rounded-md",
            "hover:bg-accent hover:text-accent-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "transition-colors relative"
          ),
          selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          today: "bg-accent text-accent-foreground",
          outside: "text-muted-foreground opacity-50",
          disabled: "text-muted-foreground opacity-50",
          hidden: "invisible",
        }}
      />
    </div>
  )
}

export default ReservationCalendarMonth
