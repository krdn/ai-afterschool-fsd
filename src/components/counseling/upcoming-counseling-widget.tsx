'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Calendar, ChevronDown } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

export interface UpcomingCounseling {
  id: string
  scheduledAt: Date
  student: { id: string; name: string }
  parent: { id: string; name: string; relation: string }
}

interface UpcomingCounselingWidgetProps {
  reservations: UpcomingCounseling[]
}

export function UpcomingCounselingWidget({
  reservations,
}: UpcomingCounselingWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const upcomingCount = reservations.length

  // 예약이 없는 경우
  if (upcomingCount === 0) {
    return (
      <Alert
        data-testid="upcoming-counseling-alert"
        variant="default"
        className="bg-muted/50"
      >
        <Calendar className="h-4 w-4" />
        <AlertTitle>다가오는 상담</AlertTitle>
        <AlertDescription>
          예정된 상담이 없습니다.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert data-testid="upcoming-counseling-alert">
      <Calendar className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between">
        <span>다가오는 상담</span>
        <span
          data-testid="upcoming-count"
          className="text-sm font-normal text-muted-foreground"
        >
          {upcomingCount}개 예정
        </span>
      </AlertTitle>
      <AlertDescription>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="space-y-2">
            <p>최근 7일 이내 {upcomingCount}개의 상담이 예정되어 있습니다.</p>

            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full">
                {isOpen ? '접기' : '목록 보기'}
                <ChevronDown
                  className={`ml-2 h-4 w-4 transition-transform ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <ul data-testid="counseling-list" className="space-y-2 mt-2">
                {reservations.map((reservation) => (
                  <li
                    key={reservation.id}
                    className="text-sm border-b last:border-0 pb-2 last:pb-0"
                  >
                    <div className="font-medium">
                      {reservation.student.name} 학생
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {format(
                          new Date(reservation.scheduledAt),
                          'M월 d일 E요일 HH:mm',
                          { locale: ko }
                        )}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </AlertDescription>
    </Alert>
  )
}
