'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Eye, Pencil, RotateCcw, Check, Loader2, Copy } from 'lucide-react'
import { toast } from 'sonner'

interface MarkdownEditorProps {
  title: string
  content: string
  onChange: (content: string) => void
  onApprove: () => void
  onRegenerate: () => void
  isGenerating: boolean
  isApproved: boolean
  showCopyButton?: boolean
  placeholder?: string
}

export function MarkdownEditor({
  title,
  content,
  onChange,
  onApprove,
  onRegenerate,
  isGenerating,
  isApproved,
  showCopyButton = false,
  placeholder = 'AI가 생성한 내용이 여기에 표시됩니다...',
}: MarkdownEditorProps) {
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('preview')

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      toast.success('클립보드에 복사되었습니다.')
    } catch {
      toast.error('클립보드 복사에 실패했습니다.')
    }
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b">
        <h4 className="text-sm font-medium">{title}</h4>
        <div className="flex items-center gap-1">
          {showCopyButton && content && (
            <Button variant="ghost" size="sm" onClick={handleCopy}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          )}
          {content && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('edit')}
                className={cn(viewMode === 'edit' && 'bg-muted')}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('preview')}
                className={cn(viewMode === 'preview' && 'bg-muted')}
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 본문 */}
      <div className="min-h-[200px] max-h-[400px] overflow-y-auto">
        {isGenerating ? (
          <div className="flex items-center justify-center h-[200px]">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">
              AI가 문서를 생성하고 있습니다...
            </span>
          </div>
        ) : !content ? (
          <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
            {placeholder}
          </div>
        ) : viewMode === 'edit' ? (
          <textarea
            className="w-full h-full min-h-[200px] p-4 text-sm font-mono resize-none border-0 focus:outline-none"
            value={content}
            onChange={(e) => onChange(e.target.value)}
            disabled={isApproved}
          />
        ) : (
          <div className="p-4 prose prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        )}
      </div>

      {/* 액션 바 */}
      {content && (
        <div className="flex items-center justify-end gap-2 px-4 py-2 border-t bg-muted/30">
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            disabled={isGenerating || isApproved}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            재생성
          </Button>
          <Button
            size="sm"
            onClick={onApprove}
            disabled={isGenerating || isApproved}
            className={cn(isApproved && 'bg-green-600 hover:bg-green-600')}
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            {isApproved ? '승인됨' : '승인'}
          </Button>
        </div>
      )}
    </div>
  )
}
