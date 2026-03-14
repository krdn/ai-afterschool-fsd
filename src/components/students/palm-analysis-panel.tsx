"use client"

import { useState, useTransition } from "react"
import Image from "next/image"
import { Hand, Sparkles, AlertCircle, RefreshCw, Loader2, Trash2 } from "lucide-react"
import { analyzePalmImage } from "@/lib/actions/student/ai-image-analysis"
import { DISCLAIMER_TEXT } from "@/features/ai-engine/prompts"
import type { ProviderName } from "@/features/ai-engine"
import { ProviderSelector } from "@/components/students/provider-selector"
import { PromptSelector } from "@/components/students/prompt-selector"
import type { GenericPromptMeta } from "@/components/students/prompt-selector"
import { PalmHelpDialog } from "@/components/students/palm-help-dialog"
import { Button } from "@/components/ui/button"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { resetAnalysis } from "@/lib/actions/reset-analysis"

type PalmAnalysis = {
  id: string
  status: string
  result: unknown
  imageUrl: string
  hand: string
  errorMessage: string | null
} | null

type Props = {
  studentId: string
  analysis: PalmAnalysis
  palmImageUrl: string | null
  enabledProviders?: ProviderName[]
  visionProviders?: ProviderName[]
  promptOptions?: GenericPromptMeta[]
}

