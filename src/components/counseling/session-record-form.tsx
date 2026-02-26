'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { completeWithRecordAction } from '@/lib/actions/counseling/reservation-complete'
import { toast } from 'sonner'
import { getTypeLabel } from './utils'
import type { ReservationDetail } from './reservation-detail-dialog'

interface SessionRecordFormProps {
  reservation: ReservationDetail
  onSave: () => void
  onCancel: () => void
}

const COUNSELING_TYPES = ['ACADEMIC', 'CAREER', 'PSYCHOLOGICAL', 'BEHAVIORAL'] as const

export function SessionRecordForm({ reservation, onSave, onCancel }: SessionRecordFormProps) {
  const [type, setType] = useState<string>('ACADEMIC')
  const [duration, setDuration] = useState(30)
  const [summary, setSummary] = useState('')
  const [followUpRequired, setFollowUpRequired] = useState(false)
  const [followUpDate, setFollowUpDate] = useState('')
  const [satisfactionScore, setSatisfactionScore] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)

  // 기존 AI 보고서 유지
  const existingAiSummary = reservation.counselingSession?.aiSummary || undefined

  const handleSubmit = async () => {
    if (!summary.trim() || summary.trim().length < 10) {
      toast.error('상담 내용을 10자 이상 입력해주세요.')
      return
    }
    if (followUpRequired && !followUpDate) {
      toast.error('후속 조치 날짜를 선택해주세요.')
      return
    }

    setIsSaving(true)
    try {
      const result = await completeWithRecordAction({
        reservationId: reservation.id,
        type: type as typeof COUNSELING_TYPES[number],
        duration,
        summary: summary.trim(),
        aiSummary: existingAiSummary,
        followUpRequired,
        ...(followUpDate && { followUpDate }),
        ...(satisfactionScore && { satisfactionScore: Number(satisfactionScore) }),
      })

      if (result.success) {
        toast.success('상담이 완료되었습니다.')
        onSave()
      } else {
        toast.error(result.error || '상담 완료 처리에 실패했습니다.')
      }
    } catch {
      toast.error('오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  // 내일 날짜 (후속 조치 최소값)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minFollowUpDate = tomorrow.toISOString().split('T')[0]

  return (
    <div className="space-y-5">
      {/* 예약 정보 요약 */}
      <div className="rounded-lg border bg-muted/50 p-3 text-sm space-y-1">
        <p><span className="font-medium">학생:</span> {reservation.student.name}</p>
        <p><span className="font-medium">주제:</span> {reservation.topic}</p>
      </div>

      {/* 상담 유형 */}
      <div className="space-y-2">
        <Label>상담 유형 *</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COUNSELING_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{getTypeLabel(t)}</SelectItem>
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

      {/* 상담 내용 */}
      <div className="space-y-2">
        <Label>상담 내용 *</Label>
        <Textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
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
            id="followUp"
            checked={followUpRequired}
            onCheckedChange={(checked) => {
              setFollowUpRequired(checked === true)
              if (!checked) setFollowUpDate('')
            }}
          />
          <Label htmlFor="followUp" className="cursor-pointer">후속 조치 필요</Label>
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

      {/* 만족도 */}
      <div className="space-y-2">
        <Label>만족도</Label>
        <Select value={satisfactionScore} onValueChange={setSatisfactionScore}>
          <SelectTrigger>
            <SelectValue placeholder="선택 (선택사항)" />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5].map((score) => (
              <SelectItem key={score} value={String(score)}>
                {'★'.repeat(score)}{'☆'.repeat(5 - score)} ({score}점)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 버튼 */}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={isSaving} className="flex-1">
          취소
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSaving}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
        >
          {isSaving ? '처리 중...' : '상담 완료 및 저장'}
        </Button>
      </div>
    </div>
  )
}
