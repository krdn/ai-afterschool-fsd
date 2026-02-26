'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ReservationCalendar } from './reservation-calendar'
import { TimeSlotGrid } from './time-slot-grid'
import { updateReservationAction } from '@/lib/actions/counseling/reservations'
import { invalidateAiSummaryAction } from '@/lib/actions/counseling/reservation-ai'
import { getReservationsAction } from '@/lib/actions/counseling/reservations-query'
import { getStudentsAction, type StudentWithParents } from '@/lib/actions/student/crud'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { getParentRelationLabel } from './utils'
import type { ReservationDetail } from './reservation-detail-dialog'

interface ReservationEditFormProps {
  reservation: ReservationDetail
  onSave: () => void
  onCancel: () => void
}

export function ReservationEditForm({ reservation, onSave, onCancel }: ReservationEditFormProps) {
  // 원본 값 저장 (변경 감지용)
  const original = {
    studentId: reservation.student.id,
    topic: reservation.topic,
  }

  // 폼 상태
  const scheduledDate = new Date(reservation.scheduledAt)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(scheduledDate)
  const [selectedTime, setSelectedTime] = useState<string | undefined>(
    `${String(scheduledDate.getHours()).padStart(2, '0')}:${String(scheduledDate.getMinutes()).padStart(2, '0')}`
  )
  const [selectedStudentId, setSelectedStudentId] = useState(reservation.student.id)
  const [selectedParentId, setSelectedParentId] = useState(reservation.parent.id)
  const [topic, setTopic] = useState(reservation.topic)
  const [isSaving, setIsSaving] = useState(false)
  const [showAiWarning, setShowAiWarning] = useState(false)

  // 데이터 상태
  const [students, setStudents] = useState<StudentWithParents[]>([])
  const [reservedSlots, setReservedSlots] = useState<string[]>([])
  const [isLoadingStudents, setIsLoadingStudents] = useState(true)

  // 학생 목록 로드
  useEffect(() => {
    const load = async () => {
      setIsLoadingStudents(true)
      const result = await getStudentsAction()
      if (result.success) setStudents(result.data.data)
      setIsLoadingStudents(false)
    }
    load()
  }, [])

  // 날짜별 예약 슬롯 로드 (자기 자신 제외)
  useEffect(() => {
    const load = async () => {
      if (!selectedDate) { setReservedSlots([]); return }

      const dayStart = new Date(selectedDate)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(selectedDate)
      dayEnd.setHours(23, 59, 59, 999)

      const result = await getReservationsAction({
        dateFrom: dayStart.toISOString(),
        dateTo: dayEnd.toISOString(),
      })

      if (result.success && result.data) {
        const slots = result.data
          .filter((r) => r.status !== 'CANCELLED' && r.status !== 'NO_SHOW' && r.id !== reservation.id)
          .map((r) => {
            const d = new Date(r.scheduledAt)
            return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
          })
        setReservedSlots(slots)
      }
    }
    load()
  }, [selectedDate, reservation.id])

  // 학생 변경 시 학부모 초기화
  const selectedStudent = students.find((s) => s.id === selectedStudentId)
  const parents = selectedStudent?.parents || []

  const handleStudentChange = useCallback((studentId: string) => {
    setSelectedStudentId(studentId)
    setSelectedParentId('')
  }, [])

  // AI 무효화 필요 여부
  const hasAiReport = !!reservation.counselingSession?.aiSummary
  const hasStudentChanged = selectedStudentId !== original.studentId
  const hasTopicChanged = topic.trim() !== original.topic.trim()
  const needsAiInvalidation = hasAiReport && (hasStudentChanged || hasTopicChanged)

  // 저장 처리
  const handleSave = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error('날짜와 시간을 선택해주세요.')
      return
    }
    if (!selectedStudentId) { toast.error('학생을 선택해주세요.'); return }
    if (!selectedParentId) { toast.error('학부모를 선택해주세요.'); return }
    if (!topic.trim() || topic.trim().length < 2) {
      toast.error('상담 주제를 2자 이상 입력해주세요.')
      return
    }

    // AI 무효화 경고
    if (needsAiInvalidation) {
      setShowAiWarning(true)
      return
    }

    await doSave()
  }

  const doSave = async () => {
    setIsSaving(true)
    try {
      const [hours, minutes] = selectedTime!.split(':').map(Number)
      const scheduledAt = new Date(selectedDate!)
      scheduledAt.setHours(hours, minutes, 0, 0)

      const result = await updateReservationAction({
        reservationId: reservation.id,
        scheduledAt: scheduledAt.toISOString(),
        studentId: selectedStudentId,
        parentId: selectedParentId,
        topic: topic.trim(),
      })

      if (result.success) {
        // AI 무효화 처리
        if (needsAiInvalidation) {
          await invalidateAiSummaryAction(reservation.id)
        }
        toast.success('예약이 수정되었습니다.')
        onSave()
      } else {
        toast.error(result.error || '예약 수정에 실패했습니다.')
      }
    } catch {
      toast.error('오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
      setShowAiWarning(false)
    }
  }

  // 과거 날짜 비활성화
  const disabledDate = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  if (isLoadingStudents) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">데이터 로딩 중...</span>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-5">
        {/* 날짜 선택 */}
        <div className="space-y-2">
          <Label>날짜 *</Label>
          <ReservationCalendar
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={disabledDate}
          />
        </div>

        {/* 시간 선택 */}
        {selectedDate && (
          <div className="space-y-2">
            <Label>시간 *</Label>
            <TimeSlotGrid
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              onSelectTime={setSelectedTime}
              reservedSlots={reservedSlots}
            />
          </div>
        )}

        {/* 학생 선택 */}
        <div className="space-y-2">
          <Label>학생 *</Label>
          <Select value={selectedStudentId} onValueChange={handleStudentChange}>
            <SelectTrigger>
              <SelectValue placeholder="학생을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {students.map((student) => (
                <SelectItem key={student.id} value={student.id}>
                  {student.name}
                  {student.school && ` (${student.school}${student.grade ? ` ${student.grade}학년` : ''})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 학부모 선택 */}
        {selectedStudent && parents.length > 0 && (
          <div className="space-y-2">
            <Label>학부모 *</Label>
            <Select value={selectedParentId} onValueChange={setSelectedParentId}>
              <SelectTrigger>
                <SelectValue placeholder="학부모를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {parents.map((parent) => (
                  <SelectItem key={parent.id} value={parent.id}>
                    {parent.name} ({getParentRelationLabel(parent.relation)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* 상담 주제 */}
        <div className="space-y-2">
          <Label>상담 주제 *</Label>
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="상담 주제를 입력해주세요 (2-200자)"
            maxLength={200}
          />
          <p className="text-xs text-muted-foreground">{topic.length} / 200자</p>
        </div>

        {/* AI 무효화 알림 (인라인) */}
        {needsAiInvalidation && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            학생 또는 주제가 변경되어 저장 시 기존 AI 보고서가 삭제됩니다.
          </div>
        )}

        {/* 버튼 */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onCancel} disabled={isSaving} className="flex-1">
            취소
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="flex-1">
            {isSaving ? '저장 중...' : '저장하기'}
          </Button>
        </div>
      </div>

      {/* AI 무효화 경고 다이얼로그 */}
      <AlertDialog open={showAiWarning} onOpenChange={setShowAiWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>AI 보고서 삭제 확인</AlertDialogTitle>
            <AlertDialogDescription>
              학생 또는 주제가 변경되어 기존 AI 보고서(분석/시나리오/학부모 요약)가 삭제됩니다.
              계속하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={doSave}
              disabled={isSaving}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isSaving ? '저장 중...' : '확인 및 저장'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
