'use client'

import { useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import {
  updateNoteAction,
  addNoteAction,
  deleteNoteAction,
} from '@/lib/actions/counseling/session-notes'
import { Input } from '@/components/ui/input'
import { SessionChecklistItem } from './session-checklist-item'

interface CounselingNoteData {
  id: string
  content: string
  memo: string | null
  checked: boolean
  order: number
  source: string
}

interface SessionChecklistProps {
  sessionId: string
  initialNotes: CounselingNoteData[]
}

type SaveStatus = 'idle' | 'saving' | 'saved'

export function SessionChecklist({
  sessionId,
  initialNotes,
}: SessionChecklistProps) {
  const [notes, setNotes] = useState<CounselingNoteData[]>(initialNotes)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [isAdding, setIsAdding] = useState(false)
  const [newContent, setNewContent] = useState('')
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 저장 상태 표시 (2초 후 idle로 복귀)
  const showSaved = () => {
    setSaveStatus('saved')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
  }

  // 체크/메모 수정
  const handleUpdate = async (
    noteId: string,
    data: { checked?: boolean; memo?: string }
  ) => {
    // 낙관적 업데이트
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, ...data } : n))
    )
    setSaveStatus('saving')

    const result = await updateNoteAction({ noteId, ...data })
    if (result.success) {
      showSaved()
    } else {
      toast.error(result.error ?? '저장에 실패했습니다.')
      // 롤백: 이전 상태로 복원
      setNotes((prev) =>
        prev.map((n) => {
          if (n.id !== noteId) return n
          const original = initialNotes.find((o) => o.id === noteId)
          return original ?? n
        })
      )
      setSaveStatus('idle')
    }
  }

  // 항목 삭제
  const handleDelete = async (noteId: string) => {
    const prevNotes = [...notes]
    setNotes((prev) => prev.filter((n) => n.id !== noteId))

    const result = await deleteNoteAction(noteId)
    if (!result.success) {
      toast.error(result.error ?? '삭제에 실패했습니다.')
      setNotes(prevNotes)
    }
  }

  // 새 항목 추가
  const handleAdd = async () => {
    const content = newContent.trim()
    if (!content) {
      setIsAdding(false)
      setNewContent('')
      return
    }

    setNewContent('')
    setIsAdding(false)
    setSaveStatus('saving')

    const result = await addNoteAction({ sessionId, content })
    if (result.success && 'data' in result) {
      const newNote: CounselingNoteData = {
        id: result.data.noteId,
        content,
        memo: null,
        checked: false,
        order: notes.length,
        source: 'MANUAL',
      }
      setNotes((prev) => [...prev, newNote])
      showSaved()
    } else if (!result.success) {
      toast.error(result.error ?? '항목 추가에 실패했습니다.')
      setSaveStatus('idle')
    }
  }

  const handleAddKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
    if (e.key === 'Escape') {
      setIsAdding(false)
      setNewContent('')
    }
  }

  return (
    <div className="space-y-1">
      {/* 헤더 + 저장 상태 */}
      <div className="flex items-center justify-between px-2">
        <h3 className="text-sm font-medium">체크리스트</h3>
        {saveStatus !== 'idle' && (
          <span className="text-xs text-muted-foreground">
            {saveStatus === 'saving' ? '저장 중...' : '저장됨 \u2713'}
          </span>
        )}
      </div>

      {/* 체크리스트 항목 */}
      <div className="space-y-0.5">
        {notes
          .sort((a, b) => a.order - b.order)
          .map((note) => (
            <SessionChecklistItem
              key={note.id}
              id={note.id}
              content={note.content}
              memo={note.memo}
              checked={note.checked}
              source={note.source}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
      </div>

      {/* 항목 추가 */}
      {isAdding ? (
        <div className="px-2">
          <Input
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            onKeyDown={handleAddKeyDown}
            onBlur={handleAdd}
            placeholder="새 항목을 입력하세요"
            className="h-8 text-sm"
            autoFocus
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        >
          <Plus className="size-4" />
          항목 추가
        </button>
      )}
    </div>
  )
}
