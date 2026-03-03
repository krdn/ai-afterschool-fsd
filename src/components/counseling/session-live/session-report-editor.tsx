'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import { Loader2, RotateCcw, Check, Pencil, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { completeSessionAction } from '@/lib/actions/counseling/session-live'
import { generateCounselingReportAction } from '@/lib/actions/counseling/report-generation'

type SessionReportEditorProps = {
  content: string
  onChange: (content: string) => void
  sessionId: string
  reservationId: string
  completionData: {
    type: string
    duration: number
    summary: string
    followUpRequired: boolean
    followUpDate?: string
    satisfactionScore?: number
  }
  onBack: () => void
}

export function SessionReportEditor({
  content,
  onChange,
  sessionId,
  reservationId,
  completionData,
  onBack,
}: SessionReportEditorProps) {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('preview')
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [isFinalizing, setIsFinalizing] = useState(false)

  // 보고서 재생성
  const handleRegenerate = async () => {
    setIsRegenerating(true)
    try {
      const result = await generateCounselingReportAction({
        sessionId,
        type: completionData.type as 'ACADEMIC' | 'CAREER' | 'PSYCHOLOGICAL' | 'BEHAVIORAL',
        duration: completionData.duration,
        summary: completionData.summary,
      })

      if (result.success) {
        onChange(result.data)
        toast.success('보고서가 재생성되었습니다.')
      } else {
        toast.error(result.error || '보고서 재생성에 실패했습니다.')
      }
    } catch {
      toast.error('오류가 발생했습니다.')
    } finally {
      setIsRegenerating(false)
    }
  }

  // 보고서 확정 및 상담 완료
  const handleFinalize = async () => {
    setIsFinalizing(true)
    try {
      const result = await completeSessionAction({
        sessionId,
        reservationId,
        type: completionData.type as 'ACADEMIC' | 'CAREER' | 'PSYCHOLOGICAL' | 'BEHAVIORAL',
        duration: completionData.duration,
        summary: completionData.summary,
        aiSummary: content,
        followUpRequired: completionData.followUpRequired,
        ...(completionData.followUpDate && { followUpDate: completionData.followUpDate }),
        ...(completionData.satisfactionScore && { satisfactionScore: completionData.satisfactionScore }),
      })

      if (result.success) {
        toast.success('상담 보고서가 확정되었습니다.')
        router.push('/counseling')
      } else {
        toast.error(result.error || '보고서 확정에 실패했습니다.')
      }
    } catch {
      toast.error('오류가 발생했습니다.')
    } finally {
      setIsFinalizing(false)
    }
  }

  const isLoading = isRegenerating || isFinalizing

  return (
    <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
      {/* 헤더: 제목 + 편집/미리보기 토글 */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">AI 상담 보고서</h3>
        <div className="flex items-center gap-1">
          <Button
            variant={viewMode === 'edit' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('edit')}
            disabled={isLoading}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'preview' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('preview')}
            disabled={isLoading}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 콘텐츠 영역: 편집 모드 또는 미리보기 모드 */}
      <div className="border rounded-lg">
        {viewMode === 'edit' ? (
          <textarea
            value={content}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              'w-full min-h-[400px] max-h-[60vh] p-4 font-mono text-sm',
              'bg-transparent resize-y rounded-lg',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              'overflow-y-auto'
            )}
            disabled={isLoading}
          />
        ) : (
          <div className="min-h-[400px] max-h-[60vh] overflow-y-auto p-4">
            {content ? (
              <MarkdownRenderer content={content} />
            ) : (
              <p className="text-sm text-muted-foreground">보고서 내용이 없습니다.</p>
            )}
          </div>
        )}
      </div>

      {/* 하단 버튼 */}
      <div className="flex items-center gap-2 pt-2">
        <Button variant="outline" onClick={onBack} disabled={isLoading}>
          이전 단계
        </Button>
        <Button
          variant="outline"
          onClick={handleRegenerate}
          disabled={isLoading}
        >
          {isRegenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="h-4 w-4" />
          )}
          재생성
        </Button>
        <Button
          onClick={handleFinalize}
          disabled={isLoading}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
        >
          {isFinalizing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          보고서 확정
        </Button>
      </div>
    </div>
  )
}
