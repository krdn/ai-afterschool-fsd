"use client"

import { useEffect, useRef } from "react"
import { ChatMessageItem } from "./chat-message-item"
import type { MentionedEntity } from "@/lib/chat/mention-types"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  provider?: string | null
  model?: string | null
  mentionedEntities?: MentionedEntity[] | null
}

type ChatMessageListProps = {
  messages: Message[]
  streamingContent?: string
  isStreaming?: boolean
}

export function ChatMessageList({
  messages,
  streamingContent,
  isStreaming,
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingContent])

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-6">
      <div className="max-w-3xl mx-auto">
        {messages.map((msg) => (
          <ChatMessageItem
            key={msg.id}
            role={msg.role as "user" | "assistant"}
            content={msg.content}
            provider={msg.provider}
            model={msg.model}
            mentionedEntities={msg.mentionedEntities}
          />
        ))}

        {/* 스트리밍 중인 assistant 메시지 */}
        {isStreaming && streamingContent && (
          <ChatMessageItem
            role="assistant"
            content={streamingContent}
            isStreaming
          />
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
