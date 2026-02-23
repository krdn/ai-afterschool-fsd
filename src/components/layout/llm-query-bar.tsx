"use client"

import { useState, useCallback, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { Sparkles, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { MentionsInput, Mention } from 'react-mentions-ts'
import type { MentionDataItem, MentionsInputChangeEvent } from 'react-mentions-ts'
import { useMention, occurrencesToMentionItems, type MentionExtra } from '@/hooks/use-mention'

const groupLabels: Record<string, string> = {
  student: '학생',
  teacher: '선생님',
  team: '학급',
}

export function LLMQueryBar() {
  const t = useTranslations("LLMChat")
  const router = useRouter()
  const pathname = usePathname()
  const [mentionMarkup, setMentionMarkup] = useState("")
  const [activeMentions, setActiveMentions] = useState<Array<{ id: string | number; display?: string | null }>>([])
  const prevTypeRef = useRef<string | null>(null)
  const isComposingRef = useRef(false)
  const { fetchMentions } = useMention()

  const handleMentionsChange = useCallback((change: MentionsInputChangeEvent<MentionExtra>) => {
    if (isComposingRef.current) return
    setMentionMarkup(change.value)
    setActiveMentions(change.mentions)
  }, [])

  const handleSubmit = useCallback(() => {
    // react-mentions-ts 마크업에서 plain text 추출: @[이름](type:id) → @이름
    const plainText = mentionMarkup.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1').trim()
    if (!plainText) {
      toast.error(t("errorNoPrompt"))
      return
    }

    const mentionItems = occurrencesToMentionItems(activeMentions)

    // URL 파라미터 구성
    const params = new URLSearchParams({ q: plainText })
    if (mentionItems.length > 0) {
      params.set('mentions', JSON.stringify(mentionItems))
    }

    router.push('/chat?' + params.toString())
    setMentionMarkup("")
    setActiveMentions([])
  }, [mentionMarkup, activeMentions, router, t])

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true
  }, [])

  const handleCompositionEnd = useCallback(() => {
    isComposingRef.current = false
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && !isComposingRef.current) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  // renderSuggestion: 그룹 헤더 주입 (ref로 이전 타입 추적)
  const renderSuggestion = useCallback((
    entry: MentionDataItem<MentionExtra>,
    _search: string,
    highlightedDisplay: React.ReactNode,
    index: number,
    focused: boolean
  ) => {
    const currentType = entry.type
    const showHeader = index === 0 || prevTypeRef.current !== currentType
    if (showHeader) {
      prevTypeRef.current = currentType
    }

    return (
      <div>
        {showHeader && (
          <div className="px-3 pt-2 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-t first:border-t-0 border-border">
            {groupLabels[currentType ?? ''] ?? currentType}
          </div>
        )}
        <div className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer ${focused ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`}>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium truncate">{highlightedDisplay}</span>
            {entry.sublabel && (
              <span className="text-xs text-muted-foreground truncate">
                {entry.sublabel}
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }, [])

  // 버튼 disabled 판단: 마크업에서 plain text 추출
  const plainTextForDisabled = mentionMarkup.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1').trim()

  // 채팅 페이지에서는 자체 입력창이 있으므로 숨김
  if (pathname.includes("/chat")) return null

  return (
    <div className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <Sparkles className="h-4 w-4 text-purple-500 flex-shrink-0" />

          <MentionsInput
            value={mentionMarkup}
            onMentionsChange={handleMentionsChange}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            placeholder={t("placeholder")}
            a11ySuggestionsListLabel="멘션 검색 결과"
            suggestionsPlacement="below"
            className="flex-1 h-[38px] max-h-[38px] text-sm"
          >
            <Mention
              trigger="@"
              data={fetchMentions as (query: string) => Promise<ReadonlyArray<MentionDataItem<MentionExtra>>>}
              renderSuggestion={renderSuggestion}
              displayTransform={(_id: string | number, display?: string | null) => `@${display ?? ''}`}
              appendSpaceOnAdd
              markup="@[__display__](__id__)"
            />
          </MentionsInput>

          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!plainTextForDisabled}
            className="h-[38px] flex-shrink-0"
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">{t("send")}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
