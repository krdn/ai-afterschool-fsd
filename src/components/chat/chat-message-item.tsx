"use client"

import { useState, useCallback } from "react"
import { Copy, Check, User, Bot } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MarkdownRenderer } from "@/components/ui/markdown-renderer"
import { cn } from "@/lib/utils"
import type { MentionedEntity } from "@/lib/chat/mention-types"
import { parseMentionChips } from "@/lib/chat/parse-mention-chips"
import { MentionTag } from "./mention-tag"

function renderUserContent(content: string, entities?: MentionedEntity[] | null) {
  // mentionedEntities가 없으면 plain text
  if (!entities || entities.length === 0) {
    return content
  }

  const segments = parseMentionChips(content, entities)

  return segments.map((seg, i) => {
    if (seg.kind === "text") return <span key={i}>{seg.text}</span>
    return <MentionTag key={`${seg.entity.id}-${i}`} entity={seg.entity} />
  })
}

type ChatMessageItemProps = {
  role: "user" | "assistant"
  content: string
  provider?: string | null
  model?: string | null
  isStreaming?: boolean
  mentionedEntities?: MentionedEntity[] | null
}

export function ChatMessageItem({
  role,
  content,
  provider,
  model,
  isStreaming,
  mentionedEntities,
}: ChatMessageItemProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [content])

  const isUser = role === "user"

  return (
    <div className={cn("flex gap-3 py-4", isUser && "justify-end")}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
          <Bot className="h-4 w-4 text-purple-600" />
        </div>
      )}

      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-3",
          isUser
            ? "bg-blue-600 text-white"
            : "bg-gray-100 text-gray-900"
        )}
      >
        {isUser ? (
          <div className="text-sm whitespace-pre-wrap leading-relaxed">
            {renderUserContent(content, mentionedEntities)}
          </div>
        ) : (
          <>
            <MarkdownRenderer content={content} className="text-sm" />
            {isStreaming && (
              <span className="inline-block w-2 h-4 bg-purple-500 animate-pulse ml-0.5" />
            )}
          </>
        )}

        {/* assistant 메시지 하단 메타/액션 */}
        {!isUser && content && !isStreaming && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200/50">
            {provider && (
              <span className="text-xs text-gray-400">
                {provider} / {model}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-6 w-6 p-0 ml-auto"
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3 text-gray-400" />
              )}
            </Button>
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
          <User className="h-4 w-4 text-blue-600" />
        </div>
      )}
    </div>
  )
}
