'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { ChevronLeft, Loader2, AlertCircle, RotateCcw } from 'lucide-react'
import { generateParentSummaryAction, getParentPromptPreviewAction } from '@/lib/actions/counseling/scenario-generation'
import { InlineHelp } from '@/components/help/inline-help'
import { MarkdownEditor } from './markdown-editor'
import { ModelSelect, type ModelOverride } from './model-select'
import { PromptEditorPanel } from './prompt-editor-panel'

interface ParentSummaryStepProps {
  studentName: string
  topic: string
  scheduledAt: string
  approvedScenario: string
  parentSummary: string
  isParentSummaryApproved: boolean
  onParentSummaryChange: (summary: string) => void
  onParentSummaryApprove: () => void
  onBack: () => void
  onSubmit: () => void
  isSubmitting: boolean
}

export function ParentSummaryStep({
  studentName,
  topic,
  scheduledAt,
  approvedScenario,
  parentSummary,
  isParentSummaryApproved,
  onParentSummaryChange,
  onParentSummaryApprove,
  onBack,
  onSubmit,
  isSubmitting,
}: ParentSummaryStepProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [modelOverride, setModelOverride] = useState<ModelOverride | undefined>()
  const [defaultPrompt, setDefaultPrompt] = useState<string | null>(null)
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false)
  const [customPrompt, setCustomPrompt] = useState<string | undefined>()
  const hasGenerated = useRef(false)

  // 마운트 시 자동 생성 (학부모 공유용이 아직 없는 경우)
  useEffect(() => {
    if (!parentSummary && !hasGenerated.current) {
      hasGenerated.current = true
      handleGenerate()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 프롬프트 프리뷰 로드
  const loadPromptPreview = useCallback(async () => {
    setIsLoadingPrompt(true)
    try {
      const result = await getParentPromptPreviewAction({ studentName, topic, scheduledAt, approvedScenario })
      if (result.success) {
        setDefaultPrompt(result.data.prompt)
      }
    } catch { /* ignore */ }
    setIsLoadingPrompt(false)
  }, [studentName, topic, scheduledAt, approvedScenario])

  const handleGenerate = async () => {
    setIsGenerating(true)
    setErrorMessage(null)
    try {
      const result = await generateParentSummaryAction({
        studentName,
        topic,
        scheduledAt,
        approvedScenario,
        modelOverride,
        customPrompt,
      })
      if (result.success) {
        onParentSummaryChange(result.data)
        toast.success('학부모 공유용 메시지가 생성되었습니다.')
      } else {
        const msg = result.error || '메시지 생성에 실패했습니다.'
        setErrorMessage(msg)
        toast.error(msg)
      }
    } catch {
      const msg = '오류가 발생했습니다. 다시 시도해주세요.'
      setErrorMessage(msg)
      toast.error(msg)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <InlineHelp helpId="counseling-ai-pipeline">
            <h3 className="text-lg font-medium mb-1">학부모 공유용</h3>
          </InlineHelp>
          <p className="text-sm text-muted-foreground">
            학부모에게 전달할 상담 안내 메시지입니다. 민감 정보(심리 분석, 성격
            진단 등)는 포함되지 않습니다.
          </p>
        </div>
        <ModelSelect
          featureType="counseling_parent"
          onModelChange={setModelOverride}
          disabled={isGenerating}
        />
      </div>

      {/* 프롬프트 편집 패널 */}
      <PromptEditorPanel
        promptType="parent_summary"
        defaultPrompt={defaultPrompt}
        isLoadingPrompt={isLoadingPrompt}
        onPromptChange={setCustomPrompt}
        onLoadPrompt={loadPromptPreview}
      />

      {/* 에러 발생 시 재시도 안내 */}
      {errorMessage && !parentSummary && !isGenerating && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/5 p-4">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-destructive">메시지 생성 실패</p>
            <p className="text-sm text-muted-foreground mt-0.5">{errorMessage}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            className="shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            재시도
          </Button>
        </div>
      )}

      <MarkdownEditor
        title="학부모 공유용 메시지"
        content={parentSummary}
        onChange={onParentSummaryChange}
        onApprove={onParentSummaryApprove}
        onRegenerate={handleGenerate}
        isGenerating={isGenerating}
        isApproved={isParentSummaryApproved}
        showCopyButton={true}
        placeholder="학부모에게 보낼 상담 안내 메시지가 자동 생성됩니다..."
      />

      {/* 하단 네비게이션 */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          이전
        </Button>
        <Button
          onClick={onSubmit}
          disabled={!isParentSummaryApproved || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              등록 중...
            </>
          ) : (
            '예약 등록'
          )}
        </Button>
      </div>
    </div>
  )
}