export function PalmAnalysisPanel({
  studentId,
  analysis,
  palmImageUrl,
  enabledProviders = [],
  visionProviders,
  promptOptions = []
}: Props) {
  const [, startTransition] = useTransition()
  const [localStatus, setLocalStatus] = useState<'idle' | 'analyzing'>('idle')
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [isResetting, startResetTransition] = useTransition()
  const [selectedHand, setSelectedHand] = useState<'left' | 'right'>(
    (analysis?.hand === 'left' || analysis?.hand === 'right') ? analysis.hand : 'right'
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedProvider, setSelectedProvider] = useState('auto')
  const [selectedPromptId, setSelectedPromptId] = useState('default')

  const handleAnalyze = () => {
    if (!palmImageUrl) {
      alert("먼저 손바닥 사진을 업로드해주세요.")
      return
    }

    setLocalStatus('analyzing')
    setErrorMessage(null)
    startTransition(async () => {
      const result = await analyzePalmImage(studentId, palmImageUrl, selectedHand, selectedProvider, selectedPromptId)
      if (result.success) {
        window.location.reload()
      } else {
        setErrorMessage(`이미지 분석에 실패했습니다. (원인: ${result.error || '알 수 없는 오류'}) 다시 시도해주세요.`)
        setLocalStatus('idle')
      }
    })
  }

  const isAnalyzing = localStatus === 'analyzing' ||
    (analysis?.status === 'pending')

  function handleReset() {
    startResetTransition(async () => {
      const result = await resetAnalysis("palm", "STUDENT", studentId)
      if (result.success) {
        window.location.reload()
      } else {
        setErrorMessage(result.error ?? "초기화 실패")
      }
      setShowResetDialog(false)
    })
  }

  return (
    <div className="bg-card rounded-lg shadow-sm overflow-hidden" data-testid="palmistry-tab">
      {/* Header */}
      <div className="px-6 py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
            <Hand className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="text-lg font-semibold">AI 손금 분석</h2>
          <PalmHelpDialog />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {promptOptions.length > 0 && (
            <PromptSelector
              selectedPromptId={selectedPromptId}
              onPromptChange={setSelectedPromptId}
              promptOptions={promptOptions}
              disabled={isAnalyzing}
            />
          )}
          <ProviderSelector
            selectedProvider={selectedProvider}
            onProviderChange={setSelectedProvider}
            availableProviders={enabledProviders}
            requiresVision
            visionProviders={visionProviders}
            disabled={isAnalyzing}
          />
          {analysis?.status === 'complete' && (
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
      </div>

      {/* Content */}
      <div className="p-6">
        {analysis?.status === 'complete' && analysis.result ? (
          <AnalysisResult result={analysis.result} imageUrl={analysis.imageUrl} hand={analysis.hand as 'left' | 'right'} />
        ) : analysis?.status === 'failed' || errorMessage ? (
          <ErrorState
            message={errorMessage || analysis?.errorMessage || "이미지 분석에 실패했습니다. 다시 시도해주세요."}
            onRetry={handleAnalyze}
            isRetrying={isAnalyzing}
          />
        ) : isAnalyzing ? (
          <LoadingState />
        ) : (
          <EmptyState
            hasImage={!!palmImageUrl}
            selectedHand={selectedHand}
            onHandChange={setSelectedHand}
            onAnalyze={handleAnalyze}
          />
        )}
      </div>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>손금 분석 결과를 초기화할까요?</AlertDialogTitle>
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

function AnalysisResult({ result, imageUrl, hand }: { result: unknown; imageUrl: string; hand: 'left' | 'right' }) {
  const analysisResult = result as {
    clarity: 'clear' | 'unclear' | 'partial'
    linesDetected: {
      lifeLine: string
      headLine: string
      heartLine: string
      fateLine?: string
      marriageLine?: string
    }
    personalityTraits: string[]
    fortune: {
      academic: string
      career: string
      talents: string
    }
    overallInterpretation?: string
  }
  return (
    <div className="space-y-6">
      {/* Image Preview with Hand Label */}
      <div className="flex flex-col items-center">
        <Image
          src={imageUrl}
          alt={`${hand === 'left' ? '왼손' : '오른손'} 손바닥 사진`}
          width={192}
          height={192}
          className="w-48 h-48 object-cover rounded-lg shadow-md"
        />
        <span className="mt-2 text-sm text-muted-foreground">
          {hand === 'left' ? '왼손 (감성/본성)' : '오른손 (현실/능력)'}
        </span>
      </div>

      {/* Disclaimer Banner */}
      <div className="bg-yellow-50 dark:bg-yellow-950/30 border-l-4 border-yellow-400 p-4">
        <p className="text-sm text-yellow-800 dark:text-yellow-300">
          {DISCLAIMER_TEXT.palm}
        </p>
      </div>

      {/* Clarity Indicator */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">손금 선명도:</span>
        <ClarityBadge clarity={analysisResult.clarity} />
      </div>

      {/* Lines Detected */}
      <div>
        <h3 className="font-semibold mb-2">주요 손금</h3>
        <dl className="space-y-3">
          <LineItem label="생명선" description={analysisResult.linesDetected.lifeLine} />
          <LineItem label="두뇌선" description={analysisResult.linesDetected.headLine} />
          <LineItem label="감정선" description={analysisResult.linesDetected.heartLine} />
          {analysisResult.linesDetected.fateLine && (
            <LineItem label="운명선" description={analysisResult.linesDetected.fateLine} />
          )}
          {analysisResult.linesDetected.marriageLine && (
            <LineItem label="결혼선" description={analysisResult.linesDetected.marriageLine} />
          )}
        </dl>
      </div>

      {/* Personality Traits */}
      <div>
        <h3 className="font-semibold mb-2">성격 특성</h3>
        <ul className="list-disc list-inside space-y-1">
          {analysisResult.personalityTraits.map((trait: string, i: number) => (
            <li key={i} className="text-foreground">{trait}</li>
          ))}
        </ul>
      </div>

      {/* Fortune */}
      <div>
        <h3 className="font-semibold mb-2">운세 해석</h3>
        <div className="space-y-2 text-sm">
          <p><span className="font-medium">학업 적성:</span> {analysisResult.fortune.academic}</p>
          <p><span className="font-medium">진로 적성:</span> {analysisResult.fortune.career}</p>
          <p><span className="font-medium">특이사항:</span> {analysisResult.fortune.talents}</p>
        </div>
      </div>

      {/* Overall Interpretation */}
      {analysisResult.overallInterpretation && (
        <div>
          <h3 className="font-semibold mb-2">종합 해석</h3>
          <p className="text-foreground text-sm leading-relaxed">
            {analysisResult.overallInterpretation}
          </p>
        </div>
      )}
    </div>
  )
}

function ClarityBadge({ clarity }: { clarity: 'clear' | 'unclear' | 'partial' }) {
  const styles = {
    clear: 'bg-green-100 text-green-800 dark:text-green-300',
    partial: 'bg-yellow-100 text-yellow-800 dark:text-yellow-300',
    unclear: 'bg-red-100 text-red-800 dark:text-red-300'
  }

  const labels = {
    clear: '선명함',
    partial: '일부만 보임',
    unclear: '흐릿함'
  }

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${styles[clarity]}`}>
      {labels[clarity]}
    </span>
  )
}

function LineItem({ label, description }: { label: string; description: string }) {
  return (
    <div>
      <dt className="text-sm font-medium text-foreground">{label}</dt>
      <dd className="text-sm text-muted-foreground mt-1">{description}</dd>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="text-center py-8">
      <div className="animate-spin w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4" />
      <p className="text-muted-foreground">AI가 손바닥 사진을 분석 중이에요...</p>
      <p className="text-sm text-muted-foreground mt-2">10~20초 정도 소요됩니다.</p>
    </div>
  )
}

function EmptyState({
  hasImage,
  selectedHand,
  onHandChange,
  onAnalyze
}: {
  hasImage: boolean
  selectedHand: 'left' | 'right'
  onHandChange: (hand: 'left' | 'right') => void
  onAnalyze: () => void
}) {
  return (
    <div className="text-center py-8">
      <Hand className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
      <p className="text-muted-foreground mb-4">
        {hasImage
          ? "손바닥 사진이 준비되었어요. 분석을 시작할까요?"
          : "아직 손바닥 사진이 없어요. 학생 정보에서 손바닥 사진을 업로드해주세요."
        }
      </p>

      {hasImage && (
        <div className="space-y-4">
          {/* Hand Selection */}
          <div className="flex items-center justify-center gap-4">
            <span className="text-sm text-muted-foreground">손 선택:</span>
            <div className="flex gap-2">
              <button
                onClick={() => onHandChange('left')}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  selectedHand === 'left'
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-card text-foreground border hover:border-purple-400'
                }`}
              >
                왼손 (감성)
              </button>
              <button
                onClick={() => onHandChange('right')}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  selectedHand === 'right'
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-card text-foreground border hover:border-purple-400'
                }`}
              >
                오른손 (현실)
              </button>
            </div>
          </div>

          <button
            onClick={onAnalyze}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            분석 시작
          </button>
        </div>
      )}
    </div>
  )
}

function ErrorState({ message, onRetry, isRetrying }: { message: string; onRetry: () => void; isRetrying: boolean }) {
  return (
    <div className="text-center py-8">
      <div data-testid="analysis-error" className="bg-red-50 dark:bg-red-950/30 border-l-4 border-red-400 p-4 mb-4 text-left">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <div className="ml-3">
            <p className="text-sm text-red-800 dark:text-red-300">{message}</p>
          </div>
        </div>
      </div>
      <Button
        onClick={onRetry}
        disabled={isRetrying}
        variant="outline"
        data-testid="retry-button"
      >
        {isRetrying ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            재시도 중...
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4 mr-2" />
            다시 시도
          </>
        )}
      </Button>
    </div>
  )
}
