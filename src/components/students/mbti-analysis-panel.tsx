"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Brain, Pencil, Edit3, Trash2, Loader2 } from "lucide-react"
import { MbtiResultsDisplay } from "@/components/mbti/results-display"
import { MbtiDirectInputModal } from "@/components/students/mbti-direct-input-modal"
import { saveMbtiDirectInput, generateMbtiLLMInterpretation } from "@/lib/actions/student/mbti-survey"
import type { ProviderName } from "@/features/ai-engine"
import type { GenericPromptMeta } from "@/components/students/prompt-selector"
import { MbtiHelpDialog } from "@/components/students/mbti-help-dialog"
import { Button } from "@/components/ui/button"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { resetAnalysis } from "@/lib/actions/reset-analysis"
import {
  AnalysisErrorBanner,
  AIInterpretationControls,
  AnalysisEmptyState,
} from "@/components/common/analysis-panel"

type MbtiAnalysis = {
  mbtiType: string
  percentages: Record<string, number>
  calculatedAt: Date
} | null

type Props = {
  studentId: string
  studentName: string
  analysis: MbtiAnalysis
  enabledProviders?: ProviderName[]
  promptOptions?: GenericPromptMeta[]
  onDataChange?: () => void
}

export function MbtiAnalysisPanel({ studentId, studentName, analysis, enabledProviders = [], promptOptions = [], onDataChange }: Props) {
  const [showDirectInput, setShowDirectInput] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [isResetting, startResetTransition] = useTransition()

  const handleDirectInputSave = async (data: {
    mbtiType: string
    percentages: {
      E: number; I: number
      S: number; N: number
      T: number; F: number
      J: number; P: number
    }
  }) => {
    setIsSaving(true)
    setErrorMessage(null)
    try {
      const result = await saveMbtiDirectInput(studentId, data)
      if (result.success) {
        setShowDirectInput(false)
        onDataChange?.()
      } else {
        setErrorMessage(`MBTI 분석에 실패했습니다. 다시 시도해주세요.`)
      }
    } catch (error) {
      setErrorMessage(`MBTI 분석에 실패했습니다. (원인: ${error instanceof Error ? error.message : '알 수 없는 오류'}) 다시 시도해주세요.`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleLLMInterpretation = async (provider: string, promptId: string) => {
    setIsGeneratingAI(true)
    setErrorMessage(null)
    try {
      await generateMbtiLLMInterpretation(studentId, provider, promptId)
      onDataChange?.()
    } catch (error) {
      setErrorMessage(`AI 해석에 실패했습니다. (원인: ${error instanceof Error ? error.message : '알 수 없는 오류'})`)
    } finally {
      setIsGeneratingAI(false)
    }
  }

  function handleReset() {
    startResetTransition(async () => {
      const result = await resetAnalysis("mbti", "STUDENT", studentId)
      if (result.success) {
        onDataChange?.()
      } else {
        setErrorMessage(result.error ?? "초기화 실패")
      }
      setShowResetDialog(false)
    })
  }

  return (
    <div className="bg-card rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Brain className="w-5 h-5 text-purple-600" />
          </div>
          <h2 data-testid="mbti-tab" className="text-lg font-semibold">MBTI 성향 분석</h2>
          <MbtiHelpDialog />
        </div>
        {analysis && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDirectInput(true)}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground px-2 py-1 hover:bg-muted rounded-lg transition-colors"
              title="MBTI 유형 직접 입력"
            >
              <Edit3 className="w-4 h-4" />
              <span className="hidden sm:inline">직접 입력</span>
            </button>
            <Link
              href={`/students/${studentId}/mbti`}
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
            testId="analysis-error"
          />
        )}

        {/* AI 해석 설정 영역 */}
        {analysis && (
          <AIInterpretationControls
            enabledProviders={enabledProviders}
            promptOptions={promptOptions}
            isGenerating={isGeneratingAI}
            onGenerate={handleLLMInterpretation}
          />
        )}

        {/* MBTI 결과 표시 */}
        {analysis ? (
          <MbtiResultsDisplay
            analysis={{
              mbtiType: analysis.mbtiType,
              percentages: analysis.percentages as {
                E: number; I: number
                S: number; N: number
                T: number; F: number
                J: number; P: number
              },
              calculatedAt: analysis.calculatedAt
            }}
          />
        ) : (
          <AnalysisEmptyState
            icon={Brain}
            message="아직 MBTI 분석이 없습니다."
          >
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowDirectInput(true)}
                className="inline-flex items-center gap-2 px-4 py-2 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 dark:bg-purple-950/30 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                직접 입력
              </button>
              <Link
                href={`/students/${studentId}/mbti`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <Brain className="w-4 h-4" />
                설문 시작
              </Link>
            </div>
          </AnalysisEmptyState>
        )}
      </div>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>MBTI 분석 결과를 초기화할까요?</AlertDialogTitle>
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

      {/* 직접 입력 모달 */}
      {showDirectInput && (
        <MbtiDirectInputModal
          studentId={studentId}
          studentName={studentName}
          existingData={analysis ? {
            mbtiType: analysis.mbtiType,
            percentages: analysis.percentages as {
              E: number; I: number
              S: number; N: number
              T: number; F: number
              J: number; P: number
            }
          } : undefined}
          onSave={handleDirectInputSave}
          onCancel={() => {
            setShowDirectInput(false)
            setErrorMessage(null)
          }}
          isSaving={isSaving}
        />
      )}
    </div>
  )
}
