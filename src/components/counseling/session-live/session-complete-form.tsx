"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Mic, Sparkles } from "lucide-react"
import { completeSessionAction } from "@/lib/actions/counseling/session-live"
import { generateCounselingReportAction } from "@/lib/actions/counseling/report-generation"
import { toast } from "sonner"
import { getTypeLabel } from "../utils"

const COUNSELING_TYPES = ["ACADEMIC", "CAREER", "PSYCHOLOGICAL", "BEHAVIORAL"] as const

type NoteData = {
  content: string
  memo: string | null
  checked: boolean
}

type SessionCompleteFormProps = {
  sessionId: string
  reservationId: string
  aiSummary: string | null
  notes: NoteData[]
  elapsedMinutes: number
  onCancel: () => void
  onGenerateReport?: (
    data: {
      type: string
      duration: number
      summary: string
      followUpRequired: boolean
      followUpDate?: string
      satisfactionScore?: number
    },
    report: string
  ) => void
  topic?: string
  studentName?: string
  voiceSummary?: string | null
  voiceKeywords?: string[]
}

/**
 * 체크리스트 항목과 메모를 조합하여 상담 요약 초기값을 생성한다.
 *
 * - 체크된 항목은 ✓, 미체크는 ✗ 접두어
 * - 메모가 있으면 → 화살표로 연결
 * - 체크된 항목을 먼저, 미체크를 나중에 배치
 */
function buildSummaryFromNotes(notes: NoteData[]): string {
  if (notes.length === 0) return ""

  const checked = notes.filter((n) => n.checked)
  const unchecked = notes.filter((n) => !n.checked)

  const formatLine = (n: NoteData) => {
    const prefix = n.checked ? "✓" : "✗"
    const memo = n.memo?.trim() ? ` → ${n.memo.trim()}` : ""
    return `${prefix} ${n.content}${memo}`
  }

  return [...checked.map(formatLine), ...unchecked.map(formatLine)].join("\n")
}

