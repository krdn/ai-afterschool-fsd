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
import { SessionReportEditor } from './session-report-editor'

type Phase = 'recording' | 'completing' | 'report'

type CompletionData = {
  type: string
  duration: number
  summary: string
  followUpRequired: boolean
  followUpDate?: string
  satisfactionScore?: number
}

type SessionLivePageProps = {
  reservation: SessionWithNotes
}

export function SessionLivePage({ reservation }: SessionLivePageProps) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('recording')
  const [reportContent, setReportContent] = useState('')
  const [completionData, setCompletionData] = useState<CompletionData | null>(null)
  const startTimeRef = useRef(new Date(reservation.counselingSession?.sessionDate ?? new Date()))

  const studentName = reservation.student.name
  const topic = reservation.topic
  const counselingSession = reservation.counselingSession

  // 경과 시간 (분) 계산 — 완료 폼에 전달
  const getElapsedMinutes = () => {
    const diff = Date.now() - startTimeRef.current.getTime()
    return Math.max(Math.round(diff / 60000), 5)
  }

  // 헤더 "돌아가기" / "이전 단계" 버튼 핸들러
  const handleBack = () => {
    if (phase === 'recording') {
      router.push('/counseling')
    } else if (phase === 'completing') {
      setPhase('recording')
    } else {
      setPhase('completing')
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {phase === 'recording' ? '돌아가기' : '이전 단계'}
          </Button>
          <div>
            <h2 className="font-semibold">{studentName}</h2>
            <p className="text-sm text-muted-foreground">{topic}</p>
          </div>
        </div>
        {phase === 'recording' && (
          <div className="flex items-center gap-3">
            <SessionTimer startTime={startTimeRef.current} />
            <Button onClick={() => setPhase('completing')}>
              상담 완료
            </Button>
          </div>
        )}
      </div>

      {/* Phase: recording — 상하 분할 영역 */}
      {phase === 'recording' && (
        <ResizablePanelGroup direction="vertical" className="flex-1 p-4">
          {/* 위쪽: AI 자료 참조 패널 */}
          <ResizablePanel defaultSize={45} minSize={15}>
            <div className="border rounded-lg p-4 h-full overflow-y-auto">
              <SessionReferencePanel
                aiSummary={counselingSession?.aiSummary ?? null}
                topic={topic}
                sessionId={counselingSession?.id ?? ''}
                studentId={reservation.student.id}
                studentName={studentName}
                scheduledAt={reservation.scheduledAt.toISOString()}
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
      )}

      {/* Phase: completing — 완료 폼 (전체 화면) */}
      {phase === 'completing' && counselingSession && (
        <div className="flex-1 overflow-y-auto p-4">
          <SessionCompleteForm
            sessionId={counselingSession.id}
            reservationId={reservation.id}
            aiSummary={counselingSession.aiSummary}
            notes={counselingSession.notes}
            elapsedMinutes={getElapsedMinutes()}
            onCancel={() => setPhase('recording')}
            onGenerateReport={(data, report) => {
              setCompletionData(data)
              setReportContent(report)
              setPhase('report')
            }}
            topic={topic}
            studentName={studentName}
          />
        </div>
      )}

      {/* Phase: report — 보고서 편집기 */}
      {phase === 'report' && counselingSession && completionData && (
        <div className="flex-1 overflow-y-auto p-4">
          <SessionReportEditor
            content={reportContent}
            onChange={setReportContent}
            sessionId={counselingSession.id}
            reservationId={reservation.id}
            completionData={completionData}
            onBack={() => setPhase('completing')}
          />
        </div>
      )}
    </div>
  )
}
