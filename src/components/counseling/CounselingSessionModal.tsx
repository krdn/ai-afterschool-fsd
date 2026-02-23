"use client"

import { format } from "date-fns"
import { ko } from "date-fns/locale"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { CounselingSessionWithRelations } from "./CounselingSessionCard"

interface CounselingSessionModalProps {
  session: CounselingSessionWithRelations
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CounselingSessionModal({ session, open, onOpenChange }: CounselingSessionModalProps) {
  const typeLabel = getTypeLabel(session.type)
  const typeColor = getTypeColor(session.type)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="counseling-modal">
        <DialogHeader>
          <DialogTitle>상담 상세</DialogTitle>
          <DialogDescription>
            {format(new Date(session.sessionDate), "yyyy년 M월 d일 E요일 HH:mm", { locale: ko })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">상담 유형:</span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeColor}`}>
              {typeLabel}
            </span>
          </div>

          {/* Duration */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">상담 시간:</span>
            <span className="text-sm">{session.duration}분</span>
          </div>

          {/* Teacher */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">상담 교사:</span>
            <span className="text-sm">{session.teacher.name}</span>
          </div>

          {/* Summary */}
          <div>
            <span className="text-sm font-medium">상담 내용:</span>
            <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{session.summary}</p>
          </div>

          {/* Follow-up */}
          {session.followUpRequired && (
            <div className="flex items-start gap-2">
              <span className="text-sm font-medium">후속 조치:</span>
              <div className="text-sm">
                {session.followUpDate
                  ? format(new Date(session.followUpDate), "yyyy년 M월 d일", { locale: ko })
                  : "예정됨"}
              </div>
            </div>
          )}

          {/* Satisfaction score */}
          {session.satisfactionScore !== null && session.satisfactionScore !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">만족도:</span>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`w-4 h-4 ${i < (session.satisfactionScore ?? 0) ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill={i < (session.satisfactionScore ?? 0) ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                ))}
                <span className="text-sm text-gray-600 ml-1">{session.satisfactionScore} / 5</span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Helper functions (reuse from CounselingSessionCard)
function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    ACADEMIC: "학업",
    CAREER: "진로",
    PSYCHOLOGICAL: "심리",
    BEHAVIORAL: "행동",
  }
  return labels[type] || type
}

function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    ACADEMIC: "bg-blue-100 text-blue-800",
    CAREER: "bg-green-100 text-green-800",
    PSYCHOLOGICAL: "bg-purple-100 text-purple-800",
    BEHAVIORAL: "bg-orange-100 text-orange-800",
  }
  return colors[type] || "bg-gray-100 text-gray-800"
}
