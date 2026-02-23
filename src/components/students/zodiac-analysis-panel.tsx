"use client"

import { useState, useTransition } from "react"
import { Star, Trash2, Loader2 } from "lucide-react"
import { ZodiacHelpDialog } from "@/components/students/zodiac-help-dialog"
import { runZodiacAnalysis, generateZodiacLLMInterpretation } from "@/lib/actions/student/zodiac-analysis"
import type { ProviderName } from "@/features/ai-engine"
import type { GenericPromptMeta } from "@/components/students/prompt-selector"
import { Button } from "@/components/ui/button"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { resetAnalysis } from "@/lib/actions/reset-analysis"
import ReactMarkdown from "react-markdown"
import {
  AnalysisErrorBanner,
  AIInterpretationControls,
  AnalysisEmptyState,
} from "@/components/common/analysis-panel"

type ZodiacAnalysisData = {
  zodiacSign: string
  zodiacName: string
  element: string
  traits: unknown
  interpretation: string | null
  calculatedAt: Date | string
} | null

type Props = {
  studentId: string
  analysis: ZodiacAnalysisData
  enabledProviders?: ProviderName[]
  promptOptions?: GenericPromptMeta[]
  onDataChange?: () => void
}

export function ZodiacAnalysisPanel({ studentId, analysis, enabledProviders = [], promptOptions = [], onDataChange }: Props) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [isResetting, startResetTransition] = useTransition()

  function handleReset() {
    startResetTransition(async () => {
      const result = await resetAnalysis("zodiac", "STUDENT", studentId)
      if (result.success) {
        onDataChange?.()
      } else {
        setErrorMessage(result.error ?? "초기화 실패")
      }
      setShowResetDialog(false)
    })
  }

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    setErrorMessage(null)
    try {
      await runZodiacAnalysis(studentId)
      onDataChange?.()
    } catch (error) {
      setErrorMessage(`별자리 분석에 실패했습니다. (${error instanceof Error ? error.message : "알 수 없는 오류"})`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleLLMInterpretation = async (provider: string, promptId: string) => {
    setIsGeneratingAI(true)
    setErrorMessage(null)
    try {
      await generateZodiacLLMInterpretation(studentId, provider, promptId)
      onDataChange?.()
    } catch (error) {
      setErrorMessage(`AI 해석에 실패했습니다. (${error instanceof Error ? error.message : "알 수 없는 오류"})`)
    } finally {
      setIsGeneratingAI(false)
    }
  }

  const traits = analysis?.traits as { symbol?: string; elementName?: string; rulingPlanet?: string; dateRange?: string } | undefined

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Star className="w-5 h-5 text-indigo-600" />
          </div>
          <h2 className="text-lg font-semibold">별자리 운세</h2>
          <ZodiacHelpDialog />
        </div>
        {!analysis ? (
          <Button onClick={handleAnalyze} disabled={isAnalyzing}>
            {isAnalyzing ? "분석 중..." : "별자리 분석"}
          </Button>
        ) : (
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
      </div>

      <div className="p-6 space-y-6">
        {errorMessage && (
          <AnalysisErrorBanner
            message={errorMessage}
            onDismiss={() => setErrorMessage(null)}
          />
        )}

        {analysis ? (
          <>
            {/* 별자리 요약 카드 */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-6">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-4xl">{traits?.symbol ?? "⭐"}</span>
                <div>
                  <h3 className="text-xl font-bold text-indigo-800">{analysis.zodiacName}</h3>
                  <p className="text-sm text-indigo-600">
                    {traits?.elementName} · {traits?.rulingPlanet} · {traits?.dateRange}
                  </p>
                </div>
              </div>
              <Button onClick={handleAnalyze} variant="outline" size="sm" disabled={isAnalyzing}>
                {isAnalyzing ? "재분석 중..." : "재분석"}
              </Button>
            </div>

            {/* AI 해석 설정 */}
            <AIInterpretationControls
              enabledProviders={enabledProviders}
              promptOptions={promptOptions}
              isGenerating={isGeneratingAI}
              onGenerate={handleLLMInterpretation}
            />

            {/* 해석 결과 표시 */}
            {analysis.interpretation && (
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{analysis.interpretation}</ReactMarkdown>
              </div>
            )}
          </>
        ) : (
          <AnalysisEmptyState
            icon={Star}
            message="아직 별자리 분석이 없습니다."
            actionLabel="별자리 분석 시작"
            onAction={handleAnalyze}
            isLoading={isAnalyzing}
          />
        )}
      </div>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>별자리 분석 결과를 초기화할까요?</AlertDialogTitle>
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
    </div>
  )
}
