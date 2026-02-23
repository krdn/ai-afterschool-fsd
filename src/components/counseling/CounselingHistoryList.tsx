"use client"

import { useState } from "react"
import type { CounselingSession, Student, Teacher } from '@/lib/db'
import { CounselingSessionCard, type CounselingSessionWithRelations } from "./CounselingSessionCard"
import { CounselingSessionModal } from "./CounselingSessionModal"

interface CounselingHistoryListProps {
  sessions: CounselingSessionWithRelations[]
}

export function CounselingHistoryList({ sessions }: CounselingHistoryListProps) {
  const [selectedSession, setSelectedSession] = useState<CounselingSessionWithRelations | null>(null)
  if (sessions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">아직 상담 기록이 없습니다</p>
      </div>
    )
  }

  const groupedByMonth = groupSessionsByMonth(sessions)

  return (
    <div className="space-y-6">
      {Object.entries(groupedByMonth).map(([month, monthSessions]) => (
        <div key={month}>
          <h3 className="text-lg font-semibold mb-3 text-gray-800">{month}</h3>
          <div className="space-y-3">
            {monthSessions.map((session) => (
              <CounselingSessionCard
                key={session.id}
                session={session}
                onClick={() => setSelectedSession(session)}
              />
            ))}
          </div>
        </div>
      ))}
      {/* Modal */}
      {selectedSession && (
        <CounselingSessionModal
          session={selectedSession}
          open={!!selectedSession}
          onOpenChange={(open) => !open && setSelectedSession(null)}
        />
      )}
    </div>
  )
}

function groupSessionsByMonth(
  sessions: CounselingSessionWithRelations[]
): Record<string, CounselingSessionWithRelations[]> {
  return sessions.reduce((acc, session) => {
    const date = new Date(session.sessionDate)
    const monthKey = `${date.getFullYear()}년 ${date.getMonth() + 1}월`

    if (!acc[monthKey]) {
      acc[monthKey] = []
    }

    acc[monthKey].push(session)
    return acc
  }, {} as Record<string, CounselingSessionWithRelations[]>)
}
