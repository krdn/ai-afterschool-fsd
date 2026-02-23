"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useChatStream } from "@/hooks/use-chat-stream"
import { ChatSidebar } from "./chat-sidebar"
import { ChatMessageList } from "./chat-message-list"
import { ChatInput } from "./chat-input"
import { ChatEmptyState } from "./chat-empty-state"
import { getChatSessions } from "@/lib/actions/chat/sessions"
import type { MentionItem, MentionedEntity } from "@/lib/chat/mention-types"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  provider?: string | null
  model?: string | null
  mentionedEntities?: MentionedEntity[] | null
}

type SessionSummary = {
  id: string
  title: string | null
  updatedAt: Date
  messageCount: number
}

type ChatPageProps = {
  initialSessions: SessionSummary[]
  sessionId?: string
  initialMessages?: Message[]
  initialQuery?: string
  initialMentions?: MentionItem[]
}

export function ChatPage({
  initialSessions,
  sessionId: initialSessionId,
  initialMessages = [],
  initialQuery,
  initialMentions,
}: ChatPageProps) {
  const router = useRouter()
  const { sendMessage, isStreaming, streamingContent, cancel } = useChatStream()

  const [sessions, setSessions] = useState<SessionSummary[]>(initialSessions)
  const [sessionId, setSessionId] = useState<string | undefined>(initialSessionId)
  const [messages, setMessages] = useState<Message[]>(initialMessages)

  // 세션 목록 새로고침
  const refreshSessions = useCallback(async () => {
    try {
      const updated = await getChatSessions()
      setSessions(updated)
    } catch {
      // 무시
    }
  }, [])

  // 초기 query 파라미터 처리 (initialMentions 포함)
  useEffect(() => {
    if (initialQuery && !initialSessionId) {
      handleSend(initialQuery, initialMentions ?? [], undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSend = useCallback(
    async (prompt: string, mentions: MentionItem[] = [], mentionedEntities?: MentionedEntity[], providerId?: string) => {
      // 낙관적으로 user 메시지 추가
      const tempUserMsg: Message = {
        id: `temp-${Date.now()}`,
        role: "user",
        content: prompt,
        mentionedEntities: mentionedEntities ?? null,
      }
      setMessages((prev) => [...prev, tempUserMsg])

      try {
        // 멀티턴: 기존 메시지를 context로 전달
        const contextMessages = messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }))

        const result = await sendMessage({
          prompt,
          providerId,
          sessionId,
          messages: contextMessages.length > 0 ? contextMessages : undefined,
          mentions: mentions.length > 0 ? mentions : undefined,
        })

        if (result) {
          // assistant 메시지 추가
          const assistantMsg: Message = {
            id: `msg-${Date.now()}`,
            role: "assistant",
            content: result.fullText,
            provider: result.provider,
            model: result.model,
          }
          setMessages((prev) => [...prev, assistantMsg])

          // 새 세션이면 URL 업데이트
          if (!sessionId && result.sessionId) {
            setSessionId(result.sessionId)
            router.replace(`/chat/${result.sessionId}`, { scroll: false })
          }

          // 세션 목록 갱신
          await refreshSessions()
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "오류가 발생했습니다"
        toast.error(message)
        // 실패한 user 메시지 제거
        setMessages((prev) =>
          prev.filter((m) => m.id !== tempUserMsg.id)
        )
      }
    },
    [messages, sendMessage, sessionId, router, refreshSessions]
  )

  const handleSuggestionClick = useCallback(
    (text: string) => {
      handleSend(text, [], undefined)
    },
    [handleSend]
  )

  const hasMessages = messages.length > 0 || isStreaming

  return (
    <div className="flex h-[calc(100vh-64px)]">
      <ChatSidebar
        sessions={sessions}
        currentSessionId={sessionId}
        onSessionsChange={refreshSessions}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {hasMessages ? (
          <>
            <ChatMessageList
              messages={messages}
              streamingContent={streamingContent}
              isStreaming={isStreaming}
            />
            <ChatInput
              onSend={handleSend}
              onCancel={cancel}
              isStreaming={isStreaming}
            />
          </>
        ) : (
          <>
            <ChatEmptyState onSuggestionClick={handleSuggestionClick} />
            <ChatInput
              onSend={handleSend}
              onCancel={cancel}
              isStreaming={isStreaming}
              initialValue={initialQuery}
            />
          </>
        )}
      </div>
    </div>
  )
}
