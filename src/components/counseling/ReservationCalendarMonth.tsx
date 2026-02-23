"use client"

import { DayPicker, DayButtonProps, UI, useDayPicker } from "react-day-picker"
import "react-day-picker/style.css"
import { ko } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { getReservationCountByDate } from "@/lib/utils/calendar"
import type { ReservationWithRelations } from "./ReservationCard"

interface CustomDayButtonProps extends DayButtonProps {
  reservationCount?: number
}

/**
 * Custom DayButton 컴포넌트
 * 예약 건수를 dot indicators로 표시
 */
function CustomDayButton({ day, reservationCount = 0, ...buttonProps }: CustomDayButtonProps) {
  const { components, classNames } = useDayPicker()

  return (
    <components.DayButton
      {...buttonProps}
      day={day}
      className={cn(
        classNames?.[UI.DayButton],
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
    </components.DayButton>
  )
}

interface ReservationCalendarMonthProps {
  reservations: ReservationWithRelations[]
  selected?: Date
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
  onSelect,
  onMonthChange,
  className,
}: ReservationCalendarMonthProps) {
  const reservationCounts = getReservationCountByDate(reservations, selected || new Date())
  const reservedDates = reservations.map((r) => new Date(r.scheduledAt))

  return (
    <div className={cn("w-full", className)}>
      <DayPicker
        mode="single"
        selected={selected}
        onSelect={onSelect}
        onMonthChange={onMonthChange}
        locale={ko}
        components={{
          DayButton: (props) => {
            const dateKey = props.day.date.toISOString().split("T")[0]
            const count = reservationCounts.get(dateKey) || 0

            return <CustomDayButton {...props} reservationCount={count} />
          },
        }}
        modifiers={{
          reserved: reservedDates,
        }}
        modifiersClassNames={{
          reserved: "bg-primary/10 border-primary/50",
        }}
        classNames={{
          nav: "flex items-center space-x-1",
          month: "space-y-4",
          caption: "flex justify-center pt-1 relative items-center",
          caption_label: "text-sm font-medium",
          nav_button: cn(
            "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:pointer-events-none disabled:opacity-50",
            "h-7 w-7 bg-transparent hover:bg-accent hover:text-accent-foreground"
          ),
          nav_button_previous: "absolute left-1",
          nav_button_next: "absolute right-1",
          table: "w-full border-collapse",
          head_row: "flex",
          head_cell:
            "w-14 text-sm font-medium text-muted-foreground rounded-md w-14 font-normal text-[0.8rem]",
          row: "flex w-full mt-2",
          cell: "p-0 relative text-center text-sm focus-within:relative focus-within:z-20",
          day: cn(
            "h-14 w-14 p-0 font-normal flex items-center justify-center rounded-md",
            "hover:bg-accent hover:text-accent-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "transition-colors relative"
          ),
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "bg-accent text-accent-foreground",
          day_outside: "text-muted-foreground opacity-50",
          day_disabled: "text-muted-foreground opacity-50",
          day_range_middle:
            "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
        }}
      />
    </div>
  )
}

export default ReservationCalendarMonth
