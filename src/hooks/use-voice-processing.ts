"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import {
  uploadCounselingAudioAction,
  getCounselingTranscriptAction,
  pollAudioStatusAction,
} from "@/lib/actions/counseling/voice"

type VoiceProcessingStatus = "idle" | "uploading" | "stt" | "analyzing" | "completed" | "failed"

type UseVoiceProcessingReturn = {
  uploadAudio: (blob: Blob, sessionId: string) => Promise<void>
  status: VoiceProcessingStatus
  progress: number
  transcript: string | null
  summary: string | null
  keywords: string[]
  error: string | null
  reset: () => void
}

const VOICE_WS_URL = process.env.NEXT_PUBLIC_VOICE_WS_URL || "ws://192.168.0.5:8200"

export function useVoiceProcessing(): UseVoiceProcessingReturn {
  const [status, setStatus] = useState<VoiceProcessingStatus>("idle")
  const [progress, setProgress] = useState(0)
  const [transcript, setTranscript] = useState<string | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [keywords, setKeywords] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const reconnectCountRef = useRef(0)
  const statusRef = useRef<VoiceProcessingStatus>("idle")

  // status 변경 시 ref도 동기화
  const setStatusSafe = useCallback((s: VoiceProcessingStatus) => {
    statusRef.current = s
    setStatus(s)
  }, [])

  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    reconnectCountRef.current = 0
  }, [])

  useEffect(() => {
    return cleanup
  }, [cleanup])

  const fetchResults = useCallback(async (sessionId: string) => {
    const result = await getCounselingTranscriptAction(sessionId)
    if (result.success) {
      setTranscript(result.data.transcript.full_text)
      if (result.data.analysis) {
        setSummary(result.data.analysis.summary)
        setKeywords(result.data.analysis.keywords)
      }
      setStatusSafe("completed")
      setProgress(100)
    }
  }, [setStatusSafe])

  const startPolling = useCallback(
    (sessionId: string) => {
      if (pollIntervalRef.current) return
      pollIntervalRef.current = setInterval(async () => {
        const result = await pollAudioStatusAction(sessionId)
        if (result.success) {
          const noteStatus = result.data.status
          if (noteStatus === "completed") {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current)
              pollIntervalRef.current = null
            }
            await fetchResults(sessionId)
          } else if (noteStatus === "failed") {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current)
              pollIntervalRef.current = null
            }
            setStatusSafe("failed")
            setError("음성 처리에 실패했습니다.")
          }
        } else {
          // 폴링 실패 시 인터벌 정리 + 에러 표시
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
          setStatusSafe("failed")
          setError(result.error ?? "상태 확인 중 오류가 발생했습니다.")
        }
      }, 10000)
    },
    [fetchResults, setStatusSafe]
  )

  const connectWebSocket = useCallback(
    (noteId: string, sessionId: string) => {
      const ws = new WebSocket(`${VOICE_WS_URL}/ws/notes/${noteId}/status`)
      wsRef.current = ws

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data) as {
            note_id: string
            status: string
            progress: number
          }
          setProgress(data.progress)

          if (data.status === "stt" || data.status === "stt_done") {
            setStatusSafe("stt")
          } else if (data.status === "analyzing" || data.status === "analyzing_done") {
            setStatusSafe("analyzing")
          } else if (data.status === "completed") {
            cleanup()
            await fetchResults(sessionId)
          } else if (data.status === "failed") {
            cleanup()
            setStatusSafe("failed")
            setError("음성 처리에 실패했습니다.")
          }
        } catch {
          // 파싱 실패 무시
        }
      }

      ws.onclose = () => {
        // statusRef로 최신 상태를 읽어 stale closure 방지
        const currentStatus = statusRef.current
        if (
          currentStatus !== "completed" &&
          currentStatus !== "failed" &&
          currentStatus !== "idle"
        ) {
          if (reconnectCountRef.current < 3) {
            reconnectCountRef.current++
            reconnectTimerRef.current = setTimeout(
              () => connectWebSocket(noteId, sessionId),
              2000
            )
          } else {
            startPolling(sessionId)
          }
        }
      }

      ws.onerror = () => {
        // onclose에서 처리
      }
    },
    [cleanup, fetchResults, startPolling, setStatusSafe]
  )

  const uploadAudio = useCallback(
    async (blob: Blob, sessionId: string) => {
      setError(null)
      setStatusSafe("uploading")
      setProgress(5)
      sessionIdRef.current = sessionId

      try {
        const file = new File([blob], `counseling_${sessionId}.webm`, { type: blob.type })
        const formData = new FormData()
        formData.append("sessionId", sessionId)
        formData.append("file", file)

        const result = await uploadCounselingAudioAction(formData)
        if (!result.success) {
          setStatusSafe("failed")
          setError(result.error ?? "업로드에 실패했습니다.")
          return
        }

        setStatusSafe("stt")
        setProgress(10)

        connectWebSocket(result.data.noteId, sessionId)
      } catch (err) {
        setStatusSafe("failed")
        setError(err instanceof Error ? err.message : "업로드 중 오류가 발생했습니다.")
      }
    },
    [connectWebSocket, setStatusSafe]
  )

  const reset = useCallback(() => {
    cleanup()
    setStatusSafe("idle")
    setProgress(0)
    setTranscript(null)
    setSummary(null)
    setKeywords([])
    setError(null)
    sessionIdRef.current = null
  }, [cleanup, setStatusSafe])

  return {
    uploadAudio,
    status,
    progress,
    transcript,
    summary,
    keywords,
    error,
    reset,
  }
}
