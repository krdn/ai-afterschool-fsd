import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { Calendar } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CounselingHistoryList } from "./CounselingHistoryList"
import type { CounselingSessionWithRelations } from "./CounselingSessionCard"
import type { ReservationWithRelations } from "./ReservationCard"

interface CounselingSectionProps {
  sessions: CounselingSessionWithRelations[]
  upcomingReservation: ReservationWithRelations | null
}

export function CounselingSection({ sessions, upcomingReservation }: CounselingSectionProps) {
  return (
    <section>
      <h2 className="text-2xl font-bold mb-4">상담 이력</h2>

      {/* Upcoming reservation alert */}
      {upcomingReservation ? (
        <Alert className="mb-4 bg-blue-50 border-blue-200">
          <Calendar className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-900">다음 상담 예약</AlertTitle>
          <AlertDescription className="text-blue-800">
            {format(new Date(upcomingReservation.scheduledAt), "M월 d일 E요일 HH:mm", { locale: ko })}에{" "}
            {upcomingReservation.parent.name} ({upcomingReservation.parent.relation})와{" "}
            &quot;{upcomingReservation.topic}&quot; 주제로 상담이 예정되어 있습니다.
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Counseling history list with modal support */}
      <CounselingHistoryList sessions={sessions} />
    </section>
  )
}
