"use client"

import { useState, useTransition } from "react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { Sparkles, AlertCircle, Type, Trash2, Loader2 } from "lucide-react"
import { NameHelpDialog } from "@/components/students/name-help-dialog"
import { runNameAnalysisAction } from "@/app/[locale]/(dashboard)/students/[id]/name/actions"
import { runNameAnalysis, generateNameLLMInterpretation } from "@/lib/actions/student/name-interpretation"
import type { NameNumerologyResult } from "@/features/analysis"
import {
  coerceHanjaSelections,
  getStrokeInfo,
  normalizeHanjaSelections,
  selectionsToHanjaName,
} from "@/features/analysis/name"
import type { ProviderName } from "@/features/ai-engine"
import { ProviderSelector } from "@/components/students/provider-selector"
import { PromptSelector } from "@/components/students/prompt-selector"
import type { GenericPromptMeta } from "@/components/students/prompt-selector"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { resetAnalysis } from "@/lib/actions/reset-analysis"
import ReactMarkdown from "react-markdown"

type NameAnalysisPanelProps = {
  student: {
    id: string
    name: string
    nameHanja?: unknown
  }
  analysis: {
    result: unknown
    interpretation: string | null
    calculatedAt: Date | string
  } | null
  enabledProviders?: ProviderName[]
  promptOptions?: GenericPromptMeta[]
  onDataChange?: () => void
}

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value)
}

