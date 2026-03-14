"use client"

import { useState, useTransition } from "react"
import { Brain, Edit3, Sparkles, AlertCircle, Trash2, Loader2 } from "lucide-react"
import { MbtiResultsDisplay } from "@/components/mbti/results-display"
import { MbtiDirectInputModal } from "@/components/students/mbti-direct-input-modal"
import { saveTeacherMbtiDirectInput, generateTeacherMbtiLLMInterpretation } from "@/lib/actions/teacher/analysis"
import type { ProviderName } from "@/features/ai-engine"
import { ProviderSelector } from "@/components/students/provider-selector"
import { PromptSelector } from "@/components/students/prompt-selector"
import type { GenericPromptMeta } from "@/components/students/prompt-selector"
import { MbtiHelpDialog } from "@/components/students/mbti-help-dialog"
import { Button } from "@/components/ui/button"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { resetAnalysis } from "@/lib/actions/reset-analysis"

type MbtiAnalysis = {
  mbtiType: string
  percentages: Record<string, number>
  calculatedAt: Date
} | null

type Props = {
  teacherId: string
  teacherName: string
  analysis: MbtiAnalysis
  enabledProviders?: ProviderName[]
  promptOptions?: GenericPromptMeta[]
  onDataChange?: () => void
}

export function TeacherMbtiPanel({ teacherId, teacherName, analysis, enabledProviders = [], promptOptions = [], onDataChange }: Props) {
  const [showDirectInput, setShowDirectInput] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedProvider, setSelectedProvider] = useState('auto')
  const [selectedPromptId, setSelectedPromptId] = useState('default')
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [isResetting, startResetTransition] = useTransition()

  function handleReset() {
    startResetTransition(async () => {
      const result = await resetAnalysis("mbti", "TEACHER", teacherId)
      if (result.success) {
        onDataChange?.()
      } else {
        setErrorMessage(result.error ?? "초기화 실패")
      }
      setShowResetDialog(false)
    })
  }

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
      const result = await saveTeacherMbtiDirectInput(teacherId, data)
      if (result.success) {
        setShowDirectInput(false)
        onDataChange?.()
      } else {
        setErrorMessage("MBTI 저장에 실패했습니다. 다시 시도해주세요.")
      }
    } catch (error) {
      setErrorMessage(`MBTI 저장에 실패했습니다. (원인: ${error instanceof Error ? error.message : '알 수 없는 오류'})`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="bg-card rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Brain className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="text-lg font-semibold">MBTI 성향 분석</h2>
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
          <div className="bg-red-50 dark:bg-red-950/30 border-l-4 border-red-400 p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
              <div className="ml-3">
                <p className="text-sm text-red-800 dark:text-red-300">{errorMessage}</p>
                <Button onClick={() => setErrorMessage(null)} variant="outline" size="sm" className="mt-2">
                  닫기
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* AI 해석 설정 영역 */}
        {analysis && (
          <div className="rounded-md border border p-4">
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
              <Button
                onClick={async () => {
                  setIsGeneratingAI(true)
                  setErrorMessage(null)
                  try {
                    await generateTeacherMbtiLLMInterpretation(teacherId, selectedProvider, selectedPromptId)
                    onDataChange?.()
                  } catch (error) {
                    setErrorMessage(`AI 해석에 실패했습니다. (원인: ${error instanceof Error ? error.message : '알 수 없는 오류'})`)
                  } finally {
                    setIsGeneratingAI(false)
                  }
                }}
                disabled={isGeneratingAI}
                className="w-full sm:w-auto"
              >
                <Sparkles className="w-4 h-4 mr-1" />
                {isGeneratingAI ? "AI 해석 중..." : "AI로 해석하기"}
              </Button>
            </div>
          </div>
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
          <div className="text-center py-8">
            <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">
              아직 MBTI 분석이 없습니다.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowDirectInput(true)}
                className="inline-flex items-center gap-2 px-4 py-2 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 dark:bg-purple-950/30 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                직접 입력
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 직접 입력 모달 */}
      {showDirectInput && (
        <MbtiDirectInputModal
          studentId={teacherId}
          studentName={teacherName}
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

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>MBTI 분석 결과를 초기화할까요?</AlertDialogTitle>
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
