'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, AlertCircle, RotateCcw } from 'lucide-react'
import { generateScenarioAction, getScenarioPromptPreviewAction } from '@/lib/actions/counseling/scenario-generation'
import { InlineHelp } from '@/components/help/inline-help'
import { MarkdownEditor } from './markdown-editor'
import { ModelSelect, type ModelOverride } from './model-select'
import { PromptEditorPanel } from './prompt-editor-panel'

interface ScenarioStepProps {
  studentId: string
  topic: string
  approvedReport: string
  scenario: string
  isScenarioApproved: boolean
  onScenarioChange: (scenario: string) => void
  onScenarioApprove: () => void
  onBack: () => void
  onNext: () => void
}

export function ScenarioStep({
  studentId,
  topic,
  approvedReport,
  scenario,
  isScenarioApproved,
  onScenarioChange,
  onScenarioApprove,
  onBack,
  onNext,
}: ScenarioStepProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [modelOverride, setModelOverride] = useState<ModelOverride | undefined>()
  const [defaultPrompt, setDefaultPrompt] = useState<string | null>(null)
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false)
  const [customPrompt, setCustomPrompt] = useState<string | undefined>()
  const hasGenerated = useRef(false)

  // 마운트 시 자동 생성 (시나리오가 아직 없는 경우)
  useEffect(() => {
    if (!scenario && !hasGenerated.current) {
      hasGenerated.current = true
      handleGenerate()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 프롬프트 프리뷰 로드
  const loadPromptPreview = useCallback(async () => {
    setIsLoadingPrompt(true)
    try {
      const result = await getScenarioPromptPreviewAction({ studentId, topic, approvedReport })
      if (result.success) {
        setDefaultPrompt(result.data.prompt)
      }
    } catch { /* ignore */ }
    setIsLoadingPrompt(false)
  }, [studentId, topic, approvedReport])

  const handleGenerate = async () => {
    setIsGenerating(true)
    setErrorMessage(null)
    try {
      const result = await generateScenarioAction({
        studentId,
        topic,
        approvedReport,
        modelOverride,
        customPrompt,
      })
      if (result.success) {
        onScenarioChange(result.data)
        toast.success('상담 시나리오가 생성되었습니다.')
      } else {
        const msg = result.error || '시나리오 생성에 실패했습니다.'
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
          <InlineHelp helpId="counseling-ai-prompts">
            <h3 className="text-lg font-medium mb-1">상담 시나리오</h3>
          </InlineHelp>
          <p className="text-sm text-muted-foreground">
            승인된 분석 보고서를 기반으로 30분 상담 시나리오가 생성됩니다. 필요 시 편집 후 승인해주세요.
          </p>
        </div>
        <ModelSelect
          featureType="counseling_scenario"
          onModelChange={setModelOverride}
          disabled={isGenerating}
        />
      </div>

      {/* 프롬프트 편집 패널 */}
      <PromptEditorPanel
        promptType="scenario"
        defaultPrompt={defaultPrompt}
        isLoadingPrompt={isLoadingPrompt}
        onPromptChange={setCustomPrompt}
        onLoadPrompt={loadPromptPreview}
      />

      {/* 에러 발생 시 재시도 안내 */}
      {errorMessage && !scenario && !isGenerating && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/5 p-4">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-destructive">시나리오 생성 실패</p>
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
        title="상담 시나리오 (도입 → 본론 → 마무리)"
        content={scenario}
        onChange={onScenarioChange}
        onApprove={onScenarioApprove}
        onRegenerate={handleGenerate}
        isGenerating={isGenerating}
        isApproved={isScenarioApproved}
      />

      {/* 하단 네비게이션 */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          이전
        </Button>
        {isScenarioApproved && (
          <Button onClick={onNext}>
            다음
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  )
}
