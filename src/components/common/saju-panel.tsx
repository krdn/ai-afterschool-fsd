"use client"

import { useState, useTransition, useEffect } from "react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { Loader2, RefreshCw, History, Sparkles, Trash2 } from "lucide-react"
import type { SajuResult } from "@/features/analysis"
import type { ProviderName } from "@/features/ai-engine"
import type { AnalysisPromptMeta } from "@/features/ai-engine/prompts"
import { getMergedPromptOptionsAction } from "@/lib/actions/student/saju"
import { hanjaLabel, toDate, formatBirthTime } from "@/components/common/saju-utils"
import { MarkdownRenderer } from "@/components/ui/markdown-renderer"
import { ProviderSelector } from "@/components/students/provider-selector"
import { PromptSelector } from "@/components/students/prompt-selector"
import { SajuHelpDialog } from "@/components/students/saju-help-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// --- 분석 실행 결과 (student/teacher action이 반환하는 공통 형태) ---
export type AnalysisRunResult = {
  llmFailed?: boolean
  llmError?: string
  usedProvider?: string
  usedModel?: string
  cached?: boolean
}

// --- Props ---
export type SajuPanelProps = {
  // 대상 정보
  subjectId: string
  subjectLabel: string  // "학생: 홍길동" 또는 "선생님: 김교사"
  birthDate: Date | string | null | undefined
  birthTimeHour: number | null | undefined
  birthTimeMinute: number | null | undefined

  // 분석 결과
  analysis: {
    result: unknown
    interpretation: string | null
    calculatedAt: Date | string
  } | null

  // 콜백: 하위 컴포넌트별 다른 action 호출
  onRunAnalysis: (subjectId: string, provider: string, promptId: string, extra?: string, forceRefresh?: boolean) => Promise<AnalysisRunResult>
  onSimplify: (interpretation: string, provider: string) => Promise<{ text: string }>
  onReset: (subjectId: string) => Promise<{ success: boolean; error?: string }>

  // 선택적 기능
  enabledProviders?: ProviderName[]
  onAnalysisComplete?: () => void
  lastUsedProvider?: string | null
  lastUsedModel?: string | null
  historyPanel?: React.ReactNode  // student만 히스토리 패널 사용
  placeholder?: string  // 추가 요청 placeholder
  dataTestId?: string
}

