"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { BookOpen, Pencil, Trash2, Loader2 } from "lucide-react"
import { VarkHelpDialog } from "@/components/students/vark-help-dialog"
import { VarkResultsDisplay } from "@/components/vark/results-display"
import { generateVarkLLMInterpretation } from "@/lib/actions/student/vark-survey"
import type { ProviderName } from "@/features/ai-engine"
import type { GenericPromptMeta } from "@/components/students/prompt-selector"
import {
  AnalysisErrorBanner,
  AIInterpretationControls,
  AnalysisEmptyState,
} from "@/components/common/analysis-panel"
import { Button } from "@/components/ui/button"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { resetAnalysis } from "@/lib/actions/reset-analysis"

type VarkAnalysis = {
  varkType: string
  scores: Record<string, number>
  percentages: Record<string, number>
  interpretation: string | null
  calculatedAt: Date
} | null

type Props = {
  studentId: string
  studentName: string
  analysis: VarkAnalysis
  enabledProviders?: ProviderName[]
  promptOptions?: GenericPromptMeta[]
  onDataChange?: () => void
}

export function VarkAnalysisPanel({ studentId, studentName: _studentName, analysis, enabledProviders = [], promptOptions = [], onDataChange }: Props) {
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [isResetting, startResetTransition] = useTransition()

  function handleReset() {
    startResetTransition(async () => {
      const result = await resetAnalysis("vark", "STUDENT", studentId)
      if (result.success) {
        onDataChange?.()
      } else {
        setErrorMessage(result.error ?? "초기화 실패")
      }
      setShowResetDialog(false)
    })
  }

  const handleLLMInterpretation = async (provider: string, promptId: string) => {
    setIsGeneratingAI(true)
    setErrorMessage(null)
    try {
      await generateVarkLLMInterpretation(studentId, provider, promptId)
      onDataChange?.()
    } catch (error) {
      setErrorMessage(`AI 해석에 실패했습니다. (${error instanceof Error ? error.message : "알 수 없는 오류"})`)
    } finally {
      setIsGeneratingAI(false)
    }
  }

  return (
    <div className="bg-card rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-100 rounded-lg">
            <BookOpen className="w-5 h-5 text-teal-600" />
          </div>
          <h2 className="text-lg font-semibold">VARK 학습유형 검사</h2>
          <VarkHelpDialog />
        </div>
        {analysis && (
          <div className="flex items-center gap-2">
            <Link
              href={`/students/${studentId}/vark`}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground px-2 py-1 hover:bg-muted rounded-lg transition-colors"
              title="설문 재검사"
            >
              <Pencil className="w-4 h-4" />
              <span className="hidden sm:inline">재검사</span>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-destructive hover:text-destructive"
              onClick={() => setShowResetDialog(true)}
              disabled={isResetting}
              title="분석 결과 초기화"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">초기화</span>
            </Button>
          </div>
        )}
      </div>

      <div className="p-6 space-y-6">
        {errorMessage && (
          <AnalysisErrorBanner
            message={errorMessage}
            onDismiss={() => setErrorMessage(null)}
          />
        )}

        {/* AI 해석 설정 */}
        {analysis && (
          <AIInterpretationControls
            enabledProviders={enabledProviders}
            promptOptions={promptOptions}
            isGenerating={isGeneratingAI}
            onGenerate={handleLLMInterpretation}
          />
        )}

        {/* VARK 결과 표시 */}
        {analysis ? (
          <VarkResultsDisplay
            analysis={{
              varkType: analysis.varkType,
              scores: analysis.scores,
              percentages: analysis.percentages,
              interpretation: analysis.interpretation,
              calculatedAt: analysis.calculatedAt,
            }}
          />
        ) : (
          <AnalysisEmptyState
            icon={BookOpen}
            message="아직 VARK 학습유형 검사를 하지 않았습니다."
          >
            <Link
              href={`/students/${studentId}/vark`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
              <BookOpen className="w-4 h-4" />
              검사 시작
            </Link>
          </AnalysisEmptyState>
        )}
      </div>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>학습유형 분석 결과를 초기화할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              현재 분석 결과와 설문 임시저장이 삭제됩니다.
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
