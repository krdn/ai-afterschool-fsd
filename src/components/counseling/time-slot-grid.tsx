"use client"

import { format } from "date-fns"
import { ko } from "date-fns/locale"

interface TimeSlotGridProps {
  selectedDate: Date | undefined
  selectedTime: string | undefined
  onSelectTime: (time: string) => void
  reservedSlots: string[] // "09:00", "09:30" 형식
  startHour?: number // 기본값: 9
  endHour?: number // 기본값: 18
}

export function TimeSlotGrid({
  selectedDate,
  selectedTime,
  onSelectTime,
  reservedSlots,
  startHour = 9,
  endHour = 18,
}: TimeSlotGridProps) {
  // 30분 단위 슬롯 생성
  const slots: string[] = []
  for (let hour = startHour; hour < endHour; hour++) {
    slots.push(`${String(hour).padStart(2, "0")}:00`)
    slots.push(`${String(hour).padStart(2, "0")}:30`)
  }

  return (
    <div className="space-y-3">
      {selectedDate && (
        <p className="text-sm text-gray-600">
          {format(selectedDate, "M월 d일 E요일", { locale: ko })} 시간 선택
        </p>
      )}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
        {slots.map((slot) => {
          const isReserved = reservedSlots.includes(slot)
          const isSelected = selectedTime === slot

          return (
            <button
              key={slot}
              type="button"
              disabled={isReserved}
              onClick={() => onSelectTime(slot)}
              aria-label={`${slot}시${isReserved ? " (예약됨)" : ""}`}
              className={`
                px-3 py-2 text-sm rounded-lg font-medium transition-all
                ${isSelected
                  ? "bg-blue-600 text-white shadow-md"
                  : isReserved
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                }
              `}
            >
              {slot}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default TimeSlotGrid