export function SajuPanel({
  subjectId,
  subjectLabel,
  birthDate,
  birthTimeHour,
  birthTimeMinute,
  analysis,
  onRunAnalysis,
  onSimplify,
  onReset,
  enabledProviders = [],
  onAnalysisComplete,
  lastUsedProvider,
  lastUsedModel,
  historyPanel,
  placeholder = "예: 추가 요청사항을 입력하세요.",
  dataTestId,
}: SajuPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedProvider, setSelectedProvider] = useState('built-in')
  const [selectedPromptId, setSelectedPromptId] = useState<string>('default')
  const [additionalRequest, setAdditionalRequest] = useState('')
  const [providerLabel, setProviderLabel] = useState<string | null>(() => {
    if (!lastUsedProvider) return null
    const model = lastUsedModel && lastUsedModel !== 'default' ? ` (${lastUsedModel})` : ''
    return `${lastUsedProvider}${model}`
  })
  const [promptLabel, setPromptLabel] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [viewMode, setViewMode] = useState<"markdown" | "rendered">("rendered")
  const [promptOptions, setPromptOptions] = useState<AnalysisPromptMeta[]>([])
  const [simplifiedText, setSimplifiedText] = useState<string | null>(null)
  const [isSimplifying, setIsSimplifying] = useState(false)
  const [showSimplified, setShowSimplified] = useState(false)
  const [simplifyError, setSimplifyError] = useState<string | null>(null)
  const [isCached, setIsCached] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [isResetting, startResetTransition] = useTransition()

  const canAnalyze = Boolean(birthDate)
  const result = analysis?.result as SajuResult | undefined
  const isLLM = selectedProvider !== 'built-in'

  useEffect(() => {
    getMergedPromptOptionsAction().then(setPromptOptions).catch(console.error)
  }, [])

  const handleSimplify = async () => {
    if (!analysis?.interpretation) return
    if (simplifiedText) {
      setShowSimplified(!showSimplified)
      return
    }
    setIsSimplifying(true)
    setSimplifyError(null)
    try {
      const res = await onSimplify(
        analysis.interpretation,
        selectedProvider === 'built-in' ? 'auto' : selectedProvider
      )
      setSimplifiedText(res.text)
      setShowSimplified(true)
    } catch {
      setSimplifyError('쉽게 풀이 생성에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsSimplifying(false)
    }
  }

  const handleRunAnalysis = (forceRefresh = false) => {
    startTransition(async () => {
      setErrorMessage(null)
      setProviderLabel(null)
      setPromptLabel(null)
      setSimplifiedText(null)
      setShowSimplified(false)
      setSimplifyError(null)
      setIsCached(false)
      try {
        const promptId = isLLM ? selectedPromptId : 'default'
        const extra = isLLM ? additionalRequest.trim() || undefined : undefined
        const res = await onRunAnalysis(subjectId, selectedProvider, promptId, extra, forceRefresh)
        if (res.llmFailed) {
          setErrorMessage(`내장 알고리즘으로 대체 해석했습니다. ${res.llmError || 'LLM 설정을 확인해주세요.'}`)
          setProviderLabel('내장 알고리즘')
        } else {
          const model = res.usedModel && res.usedModel !== 'default' ? ` (${res.usedModel})` : ''
          setProviderLabel(`${res.usedProvider}${model}`)
          setIsCached(res.cached ?? false)
        }
        if (promptId !== 'default') {
          const meta = promptOptions.find((p) => p.id === promptId)
          if (meta) setPromptLabel(meta.name)
        }
        onAnalysisComplete?.()
      } catch (error) {
        console.error("Failed to run saju analysis", error)
        setErrorMessage(`사주 분석에 실패했습니다. (원인: ${error instanceof Error ? error.message : '알 수 없는 오류'}) 다시 시도해주세요.`)
      }
    })
  }

  function handleReset() {
    startResetTransition(async () => {
      const result = await onReset(subjectId)
      if (result.success) {
        onAnalysisComplete?.()
      } else {
        setErrorMessage(result.error ?? "초기화 실패")
      }
      setShowResetDialog(false)
    })
  }

  const calculatedAt = analysis?.calculatedAt ? toDate(analysis.calculatedAt) : null

  return (
    <Card data-testid={dataTestId}>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <CardTitle>사주 분석</CardTitle>
          <SajuHelpDialog />
        </div>
        <div className="flex items-center gap-2">
          {historyPanel && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => setShowHistory(!showHistory)}
            >
              <History className="h-4 w-4" />
              이력
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => handleRunAnalysis(true)}
            disabled={isPending || !canAnalyze}
            title="캐시 무시하고 새로 분석"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            새로고침
          </Button>
          {analysis && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-destructive hover:text-destructive"
              onClick={() => setShowResetDialog(true)}
              disabled={isResetting}
              title="분석 결과 초기화"
            >
              <Trash2 className="h-4 w-4" />
              초기화
            </Button>
          )}
          <div className="text-xs text-muted-foreground">
            {calculatedAt
              ? `최근 계산: ${format(calculatedAt, "yyyy.MM.dd HH:mm", { locale: ko })}`
              : "아직 분석되지 않았어요."}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 이력 패널 (student만) */}
        {showHistory && historyPanel}

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">1. 기본 정보</h3>
          <div className="rounded-md bg-muted p-4 text-sm text-foreground">
            <p>{subjectLabel}</p>
            {birthDate ? (
              <>
                <p>
                  생년월일: {format(toDate(birthDate), "yyyy년 M월 d일", { locale: ko })}
                </p>
                <p>
                  출생 시간: {formatBirthTime(birthTimeHour, birthTimeMinute)}
                  {(birthTimeHour === null || birthTimeHour === undefined) ? " (시주 계산 제외)" : ""}
                </p>
              </>
            ) : (
              <p className="text-amber-600">생년월일 정보가 없어 분석을 실행할 수 없어요.</p>
            )}
          </div>

          {/* 분석 설정 영역 */}
          <div className="rounded-md border border p-4 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
              <ProviderSelector
                selectedProvider={selectedProvider}
                onProviderChange={setSelectedProvider}
                availableProviders={enabledProviders}
                showBuiltIn
                disabled={isPending}
              />
              {isLLM && (
                <PromptSelector
                  selectedPromptId={selectedPromptId}
                  onPromptChange={setSelectedPromptId}
                  promptOptions={promptOptions}
                  disabled={isPending}
                  showInfoCard
                />
              )}
            </div>

            {isLLM && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  추가 요청 / 특이사항 (선택)
                </label>
                <Textarea
                  placeholder={placeholder}
                  value={additionalRequest}
                  onChange={(e) => setAdditionalRequest(e.target.value)}
                  disabled={isPending}
                  rows={2}
                  className="text-sm resize-none"
                  maxLength={500}
                />
                <p className="text-[10px] text-muted-foreground text-right">
                  {additionalRequest.length}/500
                </p>
              </div>
            )}

            <Button
              type="button"
              disabled={isPending || !canAnalyze}
              data-testid={dataTestId ? `${dataTestId}-analyze-button` : undefined}
              onClick={() => handleRunAnalysis(false)}
              className="w-full sm:w-auto"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  분석 중...
                </>
              ) : (
                "사주 분석 실행"
              )}
            </Button>
          </div>

          {!canAnalyze && (
            <p className="text-xs text-amber-600">
              생년월일 정보를 먼저 입력해주세요.
            </p>
          )}

          {errorMessage && (
            <div className="flex items-center justify-between gap-4 mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{errorMessage}</p>
              <Button
                onClick={() => handleRunAnalysis(false)}
                disabled={isPending}
                variant="outline"
                size="sm"
                data-testid={dataTestId ? "retry-button" : undefined}
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    재시도 중...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-1" />
                    다시 시도
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* 사주 구조 */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">2. 사주 구조</h3>
          {result ? (
            <div data-testid={dataTestId ? "saju-result" : undefined} className="grid gap-3 rounded-md border border bg-card p-4 text-sm">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">연주</p>
                  <p data-testid={dataTestId ? "year-pillar" : undefined} className="font-medium">
                    {hanjaLabel(result.pillars.year.stem, result.pillars.year.branch)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">월주</p>
                  <p data-testid={dataTestId ? "month-pillar" : undefined} className="font-medium">
                    {hanjaLabel(result.pillars.month.stem, result.pillars.month.branch)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">일주</p>
                  <p data-testid={dataTestId ? "day-pillar" : undefined} className="font-medium">
                    {hanjaLabel(result.pillars.day.stem, result.pillars.day.branch)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">시주</p>
                  <p data-testid={dataTestId ? "hour-pillar" : undefined} className="font-medium">
                    {result.pillars.hour
                      ? hanjaLabel(result.pillars.hour.stem, result.pillars.hour.branch)
                      : "미상"}
                  </p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                절기: {result.meta.solarTerm} · <span data-testid={dataTestId ? "ohang-analysis" : undefined}>오행 균형: 목 {result.elements.목} / 화 {result.elements.화} / 토 {result.elements.토} / 금 {result.elements.금} / 수 {result.elements.수}</span>
              </div>
            </div>
          ) : (
            <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
              아직 계산된 사주 구조가 없습니다.
            </div>
          )}
        </div>

        {/* 해석 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-muted-foreground">3. 해석</h3>
            {providerLabel && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                {providerLabel}
              </span>
            )}
            {promptLabel && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200">
                {promptLabel}
              </span>
            )}
            {isCached && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200">
                ⚡ 캐시됨
              </span>
            )}
            {analysis?.interpretation && selectedProvider !== 'built-in' && (
              <button
                type="button"
                disabled={isSimplifying}
                onClick={handleSimplify}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border transition-colors ${
                  showSimplified
                    ? 'bg-amber-100 text-amber-700 border-amber-300'
                    : 'bg-card text-muted-foreground border hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200'
                }`}
              >
                {isSimplifying ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                쉽게 풀이
              </button>
            )}
            {analysis?.interpretation && (
              <div className="ml-auto flex rounded-md border border text-xs overflow-hidden">
                <button
                  type="button"
                  className={`px-2.5 py-1 transition-colors ${viewMode === "rendered" ? "bg-gray-800 text-white" : "bg-card text-muted-foreground hover:bg-muted"}`}
                  onClick={() => setViewMode("rendered")}
                >
                  미리보기
                </button>
                <button
                  type="button"
                  className={`px-2.5 py-1 border-l border transition-colors ${viewMode === "markdown" ? "bg-gray-800 text-white" : "bg-card text-muted-foreground hover:bg-muted"}`}
                  onClick={() => setViewMode("markdown")}
                >
                  원문
                </button>
              </div>
            )}
          </div>
          {analysis?.interpretation?.trim() ? (
            <>
              {showSimplified && simplifiedText && (
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                    <Sparkles className="inline h-3 w-3 mr-0.5" />
                    쉽게 풀이 보기 중
                  </span>
                </div>
              )}
              {viewMode === "rendered" ? (
                <div className="rounded-md border border bg-card p-4 max-h-[500px] overflow-y-auto">
                  <MarkdownRenderer content={showSimplified && simplifiedText ? simplifiedText : analysis.interpretation} />
                </div>
              ) : (
                <div className="rounded-md border border bg-muted p-4 text-sm leading-6 text-foreground whitespace-pre-wrap font-mono">
                  {showSimplified && simplifiedText ? simplifiedText : analysis.interpretation}
                </div>
              )}
              {simplifyError && (
                <p className="text-xs text-red-500 mt-1">{simplifyError}</p>
              )}
            </>
          ) : (
            <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
              사주 해석이 아직 생성되지 않았어요.
            </div>
          )}
        </div>
      </CardContent>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>사주 분석 결과를 초기화할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              현재 분석 결과가 삭제됩니다. 이력은 유지됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isResetting ? <Loader2 className="h-4 w-4 animate-spin" /> : "초기화"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
