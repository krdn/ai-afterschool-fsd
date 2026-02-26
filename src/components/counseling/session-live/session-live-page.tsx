'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SessionWithNotes } from '@/lib/actions/counseling/session-live'
import { SessionReferencePanel } from './session-reference-panel'
import { SessionChecklist } from './session-checklist'

type SessionLivePageProps = {
  reservation: SessionWithNotes
}

export function SessionLivePage({ reservation }: SessionLivePageProps) {
  const router = useRouter()
  const [showCompleteForm, setShowCompleteForm] = useState(false)

  const studentName = reservation.student.name
  const topic = reservation.topic
  const counselingSession = reservation.counselingSession

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
          {/* SessionTimer placeholder — Task 10에서 구현 */}
          <span className="text-sm text-muted-foreground font-mono">00:00</span>
          <Button onClick={() => setShowCompleteForm(true)}>상담 완료</Button>
        </div>
      </div>

      {/* 분할 영역 */}
      <div className="flex-1 grid grid-cols-[2fr_3fr] gap-4 p-4 overflow-hidden">
        {/* 왼쪽: AI 자료 참조 패널 */}
        <div className="border rounded-lg p-4 overflow-y-auto">
          <SessionReferencePanel
            aiSummary={counselingSession?.aiSummary ?? null}
            topic={topic}
          />
        </div>
        {/* 오른쪽: 체크리스트 */}
        <div className="border rounded-lg p-4 overflow-y-auto">
          {counselingSession ? (
            <SessionChecklist
              sessionId={counselingSession.id}
              initialNotes={counselingSession.notes}
            />
          ) : (
            <p className="text-sm text-muted-foreground">상담 세션이 없습니다.</p>
          )}
        </div>
      </div>

      {/* 하단: 완료 폼 (조건부) — Task 10에서 구현 */}
      {showCompleteForm && (
        <div className="border-t p-4">완료 폼 placeholder</div>
      )}
    </div>
  )
}
