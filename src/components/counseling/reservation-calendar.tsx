"use client"

import { DayPicker } from "react-day-picker"
import "react-day-picker/style.css"
import { ko } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface ReservationCalendarProps {
  selected: Date | undefined
  onSelect: (date: Date | undefined) => void
  disabled?: (date: Date) => boolean
  className?: string
}

export function ReservationCalendar({
  selected,
  onSelect,
  disabled,
  className,
}: ReservationCalendarProps) {
  return (
    <div className={cn("w-full", className)}>
      <DayPicker
        mode="single"
        selected={selected}
        onSelect={onSelect}
        disabled={disabled}
        locale={ko}
      />
    </div>
  )
}

export default ReservationCalendar
