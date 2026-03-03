"use client"

import { useState, useRef, useCallback, useEffect } from "react"

export type RecorderStatus = "idle" | "recording" | "paused"

type UseAudioRecorderReturn = {
  status: RecorderStatus
  /** 녹음 시간 (초) */
  duration: number
  /** 녹음 완료된 Blob */
  audioBlob: Blob | null
  /** 미리듣기용 URL */
  audioUrl: string | null
  /** 에러 메시지 */
  error: string | null
  start: () => Promise<void>
  stop: () => void
  pause: () => void
  resume: () => void
  /** 녹음 결과 초기화 (재녹음) */
  reset: () => void
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [status, setStatus] = useState<RecorderStatus>("idle")
  const [duration, setDuration] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioUrlRef = useRef<string | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      clearTimer()
      stopStream()
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    }
  }, [clearTimer, stopStream])

  const start = useCallback(async () => {
    setError(null)

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (!window.isSecureContext) {
        setError(
          "마이크 녹음은 HTTPS 환경에서만 사용할 수 있습니다. HTTPS로 접속하거나 localhost를 사용해주세요."
        )
      } else {
        setError("이 브라우저는 마이크 녹음을 지원하지 않습니다.")
      }
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm"

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setAudioBlob(blob)
        const url = URL.createObjectURL(blob)
        audioUrlRef.current = url
        setAudioUrl(url)
        stopStream()
      }

      recorder.start(1000)
      setStatus("recording")
      setDuration(0)

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1)
      }, 1000)
    } catch (err) {
      stopStream()
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setError("마이크 접근이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요.")
      } else {
        setError("마이크에 접근할 수 없습니다.")
      }
    }
  }, [stopStream])

  const stop = useCallback(() => {
    clearTimer()
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }
    setStatus("idle")
  }, [clearTimer])

  const pause = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause()
      clearTimer()
      setStatus("paused")
    }
  }, [clearTimer])

  const resume = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume()
      setStatus("recording")
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1)
      }, 1000)
    }
  }, [])

  const reset = useCallback(() => {
    clearTimer()
    stopStream()
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    audioUrlRef.current = null
    mediaRecorderRef.current = null
    chunksRef.current = []
    setStatus("idle")
    setDuration(0)
    setAudioBlob(null)
    setAudioUrl(null)
    setError(null)
  }, [clearTimer, stopStream])

  return {
    status,
    duration,
    audioBlob,
    audioUrl,
    error,
    start,
    stop,
    pause,
    resume,
    reset,
  }
}
