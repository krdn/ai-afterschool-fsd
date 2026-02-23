"use client"

import { useState, useTransition } from "react"
import Image from "next/image"
import { Hand, Sparkles, AlertCircle, Trash2, Loader2 } from "lucide-react"
import { runTeacherPalmAnalysis } from "@/lib/actions/teacher/palm-analysis"
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

type TeacherPalmAnalysis = {
  id: string
  status: string
  result: unknown
  imageUrl: string
  hand: string
  errorMessage: string | null
} | null

type Props = {
  teacherId: string
  teacherName: string
  analysis: TeacherPalmAnalysis
  palmImageUrl: string | null
  enabledProviders?: ProviderName[]
  promptOptions?: GenericPromptMeta[]
}

export function TeacherPalmPanel({
  teacherId,
  teacherName,
  analysis,
  palmImageUrl,
  enabledProviders = [],
  promptOptions = [],
}: Props) {
  const [, startTransition] = useTransition()
  const [localStatus, setLocalStatus] = useState<'idle' | 'analyzing'>('idle')
  const [selectedHand, setSelectedHand] = useState<'left' | 'right'>(
    (analysis?.hand === 'left' || analysis?.hand === 'right') ? analysis.hand : 'right'
  )
  const [selectedProvider, setSelectedProvider] = useState('auto')
  const [selectedPromptId, setSelectedPromptId] = useState('default')

  const handleAnalyze = () => {
    if (!palmImageUrl) {
      alert("먼저 손바닥 사진을 업로드해주세요.")
      return
    }

    setLocalStatus('analyzing')
    startTransition(async () => {
      try {
        const result = await runTeacherPalmAnalysis(teacherId, palmImageUrl, selectedHand)
        if (result.success) {
          window.location.reload()
        }
      } catch {
        alert("분석 시작에 실패했습니다. 다시 시도해주세요.")
        setLocalStatus('idle')
      }
    })
  }

  const isAnalyzing = localStatus === 'analyzing' ||
    (analysis?.status === 'pending')

  const [showResetDialog, setShowResetDialog] = useState(false)
  const [isResetting, startResetTransition] = useTransition()

  function handleReset() {
    startResetTransition(async () => {
      const result = await resetAnalysis("palm", "TEACHER", teacherId)
      if (result.success) {
        window.location.reload()
      } else {
        alert(result.error ?? "초기화 실패")
      }
      setShowResetDialog(false)
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Hand className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="text-lg font-semibold">AI 손금 분석</h2>
          <PalmHelpDialog />
        </div>
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

      {/* Provider/Prompt selectors */}
      <div className="px-6 pt-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
          <ProviderSelector
            selectedProvider={selectedProvider}
            onProviderChange={setSelectedProvider}
            availableProviders={enabledProviders}
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
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {analysis?.status === 'complete' && analysis.result ? (
          <AnalysisResult result={analysis.result} imageUrl={analysis.imageUrl} hand={analysis.hand as 'left' | 'right'} />
        ) : analysis?.status === 'failed' ? (
          <ErrorState
            message={analysis.errorMessage || "분석에 실패했습니다."}
            onRetry={handleAnalyze}
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
      <div className="flex flex-col items-center">
        <Image
          src={imageUrl}
          alt={`${hand === 'left' ? '왼손' : '오른손'} 손바닥 사진`}
          width={192}
          height={192}
          className="w-48 h-48 object-cover rounded-lg shadow-md"
        />
        <span className="mt-2 text-sm text-gray-500">
          {hand === 'left' ? '왼손 (감성/본성)' : '오른손 (현실/능력)'}
        </span>
      </div>

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <p className="text-sm text-yellow-800">
          {DISCLAIMER_TEXT.palm}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">손금 선명도:</span>
        <ClarityBadge clarity={analysisResult.clarity} />
      </div>

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

      <div>
        <h3 className="font-semibold mb-2">성격 특성</h3>
        <ul className="list-disc list-inside space-y-1">
          {analysisResult.personalityTraits.map((trait: string, i: number) => (
            <li key={i} className="text-gray-700">{trait}</li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="font-semibold mb-2">운세 해석</h3>
        <div className="space-y-2 text-sm">
          <p><span className="font-medium">학업 적성:</span> {analysisResult.fortune.academic}</p>
          <p><span className="font-medium">진로 적성:</span> {analysisResult.fortune.career}</p>
          <p><span className="font-medium">특이사항:</span> {analysisResult.fortune.talents}</p>
        </div>
      </div>

      {analysisResult.overallInterpretation && (
        <div>
          <h3 className="font-semibold mb-2">종합 해석</h3>
          <p className="text-gray-700 text-sm leading-relaxed">
            {analysisResult.overallInterpretation}
          </p>
        </div>
      )}
    </div>
  )
}

function ClarityBadge({ clarity }: { clarity: 'clear' | 'unclear' | 'partial' }) {
  const styles = {
    clear: 'bg-green-100 text-green-800',
    partial: 'bg-yellow-100 text-yellow-800',
    unclear: 'bg-red-100 text-red-800'
  }
  const labels = { clear: '선명함', partial: '일부만 보임', unclear: '흐릿함' }
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${styles[clarity]}`}>
      {labels[clarity]}
    </span>
  )
}

function LineItem({ label, description }: { label: string; description: string }) {
  return (
    <div>
      <dt className="text-sm font-medium text-gray-700">{label}</dt>
      <dd className="text-sm text-gray-600 mt-1">{description}</dd>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="text-center py-8">
      <div className="animate-spin w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4" />
      <p className="text-gray-600">AI가 손바닥 사진을 분석 중이에요...</p>
      <p className="text-sm text-gray-500 mt-2">10~20초 정도 소요됩니다.</p>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="text-center py-8">
      <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4 text-left">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <div className="ml-3">
            <p className="text-sm text-red-800">{message}</p>
          </div>
        </div>
      </div>
      <Button variant="outline" onClick={onRetry}>
        다시 시도
      </Button>
    </div>
  )
}

function EmptyState({
  hasImage, selectedHand, onHandChange, onAnalyze
}: {
  hasImage: boolean
  selectedHand: 'left' | 'right'
  onHandChange: (hand: 'left' | 'right') => void
  onAnalyze: () => void
}) {
  return (
    <div className="text-center py-8">
      <Hand className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500 mb-4">
        {hasImage
          ? "손바닥 사진이 준비되었어요. 분석을 시작할까요?"
          : "아직 손바닥 사진이 없어요. 선생님 정보에서 손바닥 사진을 업로드해주세요."
        }
      </p>
      {hasImage && (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-4">
            <span className="text-sm text-gray-600">손 선택:</span>
            <div className="flex gap-2">
              <Button
                variant={selectedHand === 'left' ? 'default' : 'outline'}
                onClick={() => onHandChange('left')}
              >
                왼손 (감성)
              </Button>
              <Button
                variant={selectedHand === 'right' ? 'default' : 'outline'}
                onClick={() => onHandChange('right')}
              >
                오른손 (현실)
              </Button>
            </div>
          </div>
          <Button onClick={onAnalyze}>
            <Sparkles className="w-4 h-4 mr-1" />
            분석 시작
          </Button>
        </div>
      )}
    </div>
  )
}
