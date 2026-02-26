'use client'

import { useState, useEffect, useCallback } from 'react'
import { Link } from '@/i18n/navigation'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Plus, MessageCircle, Clock, AlertCircle, Pencil, Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import { CounselingSessionForm } from '@/components/counseling/counseling-session-form'
import { getTypeLabel, getTypeColor, parseAiSummary } from '@/components/counseling/utils'
import { deleteCounselingAction } from '@/lib/actions/common/performance'
import {
  getStudentSessionsAction,
  type StudentCounselingSessionItem,
} from '@/lib/actions/counseling/student-sessions'
import { toast } from 'sonner'

// 타임라인 도트 색상 매핑
const typeTimelineColor: Record<string, string> = {
  ACADEMIC: 'bg-blue-500',
  CAREER: 'bg-green-500',
  PSYCHOLOGICAL: 'bg-purple-500',
  BEHAVIORAL: 'bg-orange-500',
}

interface CounselingTabProps {
  studentId: string
  studentName: string
  teacherId: string
}

export default function CounselingTab({
  studentId,
  studentName,
  teacherId,
}: CounselingTabProps) {
  const [sessions, setSessions] = useState<StudentCounselingSessionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [selectedSession, setSelectedSession] =
    useState<StudentCounselingSessionItem | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadSessions = useCallback(async () => {
    setLoading(true)
    const result = await getStudentSessionsAction(studentId)
    if (result.success && 'data' in result) {
      setSessions(result.data)
    }
    setLoading(false)
  }, [studentId])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  const handleFormSuccess = () => {
    setFormOpen(false)
    loadSessions()
  }

  const handleCardClick = (session: StudentCounselingSessionItem) => {
    setSelectedSession(session)
  }

  const handleDelete = async () => {
    if (!selectedSession) return
    setIsDeleting(true)
    try {
      const result = await deleteCounselingAction(selectedSession.id)
      if (result.success) {
        toast.success('상담 기록이 삭제되었습니다.')
        setSelectedSession(null)
        setDeleteDialogOpen(false)
        loadSessions()
      } else {
        toast.error('error' in result ? result.error : '삭제에 실패했습니다.')
      }
    } catch {
      toast.error('오류가 발생했습니다.')
    } finally {
      setIsDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div
      className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
      data-testid="counseling-tab-content"
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">상담 기록</h3>
        <Button
          size="sm"
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => setFormOpen(true)}
        >
          <Plus className="w-4 h-4 mr-1" />새 상담 기록
        </Button>
      </div>

      {/* 상담 목록 또는 빈 상태 */}
      {sessions.length === 0 ? (
        <EmptyState onAddClick={() => setFormOpen(true)} />
      ) : (
        <TimelineList sessions={sessions} onCardClick={handleCardClick} />
      )}

      {/* 새 상담 기록 Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>새 상담 기록</DialogTitle>
          </DialogHeader>
          <CounselingSessionForm
            studentId={studentId}
            studentName={studentName}
            teacherId={teacherId}
            onSuccess={handleFormSuccess}
          />
        </DialogContent>
      </Dialog>

      {/* 상담 상세 모달 (상담관리 페이지와 동일) */}
      {selectedSession && (
        <Dialog
          open={!!selectedSession}
          onOpenChange={(open) => !open && setSelectedSession(null)}
        >
          <DialogContent className="max-w-2xl" data-testid="counseling-modal">
            <DialogHeader>
              <DialogTitle>상담 상세</DialogTitle>
              <DialogDescription>
                {format(
                  new Date(selectedSession.sessionDate),
                  'yyyy년 M월 d일 E요일',
                  { locale: ko }
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">상담 유형:</span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(selectedSession.type)}`}
                >
                  {getTypeLabel(selectedSession.type)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">상담 시간:</span>
                <span className="text-sm">{selectedSession.duration}분</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">상담 교사:</span>
                <span className="text-sm">{selectedSession.teacher.name}</span>
              </div>

              <div>
                <span className="text-sm font-medium">상담 내용:</span>
                <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                  {selectedSession.summary}
                </p>
              </div>

              {selectedSession.followUpRequired && (
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium">후속 조치:</span>
                  <div className="text-sm">
                    {selectedSession.followUpDate
                      ? format(
                          new Date(selectedSession.followUpDate),
                          'yyyy년 M월 d일',
                          { locale: ko }
                        )
                      : '예정됨'}
                  </div>
                </div>
              )}

              {selectedSession.satisfactionScore != null && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">만족도:</span>
                  <div
                    className="flex items-center gap-1"
                    role="img"
                    aria-label={`만족도 ${selectedSession.satisfactionScore}점`}
                  >
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-4 h-4 ${i < (selectedSession.satisfactionScore ?? 0) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill={
                          i < (selectedSession.satisfactionScore ?? 0)
                            ? 'currentColor'
                            : 'none'
                        }
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    ))}
                    <span className="text-sm text-gray-600 ml-1">
                      {selectedSession.satisfactionScore} / 5
                    </span>
                  </div>
                </div>
              )}

              {/* AI 보고서 */}
              {selectedSession.aiSummary && (
                <div className="pt-3 border-t">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">AI 보고서</span>
                  </div>
                  <AiSummaryTabs aiSummary={selectedSession.aiSummary} />
                </div>
              )}
            </div>

            <DialogFooter className="flex-row gap-2 sm:justify-between">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
                className="gap-1"
              >
                <Trash2 className="h-4 w-4" />
                삭제
              </Button>
              <Button variant="outline" size="sm" asChild className="gap-1">
                <Link href={`/counseling/new?editId=${selectedSession.id}`}>
                  <Pencil className="h-4 w-4" />
                  수정
                </Link>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 삭제 확인 AlertDialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>상담 기록 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              {studentName} 학생의 상담 기록을 삭제하시겠습니까? 이 작업은
              되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={async (e) => {
                e.preventDefault()
                await handleDelete()
              }}
            >
              {isDeleting ? '삭제 중...' : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 빈 상태 컴포넌트
// ---------------------------------------------------------------------------
function EmptyState({ onAddClick }: { onAddClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <MessageCircle className="w-16 h-16 mb-4 stroke-[1.5]" />
      <p className="text-lg font-medium text-gray-600 mb-1">
        아직 상담 기록이 없습니다
      </p>
      <p className="text-sm text-gray-400 mb-6">
        학생과의 상담 내용을 기록하고 관리해보세요
      </p>
      <Button className="bg-blue-600 hover:bg-blue-700" onClick={onAddClick}>
        <Plus className="w-4 h-4 mr-1" />첫 상담 기록 추가
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// AI 보고서 탭 (상담관리 페이지와 동일)
// ---------------------------------------------------------------------------
function AiSummaryTabs({ aiSummary }: { aiSummary: string }) {
  const [tab, setTab] = useState('analysis')
  const sections = parseAiSummary(aiSummary)

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="analysis">분석 보고서</TabsTrigger>
        <TabsTrigger value="scenario">시나리오</TabsTrigger>
        <TabsTrigger value="parent">학부모 공유용</TabsTrigger>
      </TabsList>
      <TabsContent value="analysis" className="mt-3">
        <div className="max-h-[300px] overflow-y-auto border rounded-lg p-4">
          <MarkdownRenderer content={sections.analysis} />
        </div>
      </TabsContent>
      <TabsContent value="scenario" className="mt-3">
        <div className="max-h-[300px] overflow-y-auto border rounded-lg p-4">
          <MarkdownRenderer content={sections.scenario} />
        </div>
      </TabsContent>
      <TabsContent value="parent" className="mt-3">
        <div className="max-h-[300px] overflow-y-auto border rounded-lg p-4">
          <MarkdownRenderer content={sections.parent} />
        </div>
      </TabsContent>
    </Tabs>
  )
}

// ---------------------------------------------------------------------------
// 타임라인 목록 컴포넌트
// ---------------------------------------------------------------------------
function TimelineList({
  sessions,
  onCardClick,
}: {
  sessions: StudentCounselingSessionItem[]
  onCardClick: (session: StudentCounselingSessionItem) => void
}) {
  return (
    <div className="relative">
      {/* 세로선 */}
      <div className="absolute left-[17px] top-2 bottom-2 w-0.5 bg-gray-200" />

      <div className="space-y-6">
        {sessions.map((session) => {
          const dotColor = typeTimelineColor[session.type] || 'bg-gray-400'
          const badgeColor = getTypeColor(session.type)
          const typeLabel = getTypeLabel(session.type)

          return (
            <div key={session.id} className="relative flex gap-4">
              {/* 타임라인 도트 */}
              <div className="flex-shrink-0 relative z-10">
                <div
                  className={`w-[9px] h-[9px] rounded-full ${dotColor} mt-2 ring-4 ring-white`}
                  style={{ marginLeft: '13px' }}
                />
              </div>

              {/* 상담 카드 */}
              <div
                role="button"
                tabIndex={0}
                className="flex-1 border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => onCardClick(session)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onCardClick(session)
                  }
                }}
              >
                {/* 카드 상단: 날짜 + 유형 뱃지 */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">
                    {format(
                      new Date(session.sessionDate),
                      'yyyy년 M월 d일 (E)',
                      { locale: ko }
                    )}
                  </span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeColor}`}
                  >
                    {typeLabel}
                  </span>
                </div>

                {/* 요약 텍스트 (2줄 말줄임) */}
                <p className="text-sm text-gray-700 line-clamp-2 mb-3">
                  {session.summary}
                </p>

                {/* 카드 하단: 메타 정보 */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">
                      {session.teacher.name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {session.duration}분
                    </span>
                    {session.followUpRequired && (
                      <span className="flex items-center gap-1 text-amber-600">
                        <AlertCircle className="w-3 h-3" />
                        후속 조치 필요
                      </span>
                    )}
                  </div>

                  {session.satisfactionScore !== null && (
                    <div className="flex items-center gap-0.5 text-yellow-500">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className="w-3 h-3"
                          viewBox="0 0 24 24"
                          fill={
                            i < (session.satisfactionScore ?? 0)
                              ? 'currentColor'
                              : 'none'
                          }
                          stroke="currentColor"
                          strokeWidth="2"
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
        })}
      </div>
    </div>
  )
}
