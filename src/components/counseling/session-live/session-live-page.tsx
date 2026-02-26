'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'
import type { SessionWithNotes } from '@/lib/actions/counseling/session-live'
import { SessionReferencePanel } from './session-reference-panel'
import { SessionChecklist } from './session-checklist'
import { SessionTimer } from './session-timer'
import { SessionCompleteForm } from './session-complete-form'

type SessionLivePageProps = {
  reservation: SessionWithNotes
}

export function SessionLivePage({ reservation }: SessionLivePageProps) {
  const router = useRouter()
  const [showCompleteForm, setShowCompleteForm] = useState(false)
  const startTimeRef = useRef(new Date(reservation.counselingSession?.sessionDate ?? new Date()))

  const studentName = reservation.student.name
  const topic = reservation.topic
  const counselingSession = reservation.counselingSession

  // 경과 시간 (분) 계산 — 완료 폼에 전달
  const getElapsedMinutes = () => {
    const diff = Date.now() - startTimeRef.current.getTime()
    return Math.max(Math.round(diff / 60000), 5)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => router.push('/counseling')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            돌아가기
          </Button>
          <div>
            <h2 className="font-semibold">{studentName}</h2>
            <p className="text-sm text-muted-foreground">{topic}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <SessionTimer startTime={startTimeRef.current} />
          <Button onClick={() => setShowCompleteForm(true)} disabled={showCompleteForm}>
            상담 완료
          </Button>
        </div>
      </div>

      {/* 상하 분할 영역 */}
      <ResizablePanelGroup direction="vertical" className="flex-1 p-4">
        {/* 위쪽: AI 자료 참조 패널 */}
        <ResizablePanel defaultSize={45} minSize={15}>
          <div className="border rounded-lg p-4 h-full overflow-y-auto">
            <SessionReferencePanel
              aiSummary={counselingSession?.aiSummary ?? null}
              topic={topic}
            />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* 아래쪽: 체크리스트 */}
        <ResizablePanel defaultSize={55} minSize={20}>
          <div className="border rounded-lg p-4 h-full overflow-y-auto mt-1">
            {counselingSession ? (
              <SessionChecklist
                sessionId={counselingSession.id}
                initialNotes={counselingSession.notes}
              />
            ) : (
              <p className="text-sm text-muted-foreground">상담 세션이 없습니다.</p>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* 하단: 완료 폼 (조건부) */}
      {showCompleteForm && counselingSession && (
        <div className="border-t p-4 max-h-[50vh] overflow-y-auto">
          <SessionCompleteForm
            sessionId={counselingSession.id}
            reservationId={reservation.id}
            aiSummary={counselingSession.aiSummary}
            notes={counselingSession.notes}
            elapsedMinutes={getElapsedMinutes()}
            onCancel={() => setShowCompleteForm(false)}
          />
        </div>
      )}
    </div>
  )
}
