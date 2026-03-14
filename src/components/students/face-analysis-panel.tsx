"use client"

import { useState, useTransition, useEffect, useRef, useCallback } from "react"
import { Camera, Sparkles, AlertCircle, RefreshCw, Loader2, Trash2 } from "lucide-react"
import { analyzeFaceImage, getFaceAnalysis as getFaceAnalysisAction } from "@/lib/actions/student/ai-image-analysis"
import { DISCLAIMER_TEXT } from "@/features/ai-engine/prompts"
import type { ProviderName } from "@/features/ai-engine"
import { ProviderSelector } from "@/components/students/provider-selector"
import { PromptSelector } from "@/components/students/prompt-selector"
import type { GenericPromptMeta } from "@/components/students/prompt-selector"
import { FaceHelpDialog } from "@/components/students/face-help-dialog"
import { Button } from "@/components/ui/button"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { resetAnalysis } from "@/lib/actions/reset-analysis"

type FaceAnalysis = {
  id: string
  status: string
  result: unknown
  imageUrl: string
  errorMessage: string | null
  usedProvider: string | null
  usedModel: string | null
} | null

type Props = {
  studentId: string
  analysis: FaceAnalysis
  faceImageUrl: string | null
  enabledProviders?: ProviderName[]
  visionProviders?: ProviderName[]
  promptOptions?: GenericPromptMeta[]
  onDataChange?: () => void
}

export function FaceAnalysisPanel({
  studentId,
  analysis: initialAnalysis,
  faceImageUrl,
  enabledProviders = [],
  visionProviders,
  promptOptions = [],
  onDataChange
}: Props) {
  const [, startTransition] = useTransition()
  const [localStatus, setLocalStatus] = useState<'idle' | 'analyzing'>('idle')
  const [analysis, setAnalysis] = useState<FaceAnalysis>(initialAnalysis)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedProvider, setSelectedProvider] = useState('auto')
  const [selectedPromptId, setSelectedPromptId] = useState('default')
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [isResetting, startResetTransition] = useTransition()

  // props에서 analysis가 변경되면 동기화
  useEffect(() => {
    setAnalysis(initialAnalysis)
  }, [initialAnalysis])

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  // 분석 완료 대기 폴링
  const startPolling = useCallback(() => {
    stopPolling()
    pollingRef.current = setInterval(async () => {
      try {
        const result = await getFaceAnalysisAction(studentId)
        if (result && (result.status === 'complete' || result.status === 'failed')) {
          setAnalysis(result as FaceAnalysis)
          setLocalStatus('idle')
          stopPolling()
          onDataChange?.()
        }
      } catch {
        // 폴링 중 에러는 무시하고 계속 시도
      }
    }, 3000)
  }, [studentId, stopPolling, onDataChange])

  // 컴포넌트 언마운트 시 폴링 정리
  useEffect(() => stopPolling, [stopPolling])

  const handleAnalyze = () => {
    if (!faceImageUrl) {
      alert("먼저 얼굴 사진을 업로드해주세요.")
      return
    }

    setLocalStatus('analyzing')
    setErrorMessage(null)
    startTransition(async () => {
      const result = await analyzeFaceImage(studentId, faceImageUrl, selectedProvider, selectedPromptId)
      if (result.success) {
        // 백그라운드 분석 시작됨 → 폴링으로 결과 대기
        startPolling()
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
      const result = await resetAnalysis("face", "STUDENT", studentId)
      if (result.success) {
        setAnalysis(null)
        onDataChange?.()
      } else {
        setErrorMessage(result.error ?? "초기화 실패")
      }
      setShowResetDialog(false)
    })
  }

  return (
    <div className="bg-card rounded-lg shadow-sm overflow-hidden" data-testid="physiognomy-tab">
      {/* Header */}
      <div className="px-6 py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
            <Sparkles className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold">AI 관상 분석</h2>
          <FaceHelpDialog />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <ProviderSelector
            selectedProvider={selectedProvider}
            onProviderChange={setSelectedProvider}
            availableProviders={enabledProviders}
            requiresVision
            visionProviders={visionProviders}
            disabled={isAnalyzing}
          />
          {promptOptions.length > 0 && (
            <PromptSelector
              selectedPromptId={selectedPromptId}
              onPromptChange={setSelectedPromptId}
              promptOptions={promptOptions}
              disabled={isAnalyzing}
            />
          )}
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
          <AnalysisResult
            result={analysis.result}
            imageUrl={analysis.imageUrl}
            usedProvider={analysis.usedProvider}
            usedModel={analysis.usedModel}
            onReanalyze={handleAnalyze}
            isReanalyzing={isAnalyzing}
          />
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
            hasImage={!!faceImageUrl}
            onAnalyze={handleAnalyze}
          />
        )}
      </div>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>관상 분석 결과를 초기화할까요?</AlertDialogTitle>
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

