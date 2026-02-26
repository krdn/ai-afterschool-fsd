"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Link } from "@/i18n/navigation"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { MessageSquare, Pencil, Sparkles, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CounselingSearchBar } from "./counseling-search-bar"
import { CounselingFilters } from "./counseling-filters"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { deleteCounselingAction } from "@/lib/actions/common/performance"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { CounselingSessionData } from "./types"
import { getTypeLabel, getTypeColor, parseAiSummary } from "./utils"

interface CounselingHistoryContentProps {
  sessions: CounselingSessionData[]
  params: {
    query?: string
    studentName?: string
    teacherName?: string
    type?: string
    startDate?: string
    endDate?: string
    followUpRequired?: string
  }
  monthlyCount: number
  totalSessions: number
  avgDuration: number
  followUpCount: number
  canViewTeam: boolean
  teachers: Array<{ id: string; name: string }>
}

export function CounselingHistoryContent({
  sessions,
  params,
  monthlyCount,
  totalSessions,
  avgDuration,
  followUpCount,
  canViewTeam,
  teachers,
}: CounselingHistoryContentProps) {
  const router = useRouter()
  const [selectedSession, setSelectedSession] = useState<CounselingSessionData | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button asChild data-testid="new-counseling-button">
          <Link href="/counseling/new">새 상담 기록</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="counseling-stat-card-monthly">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              이번 달 상담 횟수
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{monthlyCount}회</div>
          </CardContent>
        </Card>

        <Card data-testid="counseling-stat-card-total">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              전체 상담 횟수
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalSessions}회</div>
          </CardContent>
        </Card>

        <Card data-testid="counseling-stat-card-duration">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              평균 상담 시간
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {avgDuration.toFixed(0)}분
            </div>
          </CardContent>
        </Card>

        <Card data-testid="counseling-stat-card-followup">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              후속 조치 예정
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{followUpCount}건</div>
          </CardContent>
        </Card>
      </div>

      {/* 통합 검색 */}
      <Card>
        <CardHeader>
          <CardTitle>통합 검색</CardTitle>
        </CardHeader>
        <CardContent>
          <CounselingSearchBar initialQuery={params.query || params.studentName || ""} />
        </CardContent>
      </Card>

      {/* 다중 필터 */}
      <Card data-testid="counseling-filters">
        <CardHeader>
          <CardTitle>필터</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <CounselingFilters canViewTeam={canViewTeam} teachers={teachers} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>상담 기록 ({sessions.length}건)</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <MessageSquare className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-gray-900">
                조건에 맞는 상담 기록이 없어요
              </h3>
              <p className="mb-4 max-w-sm text-sm text-gray-500">
                검색 조건을 변경하거나, 새 상담 기록을 추가해보세요.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" asChild>
                  <Link href="/counseling">필터 초기화</Link>
                </Button>
                <Button asChild>
                  <Link href="/counseling/new">새 상담 기록</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  className="w-full text-left border rounded-lg p-4 space-y-2 hover:bg-gray-50 transition-colors cursor-pointer"
                  data-testid="counseling-session"
                  aria-label={`${session.student.name} ${getTypeLabel(session.type)} 상담 기록 보기`}
                  onClick={() => setSelectedSession(session)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {session.student.name} ({session.student.school}{" "}
                        {session.student.grade}학년)
                      </div>
                      <div className="text-sm text-gray-600">
                        {session.teacher.name} · {session.duration}분
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(
                        session.type
                      )}`}
                    >
                      {getTypeLabel(session.type)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700">{session.summary}</div>
                  {session.followUpRequired && (
                    <div className="text-sm text-amber-600">
                      후속 조치:{" "}
                      {session.followUpDate
                        ? new Date(session.followUpDate).toLocaleDateString(
                            "ko-KR"
                          )
                        : "예정됨"}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 상담 상세 모달 */}
      {selectedSession && (
        <Dialog open={!!selectedSession} onOpenChange={(open) => !open && setSelectedSession(null)}>
          <DialogContent className="max-w-2xl" data-testid="counseling-modal">
            <DialogHeader>
              <DialogTitle>상담 상세</DialogTitle>
              <DialogDescription>
                {format(new Date(selectedSession.sessionDate), "yyyy년 M월 d일 E요일", { locale: ko })}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">학생:</span>
                <span className="text-sm">
                  {selectedSession.student.name}
                  {selectedSession.student.school && ` (${selectedSession.student.school} ${selectedSession.student.grade}학년)`}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">상담 유형:</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(selectedSession.type)}`}>
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
                <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{selectedSession.summary}</p>
              </div>

              {selectedSession.followUpRequired && (
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium">후속 조치:</span>
                  <div className="text-sm">
                    {selectedSession.followUpDate
                      ? format(new Date(selectedSession.followUpDate), "yyyy년 M월 d일", { locale: ko })
                      : "예정됨"}
                  </div>
                </div>
              )}

              {selectedSession.satisfactionScore != null && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">만족도:</span>
                  <div className="flex items-center gap-1" role="img" aria-label={`만족도 ${selectedSession.satisfactionScore}점`}>
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-4 h-4 ${i < (selectedSession.satisfactionScore ?? 0) ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill={i < (selectedSession.satisfactionScore ?? 0) ? "currentColor" : "none"}
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    ))}
                    <span className="text-sm text-gray-600 ml-1">{selectedSession.satisfactionScore} / 5</span>
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
              <Button
                variant="outline"
                size="sm"
                asChild
                className="gap-1"
              >
                <Link href={`/counseling/new?editId=${selectedSession.id}`}>
                  <Pencil className="h-4 w-4" />
                  수정
                </Link>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 삭제 확인 AlertDialog (Dialog 바깥에 배치하여 포커스 충돌 방지) */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>상담 기록 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedSession?.student.name} 학생의 상담 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={async (e) => {
                e.preventDefault()
                if (!selectedSession) return
                setIsDeleting(true)
                try {
                  const result = await deleteCounselingAction(selectedSession.id)
                  if (result.success) {
                    toast.success("상담 기록이 삭제되었습니다.")
                    setSelectedSession(null)
                    setDeleteDialogOpen(false)
                    router.refresh()
                  } else {
                    toast.error(result.error || "삭제에 실패했습니다.")
                  }
                } catch {
                  toast.error("오류가 발생했습니다.")
                } finally {
                  setIsDeleting(false)
                }
              }}
            >
              {isDeleting ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function AiSummaryTabs({ aiSummary }: { aiSummary: string }) {
  const [tab, setTab] = useState("analysis")
  const sections = parseAiSummary(aiSummary)

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="analysis">분석 보고서</TabsTrigger>
        <TabsTrigger value="scenario">시나리오</TabsTrigger>
        <TabsTrigger value="parent">학부모 공유용</TabsTrigger>
      </TabsList>
      <TabsContent value="analysis" className="mt-3">
        <div className="prose prose-sm max-w-none max-h-[300px] overflow-y-auto border rounded-lg p-4">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{sections.analysis}</ReactMarkdown>
        </div>
      </TabsContent>
      <TabsContent value="scenario" className="mt-3">
        <div className="prose prose-sm max-w-none max-h-[300px] overflow-y-auto border rounded-lg p-4">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{sections.scenario}</ReactMarkdown>
        </div>
      </TabsContent>
      <TabsContent value="parent" className="mt-3">
        <div className="prose prose-sm max-w-none max-h-[300px] overflow-y-auto border rounded-lg p-4">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{sections.parent}</ReactMarkdown>
        </div>
      </TabsContent>
    </Tabs>
  )
}