export function NameAnalysisPanel({ student, analysis, enabledProviders = [], promptOptions = [], onDataChange }: NameAnalysisPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedProvider, setSelectedProvider] = useState("auto")
  const [selectedPromptId, setSelectedPromptId] = useState("default")
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [isResetting, startResetTransition] = useTransition()

  function handleReset() {
    startResetTransition(async () => {
      const result = await resetAnalysis("name", "STUDENT", student.id)
      if (result.success) {
        onDataChange?.()
      } else {
        setErrorMessage(result.error ?? "초기화 실패")
      }
      setShowResetDialog(false)
    })
  }

  const selections = normalizeHanjaSelections(
    student.name,
    coerceHanjaSelections(student.nameHanja)
  )
  const hanjaName = selectionsToHanjaName(selections)
  const canAnalyzeHanja = selections.length > 0 && selections.every((s) => s.hanja)
  const result = analysis?.result as NameNumerologyResult | undefined

  const calculatedAt = analysis?.calculatedAt
    ? toDate(analysis.calculatedAt)
    : null

  // 한자 기반 분석 실행
  const handleHanjaAnalysis = () => {
    startTransition(async () => {
      setErrorMessage(null)
      try {
        await runNameAnalysisAction(student.id)
        onDataChange?.()
      } catch (error) {
        console.error("Failed to run name analysis", error)
        setErrorMessage("성명학 분석 실행에 실패했어요. 한자 선택을 확인해주세요.")
      }
    })
  }

  // 한글 이름 기반 분석 (한자 없이도 가능)
  const handleNameAnalysis = async () => {
    setErrorMessage(null)
    try {
      await runNameAnalysis(student.id)
      onDataChange?.()
    } catch (error) {
      setErrorMessage(`이름 분석에 실패했습니다. (${error instanceof Error ? error.message : "알 수 없는 오류"})`)
    }
  }

  // LLM 해석
  const handleLLMInterpretation = async () => {
    setIsGeneratingAI(true)
    setErrorMessage(null)
    try {
      await generateNameLLMInterpretation(student.id, selectedProvider, selectedPromptId)
      onDataChange?.()
    } catch (error) {
      setErrorMessage(`AI 해석에 실패했습니다. (${error instanceof Error ? error.message : "알 수 없는 오류"})`)
    } finally {
      setIsGeneratingAI(false)
    }
  }

  return (
    <Card data-testid="name-tab">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Type className="w-5 h-5 text-amber-600" />
          </div>
          <CardTitle>이름풀이</CardTitle>
          <NameHelpDialog />
        </div>
        <div className="flex items-center gap-3">
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
          <div className="text-xs text-gray-500">
            {calculatedAt
              ? `최근 분석: ${format(calculatedAt, "yyyy.MM.dd HH:mm", { locale: ko })}`
              : "아직 분석되지 않았어요."}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {errorMessage && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
              <div className="ml-3">
                <p className="text-sm text-red-800">{errorMessage}</p>
                <Button onClick={() => setErrorMessage(null)} variant="outline" size="sm" className="mt-2">
                  닫기
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 한자 선택 및 성명학 분석 */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-600">1. 한자 기반 성명학</h3>
          <div className="rounded-md bg-gray-50 p-4 text-sm text-gray-700">
            <p>학생: {student.name}</p>
            <p>선택 한자: {hanjaName ?? "미선택"}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {selections.map((selection, index) => (
                <div
                  key={`${selection.syllable}-${index}`}
                  className="flex items-center justify-between rounded-md bg-white px-3 py-2"
                >
                  <span>
                    {selection.syllable} → {selection.hanja ?? "-"}
                  </span>
                  <span className="text-xs text-gray-500">
                    {selection.hanja
                      ? (() => {
                        const info = getStrokeInfo(selection.hanja)
                        if (!info) return "?획"
                        return info.estimated
                          ? `~${info.strokes}획`
                          : `${info.strokes}획`
                      })()
                      : "획수 없음"}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              disabled={isPending || !canAnalyzeHanja}
              onClick={handleHanjaAnalysis}
              variant="outline"
            >
              {isPending ? "분석 중..." : "성명학 수리 분석"}
            </Button>
            {!analysis && (
              <Button
                type="button"
                onClick={handleNameAnalysis}
              >
                한글 이름풀이
              </Button>
            )}
          </div>
          {!canAnalyzeHanja && (
            <p className="text-xs text-amber-600">
              한자 수리 분석은 모든 글자에 한자를 선택해야 가능합니다. 한글 이름풀이는 바로 실행 가능합니다.
            </p>
          )}
        </div>

        {/* 수리 격국 */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-600">2. 수리 격국</h3>
          {result?.grids ? (
            <div className="grid gap-3 rounded-md border border-gray-200 bg-white p-4 text-sm">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-gray-500">원격</p>
                  <p className="font-medium">{result.grids.won}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">형격</p>
                  <p className="font-medium">{result.grids.hyung}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">이격</p>
                  <p className="font-medium">{result.grids.yi}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">정격</p>
                  <p className="font-medium">{result.grids.jeong}</p>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                총 획수: {result.strokes.total}획 · 성: {result.strokes.surname}획 · 이름: {result.strokes.givenName}획
              </div>
            </div>
          ) : (
            <div className="rounded-md bg-gray-50 p-4 text-sm text-gray-500">
              한자가 선택되지 않아 수리 분석이 없습니다.
            </div>
          )}
        </div>

        {/* AI 해석 설정 */}
        {analysis && (
          <div className="rounded-md border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-600 mb-3">3. AI 해석</h3>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
              <ProviderSelector
                selectedProvider={selectedProvider}
                onProviderChange={setSelectedProvider}
                availableProviders={enabledProviders}
                disabled={isGeneratingAI}
              />
              {promptOptions.length > 0 && (
                <PromptSelector
                  selectedPromptId={selectedPromptId}
                  onPromptChange={setSelectedPromptId}
                  promptOptions={promptOptions}
                  disabled={isGeneratingAI}
                />
              )}
              <Button onClick={handleLLMInterpretation} disabled={isGeneratingAI} className="w-full sm:w-auto">
                <Sparkles className="w-4 h-4 mr-1" />
                {isGeneratingAI ? "AI 해석 중..." : "AI로 해석하기"}
              </Button>
            </div>
          </div>
        )}

        {/* 해석 결과 */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-600">{analysis ? "4. 해석 결과" : "3. 해석"}</h3>
          {analysis?.interpretation ? (
            <div className="prose prose-sm max-w-none rounded-md border border-gray-200 bg-white p-4">
              <ReactMarkdown>{analysis.interpretation}</ReactMarkdown>
            </div>
          ) : (
            <div className="rounded-md bg-gray-50 p-4 text-sm text-gray-500">
              이름풀이 해석이 아직 생성되지 않았어요.
            </div>
          )}
        </div>
      </CardContent>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>이름풀이 분석 결과를 초기화할까요?</AlertDialogTitle>
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
