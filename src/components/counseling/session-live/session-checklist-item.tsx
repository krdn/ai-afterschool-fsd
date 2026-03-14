'use client'

import { useRef, useState } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'

import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'

interface SessionChecklistItemProps {
  id: string
  content: string
  memo: string | null
  checked: boolean
  source: string // "AI" | "MANUAL"
  onUpdate: (noteId: string, data: { checked?: boolean; memo?: string }) => void
  onDelete: (noteId: string) => void
}

export function SessionChecklistItem({
  id,
  content,
  memo,
  checked,
  source,
  onUpdate,
  onDelete,
}: SessionChecklistItemProps) {
  const [memoOpen, setMemoOpen] = useState(false)
  const [memoValue, setMemoValue] = useState(memo ?? '')
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const debouncedUpdate = (data: { checked?: boolean; memo?: string }) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onUpdate(id, data), 500)
  }

  const handleCheckedChange = (value: boolean | 'indeterminate') => {
    if (value === 'indeterminate') return
    onUpdate(id, { checked: value })
  }

  const handleMemoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setMemoValue(value)
    debouncedUpdate({ memo: value })
  }

  return (
    <div className="group flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50">
      {/* 체크박스 + 내용 */}
      <Checkbox
        checked={checked}
        onCheckedChange={handleCheckedChange}
        className="mt-0.5"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            className={
              checked
                ? 'text-sm line-through text-muted-foreground'
                : 'text-sm'
            }
          >
            {content}
          </span>

          {/* AI 뱃지 */}
          {source === 'AI' && (
            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700 dark:text-blue-400">
              AI
            </span>
          )}
        </div>

        {/* 메모 토글 버튼 */}
        <button
          type="button"
          onClick={() => setMemoOpen((prev) => !prev)}
          className="mt-0.5 flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
        >
          {memoOpen ? (
            <ChevronUp className="size-3" />
          ) : (
            <ChevronDown className="size-3" />
          )}
          메모
        </button>

        {/* 메모 입력 */}
        {memoOpen && (
          <Input
            value={memoValue}
            onChange={handleMemoChange}
            placeholder="메모를 입력하세요"
            className="mt-1 h-7 text-xs"
          />
        )}
      </div>

      {/* 삭제 버튼 - 호버 시만 표시 */}
      <button
        type="button"
        onClick={() => onDelete(id)}
        className="mt-0.5 opacity-0 transition-opacity group-hover:opacity-100"
        aria-label="항목 삭제"
      >
        <X className="size-4 text-muted-foreground hover:text-destructive" />
      </button>
    </div>
  )
}
