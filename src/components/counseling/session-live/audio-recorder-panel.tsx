"use client"

import { useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Mic, Pause, Square, Play, Upload, RotateCcw, CheckCircle, AlertCircle } from "lucide-react"
import { useAudioRecorder } from "@/hooks/use-audio-recorder"
import { useVoiceProcessing } from "@/hooks/use-voice-processing"

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")
  const s = (seconds % 60).toString().padStart(2, "0")
  return `${m}:${s}`
}

const STATUS_LABELS: Record<string, string> = {
  idle: "대기",
  uploading: "업로드 중...",
  stt: "음성 인식 중...",
  analyzing: "AI 분석 중...",
  completed: "완료",
  failed: "실패",
}

export type AudioRecorderStatus = {
  recorderStatus: "idle" | "recording" | "paused"
  hasRecordedBlob: boolean
  voiceStatus: "idle" | "uploading" | "stt" | "analyzing" | "completed" | "failed"
}

type AudioRecorderPanelProps = {
  sessionId: string
  onSummaryReady?: (summary: string, keywords: string[]) => void
  onStatusChange?: (status: AudioRecorderStatus) => void
}

export function AudioRecorderPanel({
  sessionId,
  onSummaryReady,
  onStatusChange,
}: AudioRecorderPanelProps) {
  const recorder = useAudioRecorder()
  const voice = useVoiceProcessing()
  const audioRef = useRef<HTMLAudioElement>(null)
  const summaryNotifiedRef = useRef(false)

  // 부모에게 현재 상태 동기화
  useEffect(() => {
    onStatusChange?.({
      recorderStatus: recorder.status,
      hasRecordedBlob: !!recorder.audioBlob,
      voiceStatus: voice.status,
    })
  }, [recorder.status, recorder.audioBlob, voice.status, onStatusChange])

  // 요약 준비되면 부모에게 알림 (1회만)
  useEffect(() => {
    if (voice.status === "completed" && voice.summary && !summaryNotifiedRef.current) {
      summaryNotifiedRef.current = true
      onSummaryReady?.(voice.summary, voice.keywords)
    }
  }, [voice.status, voice.summary, voice.keywords, onSummaryReady])

  const handleConfirmRecording = async () => {
    if (!recorder.audioBlob) return
    await voice.uploadAudio(recorder.audioBlob, sessionId)
  }

  const handleReset = () => {
    recorder.reset()
    voice.reset()
    summaryNotifiedRef.current = false
  }

  // STT 처리 중 또는 완료된 상태
  if (voice.status !== "idle") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Mic className="h-4 w-4" />
            음성 처리
          </h4>
          <span className="text-xs text-muted-foreground">
            {STATUS_LABELS[voice.status] || voice.status}
          </span>
        </div>

        <Progress value={voice.progress} className="h-2" />

        {voice.status === "completed" && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span>음성 인식 및 AI 분석이 완료되었습니다. 상담 완료 시 자동 반영됩니다.</span>
          </div>
        )}

        {voice.status === "failed" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{voice.error || "음성 처리에 실패했습니다."}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-3 w-3 mr-1" />
              다시 시도
            </Button>
          </div>
        )}
      </div>
    )
  }

  // 녹음 완료 후 미리듣기 상태
  if (recorder.audioBlob && recorder.audioUrl) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            녹음 완료
          </h4>
          <span className="text-xs text-muted-foreground">{formatTime(recorder.duration)}</span>
        </div>

        <audio ref={audioRef} src={recorder.audioUrl} controls className="w-full h-8" />

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} className="flex-1">
            <RotateCcw className="h-3 w-3 mr-1" />
            재녹음
          </Button>
          <Button size="sm" onClick={handleConfirmRecording} className="flex-1">
            <Upload className="h-3 w-3 mr-1" />
            음성 분석 시작
          </Button>
        </div>
      </div>
    )
  }

  // 녹음 대기/진행 중 상태
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Mic className="h-4 w-4" />
          상담 녹음
        </h4>
        {recorder.status !== "idle" && (
          <span className="text-sm font-mono text-muted-foreground">
            {formatTime(recorder.duration)}
          </span>
        )}
      </div>

      {recorder.error && <p className="text-xs text-destructive">{recorder.error}</p>}

      {recorder.status === "recording" && (
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
          <span className="text-xs text-muted-foreground">녹음 중...</span>
        </div>
      )}

      {recorder.status === "paused" && <p className="text-xs text-amber-600">일시정지됨</p>}

      <div className="flex gap-2">
        {recorder.status === "idle" && (
          <Button variant="outline" size="sm" onClick={recorder.start}>
            <Mic className="h-3 w-3 mr-1" />
            녹음 시작
          </Button>
        )}

        {recorder.status === "recording" && (
          <>
            <Button variant="outline" size="sm" onClick={recorder.pause}>
              <Pause className="h-3 w-3 mr-1" />
              일시정지
            </Button>
            <Button variant="secondary" size="sm" onClick={recorder.stop}>
              <Square className="h-3 w-3 mr-1" />
              정지
            </Button>
          </>
        )}

        {recorder.status === "paused" && (
          <>
            <Button variant="outline" size="sm" onClick={recorder.resume}>
              <Play className="h-3 w-3 mr-1" />
              계속
            </Button>
            <Button variant="secondary" size="sm" onClick={recorder.stop}>
              <Square className="h-3 w-3 mr-1" />
              정지
            </Button>
          </>
        )}
      </div>

      {recorder.status === "idle" && (
        <p className="text-xs text-muted-foreground">
          녹음 버튼을 눌러 상담 내용을 녹음하세요. 녹음 후 자동으로 텍스트 변환 및 AI 요약이
          진행됩니다.
        </p>
      )}
    </div>
  )
}
