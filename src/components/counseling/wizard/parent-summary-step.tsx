'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { generateParentSummaryAction } from '@/lib/actions/counseling/scenario-generation'
import { MarkdownEditor } from './markdown-editor'

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
  const hasGenerated = useRef(false)

  // 마운트 시 자동 생성 (학부모 공유용이 아직 없는 경우)
  useEffect(() => {
    if (!parentSummary && !hasGenerated.current) {
      hasGenerated.current = true
      handleGenerate()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const result = await generateParentSummaryAction({
        studentName,
        topic,
        scheduledAt,
        approvedScenario,
      })
      if (result.success) {
        onParentSummaryChange(result.data)
        toast.success('학부모 공유용 메시지가 생성되었습니다.')
      } else {
        toast.error(result.error || '메시지 생성에 실패했습니다.')
      }
    } catch {
      toast.error('오류가 발생했습니다.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-1">학부모 공유용</h3>
        <p className="text-sm text-muted-foreground">
          학부모에게 전달할 상담 안내 메시지입니다. 민감 정보(심리 분석, 성격
          진단 등)는 포함되지 않습니다.
        </p>
      </div>

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
