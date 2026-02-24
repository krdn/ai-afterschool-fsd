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
            "w-9 text-sm font-medium text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
          row: "flex w-full mt-2",
          cell: "p-0 relative text-center text-sm focus-within:relative focus-within:z-20",
          day: cn(
            "h-9 w-9 p-0 font-normal flex items-center justify-center rounded-md",
            "hover:bg-accent hover:text-accent-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "transition-colors"
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

export default ReservationCalendar
