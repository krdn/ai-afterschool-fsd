'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Loader2, Pencil, CheckCircle, Play, ArrowRight } from 'lucide-react'
import { getReservationByIdAction } from '@/lib/actions/counseling/reservations-query'
import { toast } from 'sonner'
import { startSessionAction } from '@/lib/actions/counseling/session-live'
import { getParentRelationLabel, parseAiSummary } from './utils'
import { ReservationEditForm } from './reservation-edit-form'
import { SessionRecordForm } from './session-record-form'

export type DialogMode = 'read' | 'edit' | 'record'

interface ReservationDetailDialogProps {
  reservationId: string | null
  initialMode?: DialogMode
  onClose: () => void
}

export type ReservationDetail = NonNullable<
  Extract<Awaited<ReturnType<typeof getReservationByIdAction>>, { success: true }>['data']
>

export function ReservationDetailDialog({
  reservationId,
  initialMode = 'read',
  onClose,
}: ReservationDetailDialogProps) {
  const router = useRouter()
  const [detail, setDetail] = useState<ReservationDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [mode, setMode] = useState<DialogMode>(initialMode)

  const stableOnClose = useCallback(onClose, [onClose])

  // initialMode이 바뀌면 동기화
  useEffect(() => {
    if (reservationId) setMode(initialMode)
  }, [initialMode, reservationId])

  // 데이터 로드
  const loadDetail = useCallback(async (id: string) => {
    setIsLoading(true)
    try {
      const result = await getReservationByIdAction(id)
      if (result.success) {
        setDetail(result.data)
      } else {
        toast.error(result.error || '예약 정보를 불러오지 못했습니다.')
        stableOnClose()
      }
    } catch {
      toast.error('오류가 발생했습니다.')
      stableOnClose()
    } finally {
      setIsLoading(false)
    }
  }, [stableOnClose])

  useEffect(() => {
    if (!reservationId) {
      setDetail(null)
      setMode('read')
      return
    }
    loadDetail(reservationId)
  }, [reservationId, loadDetail])

  // 수정 저장 성공 후 처리
  const handleSaveSuccess = useCallback(() => {
    setMode('read')
    if (reservationId) loadDetail(reservationId)
    router.refresh()
  }, [reservationId, loadDetail, router])

  // 완료 기록 저장 성공 (다이얼로그 닫기)
  const handleRecordSuccess = useCallback(() => {
    router.refresh()
    stableOnClose()
  }, [router, stableOnClose])

  // 다이얼로그 닫기
  const handleClose = () => {
    setMode('read')
    onClose()
  }

  const [isStarting, setIsStarting] = useState(false)

  const isScheduled = detail?.status === 'SCHEDULED'
  const isInProgress = detail?.status === 'IN_PROGRESS'
  const dialogTitle = mode === 'edit' ? '예약 수정' : mode === 'record' ? '상담 기록 작성' : '예약 상세'

  // 상담 시작 핸들러
  const handleStartSession = async () => {
    if (!reservationId) return
    setIsStarting(true)
    try {
      const result = await startSessionAction(reservationId)
      if (result.success) {
        router.push(`/counseling/session/${reservationId}`)
      } else {
        toast.error(result.error || '상담 시작에 실패했습니다.')
      }
    } catch {
      toast.error('상담 시작 중 오류가 발생했습니다.')
    } finally {
      setIsStarting(false)
    }
  }

  return (
    <Dialog open={!!reservationId} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{dialogTitle}</DialogTitle>
            {mode === 'read' && isScheduled && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMode('edit')}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  수정
                </Button>
                <Button
                  size="sm"
                  onClick={handleStartSession}
                  disabled={isStarting}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  <Play className="h-4 w-4 mr-1" />
                  {isStarting ? '시작 중...' : '상담 시작'}
                </Button>
                <Button
                  size="sm"
                  onClick={() => setMode('record')}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  완료
                </Button>
              </div>
            )}
            {mode === 'read' && isInProgress && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => router.push(`/counseling/session/${reservationId}`)}
                  className="bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  <ArrowRight className="h-4 w-4 mr-1" />
                  상담 이어가기
                </Button>
              </div>
            )}
          </div>
          {detail && mode === 'read' && (
            <DialogDescription>
              {format(new Date(detail.scheduledAt), 'yyyy년 M월 d일 E요일 HH:mm', { locale: ko })}
            </DialogDescription>
          )}
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-[200px]">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">로딩 중...</span>
          </div>
        ) : detail ? (
          <>
            {mode === 'read' && <DetailReadView detail={detail} />}
            {mode === 'edit' && (
              <ReservationEditForm
                reservation={detail}
                onSave={handleSaveSuccess}
                onCancel={() => setMode('read')}
              />
            )}
            {mode === 'record' && (
              <SessionRecordForm
                reservation={detail}
                onSave={handleRecordSuccess}
                onCancel={() => setMode('read')}
              />
            )}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

/**
 * 읽기 모드 뷰 — 기존 상세 다이얼로그 본문을 추출
 */
function DetailReadView({ detail }: { detail: ReservationDetail }) {
  const [aiTab, setAiTab] = useState('analysis')
  const aiSummary = detail.counselingSession?.aiSummary
  const sections = aiSummary ? parseAiSummary(aiSummary) : null

  return (
    <div className="space-y-4">
      {/* 기본 정보 */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="font-medium text-muted-foreground">학생</span>
          <p>{detail.student.name} {detail.student.school && `(${detail.student.school} ${detail.student.grade}학년)`}</p>
        </div>
        <div>
          <span className="font-medium text-muted-foreground">학부모</span>
          <p>{detail.parent.name} ({getParentRelationLabel(detail.parent.relation)})</p>
        </div>
        <div className="col-span-2">
          <span className="font-medium text-muted-foreground">상담 주제</span>
          <p>{detail.topic}</p>
        </div>
      </div>

      {/* AI 문서 */}
      {sections ? (
        <Tabs value={aiTab} onValueChange={setAiTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="analysis">분석 보고서</TabsTrigger>
            <TabsTrigger value="scenario">시나리오</TabsTrigger>
            <TabsTrigger value="parent">학부모 공유용</TabsTrigger>
          </TabsList>
          <TabsContent value="analysis" className="mt-3">
            <div className="max-h-[400px] overflow-y-auto border rounded-lg p-4">
              <MarkdownRenderer content={sections.analysis} />
            </div>
          </TabsContent>
          <TabsContent value="scenario" className="mt-3">
            <div className="max-h-[400px] overflow-y-auto border rounded-lg p-4">
              <MarkdownRenderer content={sections.scenario} />
            </div>
          </TabsContent>
          <TabsContent value="parent" className="mt-3">
            <div className="max-h-[400px] overflow-y-auto border rounded-lg p-4">
              <MarkdownRenderer content={sections.parent} />
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="text-sm text-muted-foreground border rounded-lg p-4 text-center">
          AI 보고서가 없습니다. (AI 보완 없이 등록된 예약)
        </div>
      )}
    </div>
  )
}
