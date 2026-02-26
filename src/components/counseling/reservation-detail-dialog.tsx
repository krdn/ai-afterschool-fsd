'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { getReservationByIdAction } from '@/lib/actions/counseling/reservations-query'
import { toast } from 'sonner'

interface ReservationDetailDialogProps {
  reservationId: string | null
  onClose: () => void
}

type ReservationDetail = NonNullable<
  Extract<Awaited<ReturnType<typeof getReservationByIdAction>>, { success: true }>['data']
>

export function ReservationDetailDialog({
  reservationId,
  onClose,
}: ReservationDetailDialogProps) {
  const [detail, setDetail] = useState<ReservationDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [aiTab, setAiTab] = useState('analysis')

  const stableOnClose = useCallback(onClose, [onClose])

  useEffect(() => {
    if (!reservationId) {
      setDetail(null)
      return
    }

    const load = async () => {
      setIsLoading(true)
      setAiTab('analysis')
      try {
        const result = await getReservationByIdAction(reservationId)
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
    }
    load()
  }, [reservationId, stableOnClose])

  const aiSummary = detail?.counselingSession?.aiSummary

  // aiSummary를 섹션별로 분리
  const sections = aiSummary ? parseAiSummary(aiSummary) : null

  return (
    <Dialog open={!!reservationId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>예약 상세</DialogTitle>
          {detail && (
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
                    <div className="prose prose-sm max-w-none max-h-[400px] overflow-y-auto border rounded-lg p-4">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {sections.analysis}
                      </ReactMarkdown>
                    </div>
                  </TabsContent>
                  <TabsContent value="scenario" className="mt-3">
                    <div className="prose prose-sm max-w-none max-h-[400px] overflow-y-auto border rounded-lg p-4">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {sections.scenario}
                      </ReactMarkdown>
                    </div>
                  </TabsContent>
                  <TabsContent value="parent" className="mt-3">
                    <div className="prose prose-sm max-w-none max-h-[400px] overflow-y-auto border rounded-lg p-4">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {sections.parent}
                      </ReactMarkdown>
                    </div>
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="text-sm text-muted-foreground border rounded-lg p-4 text-center">
                  AI 보고서가 없습니다. (AI 보완 없이 등록된 예약)
                </div>
              )}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

// aiSummary를 "---" 구분자로 분리하여 3개 섹션으로 파싱
function parseAiSummary(aiSummary: string) {
  const parts = aiSummary.split(/\n---\n/)

  // 섹션 헤더(## 학생 분석 보고서 등) 제거
  const clean = (text: string) =>
    text.replace(/^## .+\n\n?/, '').trim()

  return {
    analysis: parts[0] ? clean(parts[0]) : '내용 없음',
    scenario: parts[1] ? clean(parts[1]) : '내용 없음',
    parent: parts[2] ? clean(parts[2]) : '내용 없음',
  }
}

function getParentRelationLabel(relation: string): string {
  const labels: Record<string, string> = {
    FATHER: '아버지',
    MOTHER: '어머니',
    GRANDFATHER: '조부',
    GRANDMOTHER: '조모',
    OTHER: '기타',
  }
  return labels[relation] || relation
}
