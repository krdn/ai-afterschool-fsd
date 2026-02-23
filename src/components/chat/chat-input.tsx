"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Send, X, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MentionsInput, Mention } from 'react-mentions-ts'
import type { MentionDataItem, MentionsInputChangeEvent } from 'react-mentions-ts'
import { useMention, occurrencesToMentionItems, type MentionExtra } from '@/hooks/use-mention'
import type { MentionItem, MentionedEntity, MentionType } from '@/lib/chat/mention-types'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getEnabledProvidersForChat, type ChatProvider } from "@/lib/actions/chat/get-providers"

type ChatInputProps = {
  onSend: (prompt: string, mentions: MentionItem[], mentionedEntities?: MentionedEntity[], providerId?: string) => void
  onCancel: () => void
  isStreaming: boolean
  initialValue?: string
}

const groupLabels: Record<string, string> = {
  student: '학생',
  teacher: '선생님',
  team: '학급',
}

export function ChatInput({
  onSend,
  onCancel,
  isStreaming,
  initialValue = "",
}: ChatInputProps) {
  const t = useTranslations("LLMChat")
  const { fetchMentions } = useMention()
  // NOTE: 빈 결과 시 react-mentions-ts는 드롭다운을 표시하지 않음 (라이브러리 기본 동작)
  // "검색 결과 없음" 메시지 표시가 필요하면 fetchMentions에서 placeholder 아이템 반환 패턴 적용
  const [mentionMarkup, setMentionMarkup] = useState(initialValue)
  const [activeMentions, setActiveMentions] = useState<Array<{ id: string | number; display?: string | null }>>([])
  const [providers, setProviders] = useState<ChatProvider[]>([])
  const [selectedModel, setSelectedModel] = useState("auto")
  const [providersLoaded, setProvidersLoaded] = useState(false)

  // 그룹 헤더 렌더링을 위해 이전 타입을 추적
  const prevTypeRef = useRef<string | null>(null)
  const isComposingRef = useRef(false)
  const inputRef = useCallback((el: HTMLInputElement | HTMLTextAreaElement | null) => {
    if (el) el.focus()
  }, [])

  // Provider 목록 로드
  useEffect(() => {
    if (providersLoaded) return
    getEnabledProvidersForChat()
      .then((data) => {
        setProviders(data)
        setProvidersLoaded(true)
      })
      .catch(() => setProvidersLoaded(true))
  }, [providersLoaded])

  const parseProviderId = useCallback(
    (value: string): string | undefined => {
      if (value === "auto") return undefined
      const [providerId] = value.split("::")
      return providerId || undefined
    },
    []
  )

  const handleMentionsChange = useCallback((change: MentionsInputChangeEvent<MentionExtra>) => {
    if (isComposingRef.current) return
    setMentionMarkup(change.value)
    setActiveMentions(change.mentions)
  }, [])

  const handleSubmit = useCallback(() => {
    // react-mentions-ts 마크업에서 plain text 추출: @[이름](type:id) → @이름
    const plainText = mentionMarkup.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1').trim()
    if (!plainText || isStreaming) return

    const mentionItems = occurrencesToMentionItems(activeMentions)

    // MentionedEntity[] 구성 (낙관적 렌더링용)
    const mentionedEntities: MentionedEntity[] = activeMentions
      .filter((m, i, arr) => arr.findIndex(x => String(x.id) === String(m.id)) === i) // 중복 제거
      .map(m => {
        const raw = String(m.id)
        const colonIdx = raw.indexOf(':')
        return {
          id: raw.slice(colonIdx + 1),
          type: raw.slice(0, colonIdx) as MentionType,
          displayName: m.display ?? '',
        }
      })

    onSend(plainText, mentionItems, mentionedEntities.length > 0 ? mentionedEntities : undefined, parseProviderId(selectedModel))
    setMentionMarkup('')
    setActiveMentions([])
  }, [mentionMarkup, activeMentions, isStreaming, onSend, parseProviderId, selectedModel])

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true
  }, [])

  const handleCompositionEnd = useCallback(() => {
    isComposingRef.current = false
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && !isComposingRef.current) {
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

  return (
    <div className="border-t bg-white px-4 md:px-6 py-3">
      <div className="max-w-3xl mx-auto flex items-end gap-2">
        <Sparkles className="h-4 w-4 text-purple-500 mb-3 flex-shrink-0" />

        <MentionsInput
          value={mentionMarkup}
          onMentionsChange={handleMentionsChange}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          inputRef={inputRef}
          placeholder={t("placeholder")}
          a11ySuggestionsListLabel="멘션 검색 결과"
          suggestionsPlacement="auto"
          autoResize
          disabled={isStreaming}
          className="min-h-[44px] max-h-[160px] text-sm flex-1"
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

        {/* 모델 선택 */}
        <Select
          value={selectedModel}
          onValueChange={setSelectedModel}
          disabled={isStreaming}
        >
          <SelectTrigger className="w-[160px] h-[44px] text-xs flex-shrink-0 hidden md:flex">
            <SelectValue placeholder={t("selectModel")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">{t("autoModel")}</SelectItem>
            {providers.map((provider) => (
              <SelectGroup key={provider.id}>
                <SelectLabel className="text-xs text-gray-500">
                  {provider.name}
                </SelectLabel>
                {provider.models.map((model) => (
                  <SelectItem
                    key={`${provider.id}::${model.modelId}`}
                    value={`${provider.id}::${model.modelId}`}
                  >
                    {model.displayName}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>

        {isStreaming ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="h-[44px] flex-shrink-0"
          >
            <X className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">{t("cancel")}</span>
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!plainTextForDisabled}
            className="h-[44px] flex-shrink-0"
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">{t("send")}</span>
          </Button>
        )}
      </div>
    </div>
  )
}
