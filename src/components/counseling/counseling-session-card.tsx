import type { CounselingSession, Student, Teacher } from '@/lib/db'
import { getTypeLabel, getTypeColor } from './utils'

export type CounselingSessionWithRelations = CounselingSession & {
  student: Student
  teacher: Teacher
}

interface CounselingSessionCardProps {
  session: CounselingSessionWithRelations
  onClick?: () => void
}

export function CounselingSessionCard({ session, onClick }: CounselingSessionCardProps) {
  const relativeTime = getRelativeTime(session.sessionDate)
  const typeLabel = getTypeLabel(session.type)
  const typeColor = getTypeColor(session.type)
  const satisfactionScore = session.satisfactionScore ?? undefined

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${session.student.name} 학생 ${typeLabel} 상담 기록 보기`}
      className="border rounded-lg p-4 space-y-3 hover:bg-gray-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick?.() } }}
      data-testid="counseling-session-card"
    >
      {/* Header: Date and Type */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">{relativeTime}</span>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeColor}`}
        >
          {typeLabel}
        </span>
      </div>

      {/* Session Details */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{session.teacher.name}</span>
          <span className="text-gray-400">·</span>
          <span className="text-gray-600">{session.duration}분</span>
        </div>

        <div className="text-sm text-gray-700">
          {session.summary.length > 100
            ? `${session.summary.substring(0, 100)}...`
            : session.summary}
        </div>

        {/* Footer: Follow-up and Satisfaction */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {session.followUpRequired && (
              <div className="flex items-center gap-1 text-amber-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                </svg>
                <span>
                  {session.followUpDate
                    ? `후속 상담: ${new Date(session.followUpDate).toLocaleDateString("ko-KR")}`
                    : "후속 조치 필요"}
                </span>
              </div>
            )}
          </div>

          {satisfactionScore !== undefined && (
            <div className="flex items-center gap-1 text-yellow-600" role="img" aria-label={`만족도 ${satisfactionScore}점`}>
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill={i < satisfactionScore ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function getRelativeTime(date: Date): string {
  const now = new Date()
  const diffInMs = now.getTime() - new Date(date).getTime()
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
  const diffInWeeks = Math.floor(diffInDays / 7)
  const diffInMonths = Math.floor(diffInDays / 30)

  if (diffInDays === 0) return "오늘"
  if (diffInDays === 1) return "어제"
  if (diffInDays < 7) return `${diffInDays}일 전`
  if (diffInWeeks < 4) return `${diffInWeeks}주 전`
  if (diffInMonths === 1) return "지난달"
  if (diffInMonths < 12) return `${diffInMonths}달 전`

  return `${new Date(date).getFullYear()}년 ${new Date(date).getMonth() + 1}월`
}

