"use client"

import { useState, useRef, useCallback } from "react"
import type { MentionItem } from '@/lib/chat/mention-types'

type SendMessageOptions = {
  prompt: string
  providerId?: string
  sessionId?: string
  messages?: Array<{ role: "user" | "assistant"; content: string }>
  mentions?: MentionItem[]
}

type UseChatStreamReturn = {
  sendMessage: (options: SendMessageOptions) => Promise<{
    sessionId: string
    provider: string
    model: string
    fullText: string
  } | null>
  isStreaming: boolean
  streamingContent: string
  cancel: () => void
}

export function useChatStream(): UseChatStreamReturn {
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const abortControllerRef = useRef<AbortController | null>(null)

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort()
    setIsStreaming(false)
  }, [])

  const sendMessage = useCallback(
    async (options: SendMessageOptions) => {
      const { prompt, providerId, sessionId, messages, mentions } = options

      setIsStreaming(true)
      setStreamingContent("")

      const controller = new AbortController()
      abortControllerRef.current = controller

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            providerId,
            sessionId,
            messages,
            mentions,
          }),
          signal: controller.signal,
        })

        if (!res.ok) {
          const errorData = await res.json().catch(() => null)
          throw new Error(errorData?.error || "응답 생성 중 오류가 발생했습니다")
        }

        const returnedSessionId = res.headers.get("X-Session-Id") || ""
        const provider = res.headers.get("X-Provider") || ""
        const model = res.headers.get("X-Model") || ""

        const reader = res.body?.getReader()
        if (!reader) throw new Error("No response body")

        const decoder = new TextDecoder()
        let accumulated = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          accumulated += decoder.decode(value, { stream: true })
          setStreamingContent(accumulated)
        }

        return {
          sessionId: returnedSessionId,
          provider,
          model,
          fullText: accumulated,
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return null
        }
        throw error
      } finally {
        setIsStreaming(false)
        abortControllerRef.current = null
      }
    },
    []
  )

  return { sendMessage, isStreaming, streamingContent, cancel }
}