export function SessionCompleteForm({
  sessionId,
  reservationId,
  aiSummary,
  notes,
  elapsedMinutes,
  onCancel,
  onGenerateReport,
  topic: _topic,
  studentName: _studentName,
  voiceSummary,
  voiceKeywords: _voiceKeywords,
}: SessionCompleteFormProps) {
  const router = useRouter()
  const [type, setType] = useState<string>("ACADEMIC")
  const [duration, setDuration] = useState(Math.max(elapsedMinutes, 5))
  const [summary, setSummary] = useState(() => {
    if (voiceSummary) return voiceSummary
    return buildSummaryFromNotes(notes)
  })
  const [isUserEdited, setIsUserEdited] = useState(false)
  const [followUpRequired, setFollowUpRequired] = useState(false)
  const [followUpDate, setFollowUpDate] = useState("")
  const [satisfactionScore, setSatisfactionScore] = useState<string>("")
  const [hoveredScore, setHoveredScore] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)

  // voiceSummary가 비동기로 도착하면 (사용자가 아직 수정하지 않은 경우) 반영
  useEffect(() => {
    if (voiceSummary && !isUserEdited) {
      setSummary(voiceSummary)
    }
  }, [voiceSummary, isUserEdited])

  const handleSubmit = async () => {
    if (!summary.trim() || summary.trim().length < 10) {
      toast.error("상담 내용을 10자 이상 입력해주세요.")
      return
    }
    if (followUpRequired && !followUpDate) {
      toast.error("후속 조치 날짜를 선택해주세요.")
      return
    }

    setIsSaving(true)
    try {
      const result = await completeSessionAction({
        sessionId,
        reservationId,
        type: type as (typeof COUNSELING_TYPES)[number],
        duration,
        summary: summary.trim(),
        aiSummary: aiSummary ?? undefined,
        followUpRequired,
        ...(followUpDate && { followUpDate }),
        ...(satisfactionScore && { satisfactionScore: Number(satisfactionScore) }),
      })

      if (result.success) {
        toast.success("상담이 완료되었습니다.")
        router.push("/counseling")
      } else {
        toast.error(result.error || "상담 완료 처리에 실패했습니다.")
      }
    } catch {
      toast.error("오류가 발생했습니다.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleGenerateReport = async () => {
    if (!summary.trim() || summary.trim().length < 10) {
      toast.error("상담 내용을 10자 이상 입력해주세요.")
      return
    }
    if (followUpRequired && !followUpDate) {
      toast.error("후속 조치 날짜를 선택해주세요.")
      return
    }

    setIsGeneratingReport(true)
    try {
      const result = await generateCounselingReportAction({
        sessionId,
        type: type as "ACADEMIC" | "CAREER" | "PSYCHOLOGICAL" | "BEHAVIORAL",
        duration,
        summary: summary.trim(),
      })

      if (result.success) {
        onGenerateReport?.(
          {
            type,
            duration,
            summary: summary.trim(),
            followUpRequired,
            ...(followUpDate && { followUpDate }),
            ...(satisfactionScore && { satisfactionScore: Number(satisfactionScore) }),
          },
          result.data
        )
      } else {
        toast.error(result.error || "AI 보고서 생성에 실패했습니다.")
      }
    } catch {
      toast.error("AI 보고서 생성 중 오류가 발생했습니다.")
    } finally {
      setIsGeneratingReport(false)
    }
  }

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minFollowUpDate = tomorrow.toISOString().split("T")[0]

  return (
    <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
      <h3 className="font-semibold text-lg">상담 완료</h3>

      <div className="grid grid-cols-2 gap-4">
        {/* 상담 유형 */}
        <div className="space-y-2">
          <Label>상담 유형 *</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COUNSELING_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {getTypeLabel(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 상담 시간 */}
        <div className="space-y-2">
          <Label>상담 시간 (분) *</Label>
          <Input
            type="number"
            min={5}
            max={180}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
        </div>
      </div>

      {/* 상담 내용 */}
      <div className="space-y-2">
        <Label>상담 내용 *</Label>
        {voiceSummary && (
          <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
            <Mic className="h-3 w-3" />
            AI 음성 요약이 적용되었습니다 (편집 가능)
          </div>
        )}
        <Textarea
          value={summary}
          onChange={(e) => {
            setSummary(e.target.value)
            setIsUserEdited(true)
          }}
          placeholder="상담 내용을 기록해주세요 (10-1000자)"
          rows={6}
          maxLength={1000}
        />
        <p className="text-xs text-muted-foreground">{summary.length} / 1000자</p>
      </div>

      {/* 후속 조치 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="followUp-complete"
            checked={followUpRequired}
            onCheckedChange={(checked) => {
              setFollowUpRequired(checked === true)
              if (!checked) setFollowUpDate("")
            }}
          />
          <Label htmlFor="followUp-complete" className="cursor-pointer">
            후속 조치 필요
          </Label>
        </div>
        {followUpRequired && (
          <div className="space-y-2 pl-6">
            <Label>후속 조치 예정일 *</Label>
            <Input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              min={minFollowUpDate}
            />
          </div>
        )}
      </div>

      {/* 만족도 — 인터랙티브 별점 */}
      <div className="space-y-2">
        <Label>만족도</Label>
        <div className="flex items-center gap-1" onMouseLeave={() => setHoveredScore(0)}>
          {[1, 2, 3, 4, 5].map((score) => {
            const active = hoveredScore ? score <= hoveredScore : score <= Number(satisfactionScore)
            return (
              <button
                key={score}
                type="button"
                className={`text-2xl transition-transform hover:scale-110 ${active ? "text-amber-400 drop-shadow-sm" : "text-muted-foreground"}`}
                onMouseEnter={() => setHoveredScore(score)}
                onClick={() =>
                  setSatisfactionScore(satisfactionScore === String(score) ? "" : String(score))
                }
                aria-label={`만족도 ${score}점${satisfactionScore === String(score) ? " (선택 해제)" : ""}`}
              >
                ★
              </button>
            )
          })}
          {satisfactionScore && (
            <span className="ml-2 text-sm text-muted-foreground">{satisfactionScore}점</span>
          )}
        </div>
      </div>

      {/* 버튼 */}
      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isSaving || isGeneratingReport}
          className="flex-1"
        >
          취소
        </Button>
        {onGenerateReport ? (
          <Button
            onClick={handleGenerateReport}
            disabled={isGeneratingReport || isSaving}
            className="flex-1 text-white"
          >
            {isGeneratingReport ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                AI 보고서 생성 중...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-1" />
                AI 보고서 생성하기
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            {isSaving ? "처리 중..." : "상담 완료 및 저장"}
          </Button>
        )}
      </div>
    </div>
  )
}
