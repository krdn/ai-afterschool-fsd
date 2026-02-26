'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { generateScenarioAction } from '@/lib/actions/counseling/scenario-generation'
import { MarkdownEditor } from './markdown-editor'
import { ModelSelect, type ModelOverride } from './model-select'

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
  const [modelOverride, setModelOverride] = useState<ModelOverride | undefined>()
  const hasGenerated = useRef(false)

  // 마운트 시 자동 생성 (시나리오가 아직 없는 경우)
  useEffect(() => {
    if (!scenario && !hasGenerated.current) {
      hasGenerated.current = true
      handleGenerate()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const result = await generateScenarioAction({
        studentId,
        topic,
        approvedReport,
        modelOverride,
      })
      if (result.success) {
        onScenarioChange(result.data)
        toast.success('상담 시나리오가 생성되었습니다.')
      } else {
        toast.error(result.error || '시나리오 생성에 실패했습니다.')
      }
    } catch {
      toast.error('오류가 발생했습니다.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-medium mb-1">상담 시나리오</h3>
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
