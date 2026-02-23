"use client"

import { useState, useEffect, useTransition } from "react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { Clock, ChevronDown, ChevronUp, MessageSquare } from "lucide-react"
import { getSajuAnalysisHistoryAction } from "@/app/[locale]/(dashboard)/students/[id]/saju/actions"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MarkdownRenderer } from "@/components/ui/markdown-renderer"

type HistoryItem = {
  id: string
  promptId: string
  additionalRequest: string | null
  usedProvider: string
  usedModel: string | null
  calculatedAt: Date | string
  createdAt: Date | string
  interpretation: string | null
}

type Props = {
  studentId: string
}

// 프롬프트 ID → 한글 이름 매핑
const PROMPT_NAMES: Record<string, string> = {
  default: "기본 해석",
  "learning-dna": "학습 체질 진단서",
  "exam-slump": "시험운 & 슬럼프 탈출",
  "career-navi": "진로·학과 내비게이션",
  "mental-energy": "멘탈 에너지 코칭",
  "subject-strategy": "과목별 오행 공략 지도",
}

export function SajuHistoryPanel({ studentId }: Props) {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [isPending, startTransition] = useTransition()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    startTransition(async () => {
      try {
        const list = await getSajuAnalysisHistoryAction(studentId)
        setHistory(list)
      } catch {
        setHistory([])
      }
    })
  }, [studentId])

  if (isPending) {
    return (
      <div className="rounded-md border border-gray-200 p-4">
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
          <span className="ml-2 text-sm text-gray-500">이력 불러오는 중...</span>
        </div>
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="rounded-md border border-gray-200 p-4">
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Clock className="h-4 w-4" />
          <span>분석 이력이 없습니다.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-gray-200">
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-gray-50">
        <Clock className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">분석 이력</span>
        <Badge variant="secondary" className="text-[10px]">{history.length}건</Badge>
      </div>
      <ScrollArea className="max-h-[400px]">
        <div className="divide-y">
          {history.map((item) => {
            const isExpanded = expandedId === item.id
            const calcDate = item.calculatedAt instanceof Date
              ? item.calculatedAt
              : new Date(item.calculatedAt)
            const promptName = PROMPT_NAMES[item.promptId] || item.promptId
            const model = item.usedModel && item.usedModel !== 'default'
              ? ` (${item.usedModel})`
              : ''

            return (
              <div key={item.id}>
                <button
                  type="button"
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">
                        {format(calcDate, "yyyy.MM.dd HH:mm", { locale: ko })}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0"
                      >
                        {promptName}
                      </Badge>
                      {item.additionalRequest && (
                        <span className="flex items-center gap-0.5 text-[10px] text-amber-600">
                          <MessageSquare className="h-3 w-3" />
                          추가요청
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {item.usedProvider}{model}
                      {item.interpretation
                        ? ` - ${item.interpretation.slice(0, 60)}...`
                        : ''}
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3">
                    {/* 메타 정보 */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-400">프롬프트:</span>{' '}
                        <span className="text-gray-600">{promptName}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">엔진:</span>{' '}
                        <span className="text-gray-600">{item.usedProvider}{model}</span>
                      </div>
                    </div>

                    {/* 추가 요청사항 */}
                    {item.additionalRequest && (
                      <div className="rounded-md bg-amber-50 border border-amber-200 p-2">
                        <p className="text-[10px] text-amber-600 font-medium mb-1">추가 요청사항</p>
                        <p className="text-xs text-amber-800">{item.additionalRequest}</p>
                      </div>
                    )}

                    {/* 해석 결과 */}
                    {item.interpretation ? (
                      <div className="rounded-md border border-gray-200 bg-white p-3">
                        <p className="text-[10px] text-gray-400 font-medium mb-1">해석 결과</p>
                        <div className="max-h-[300px] overflow-y-auto">
                          <MarkdownRenderer content={item.interpretation} />
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">해석 결과가 없습니다.</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