function AnalysisResult({ result, imageUrl, usedProvider, usedModel, onReanalyze, isReanalyzing }: { result: unknown; imageUrl: string | null; usedProvider?: string | null; usedModel?: string | null; onReanalyze: () => void; isReanalyzing: boolean }) {
  const providerLabel = usedProvider
    ? `${usedProvider}${usedModel ? ` (${usedModel})` : ''}`
    : null
  const analysisResult = result as {
    faceShape: string
    features: {
      eyes: string
      nose: string
      mouth: string
      ears: string
      forehead: string
      chin: string
    }
    personalityTraits: string[]
    fortune: {
      academic: string
      career: string
      relationships: string
    }
    overallInterpretation?: string
  }
  return (
    <div className="space-y-6">
      {/* Image Preview */}
      {imageUrl && (
        <div className="flex justify-center">
          <img
            src={imageUrl}
            alt="얼굴 사진"
            className="w-48 h-48 object-cover rounded-lg shadow-md"
          />
        </div>
      )}

      {/* Disclaimer Banner */}
      <div className="bg-yellow-50 dark:bg-yellow-950/30 border-l-4 border-yellow-400 p-4">
        <p className="text-sm text-yellow-800 dark:text-yellow-300">
          {DISCLAIMER_TEXT.face}
        </p>
      </div>

      {/* Provider Label */}
      {providerLabel && (
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-600 border border-blue-200">
            {providerLabel}
          </span>
        </div>
      )}

      {/* Face Shape */}
      <div>
        <h3 className="font-semibold mb-2">얼굴형</h3>
        <p className="text-foreground">{analysisResult.faceShape}</p>
      </div>

      {/* Features */}
      <div>
        <h3 className="font-semibold mb-2">이목구비</h3>
        <dl className="grid grid-cols-2 gap-3">
          <FeatureItem label="눈" value={analysisResult.features.eyes} />
          <FeatureItem label="코" value={analysisResult.features.nose} />
          <FeatureItem label="입" value={analysisResult.features.mouth} />
          <FeatureItem label="귀" value={analysisResult.features.ears} />
          <FeatureItem label="이마" value={analysisResult.features.forehead} />
          <FeatureItem label="턱" value={analysisResult.features.chin} />
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
          <p><span className="font-medium">학업:</span> {analysisResult.fortune.academic}</p>
          <p><span className="font-medium">진로:</span> {analysisResult.fortune.career}</p>
          <p><span className="font-medium">인간관계:</span> {analysisResult.fortune.relationships}</p>
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

      {/* Reanalyze Button */}
      <div className="pt-4 border-t">
        <Button
          onClick={onReanalyze}
          disabled={isReanalyzing}
          variant="outline"
          className="w-full"
        >
          {isReanalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              분석 중...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              다시 분석하기
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

function FeatureItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="text-center py-8">
      <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
      <p className="text-muted-foreground">AI가 얼굴 사진을 분석 중이에요...</p>
      <p className="text-sm text-muted-foreground mt-2">10~20초 정도 소요됩니다.</p>
    </div>
  )
}

function EmptyState({ hasImage, onAnalyze }: { hasImage: boolean; onAnalyze: () => void }) {
  return (
    <div className="text-center py-8">
      <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
      <p className="text-muted-foreground mb-4">
        {hasImage
          ? "얼굴 사진이 준비되었어요. 분석을 시작할까요?"
          : "아직 얼굴 사진이 없어요. 학생 정보에서 얼굴 사진을 업로드해주세요."
        }
      </p>
      {hasImage && (
        <button
          onClick={onAnalyze}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          분석 시작
        </button>
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
