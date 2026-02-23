'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

type EventSourceStatus = 'connecting' | 'connected' | 'disconnected'

interface UseEventSourceOptions {
  /** SSE 엔드포인트 URL */
  url: string
  /** 이벤트 수신 콜백 */
  onMessage: (data: unknown) => void
  /** 최대 재연결 시도 횟수 (기본값: 10) */
  maxRetries?: number
}

/**
 * EventSource API 래퍼 훅
 * - exponential backoff 재연결
 * - 자동 정리 (unmount 시)
 */
export function useEventSource({ url, onMessage, maxRetries = 10 }: UseEventSourceOptions) {
  const [status, setStatus] = useState<EventSourceStatus>('disconnected')
  const eventSourceRef = useRef<EventSource | null>(null)
  const retryCountRef = useRef(0)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onMessageRef = useRef(onMessage)

  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  const disconnect = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    retryCountRef.current = 0
    setStatus('disconnected')
  }, [])

  useEffect(() => {
    let cancelled = false

    function createConnection() {
      if (cancelled) return

      // 기존 연결 정리
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }

      setStatus('connecting')
      const es = new EventSource(url)
      eventSourceRef.current = es

      es.onopen = () => {
        if (cancelled) return
        retryCountRef.current = 0
        setStatus('connected')
      }

      es.onmessage = (event) => {
        if (cancelled) return
        try {
          const data = JSON.parse(event.data)
          onMessageRef.current(data)
        } catch {
          // JSON 파싱 실패 시 무시
        }
      }

      es.onerror = () => {
        if (cancelled) return
        es.close()
        setStatus('disconnected')

        // exponential backoff 재연결
        if (retryCountRef.current < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000)
          retryCountRef.current += 1

          retryTimerRef.current = setTimeout(() => {
            createConnection()
          }, delay)
        }
      }
    }

    createConnection()

    return () => {
      cancelled = true
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current)
        retryTimerRef.current = null
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      retryCountRef.current = 0
    }
  }, [url, maxRetries])

  const reconnect = useCallback(() => {
    disconnect()
    // 다음 틱에서 재연결 (disconnect 후 상태 정리를 위해)
    setTimeout(() => {
      const es = new EventSource(url)
      eventSourceRef.current = es
      setStatus('connecting')

      es.onopen = () => {
        retryCountRef.current = 0
        setStatus('connected')
      }

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          onMessageRef.current(data)
        } catch {
          // JSON 파싱 실패 시 무시
        }
      }

      es.onerror = () => {
        es.close()
        setStatus('disconnected')
      }
    }, 0)
  }, [url, disconnect])

  return { status, disconnect, reconnect }
}
