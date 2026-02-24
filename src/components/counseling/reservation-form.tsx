"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ReservationCalendar } from "./reservation-calendar"
import { TimeSlotGrid } from "./time-slot-grid"
import { createReservationAction } from "@/lib/actions/counseling/reservations"
import { getReservationsAction } from "@/lib/actions/counseling/reservations-query"
import { getStudentsAction, type StudentWithParents } from "@/lib/actions/student/crud"
import { toast } from "sonner"
import { ReservationStatus } from '@/lib/db'

interface ReservationFormProps {
  onCancel: () => void
  onSuccess: () => void
}

export function ReservationForm({ onCancel, onSuccess }: ReservationFormProps) {
  // 폼 상태
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined)
  const [selectedStudentId, setSelectedStudentId] = useState<string>("")
  const [selectedParentId, setSelectedParentId] = useState<string>("")
  const [topic, setTopic] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // 데이터 상태
  const [students, setStudents] = useState<StudentWithParents[]>([])
  const [reservedSlots, setReservedSlots] = useState<string[]>([])

  // 컴포넌트 마운트 시 학생 목록 조회
  useEffect(() => {
    const fetchStudents = async () => {
      const result = await getStudentsAction()
      if (result.success) {
        setStudents(result.data.data)
      } else {
        toast.error(result.error || "학생 목록을 불러오지 못했습니다.")
      }
    }
    fetchStudents()
  }, [])

  // 날짜 선택 시 해당 날의 예약된 슬롯 조회
  useEffect(() => {
    const fetchReservedSlots = async () => {
      if (selectedDate) {
        const dayStart = new Date(selectedDate)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(selectedDate)
        dayEnd.setHours(23, 59, 59, 999)

        const result = await getReservationsAction({
          dateFrom: dayStart.toISOString(),
          dateTo: dayEnd.toISOString(),
          status: undefined, // 전체 상태 조회
        })

        if (result.success && result.data) {
          // 예약된 시간 슬롯 추출 (HH:mm 형식)
          // CANCELLED와 NO_SHOW 상태는 제외
          const slots = result.data
            .filter((r) => r.status !== "CANCELLED" && r.status !== "NO_SHOW")
            .map((r) => {
              const date = new Date(r.scheduledAt)
              return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
            })
          setReservedSlots(slots)
        }
      } else {
        setReservedSlots([])
      }
    }
    fetchReservedSlots()
  }, [selectedDate])

  // 학생 선택 시 해당 학생의 학부모 목록 필터링
  const selectedStudent = students.find((s) => s.id === selectedStudentId)
  const parents = selectedStudent?.parents || []

  // 학생 변경 시 학부모 선택 초기화
  const handleStudentChange = useCallback((studentId: string) => {
    setSelectedStudentId(studentId)
    setSelectedParentId("")
  }, [])

  // 폼 제출
  const handleSubmit = async () => {
    // 폼 검증
    if (!selectedDate) {
      toast.error("날짜를 선택해주세요.")
      return
    }
    if (!selectedTime) {
      toast.error("시간을 선택해주세요.")
      return
    }
    if (!selectedStudentId) {
      toast.error("학생을 선택해주세요.")
      return
    }
    if (!selectedParentId) {
      toast.error("학부모를 선택해주세요.")
      return
    }
    if (!topic.trim()) {
      toast.error("상담 주제를 입력해주세요.")
      return
    }

    // scheduledAt DateTime 생성
    const [hours, minutes] = selectedTime.split(":").map(Number)
    const scheduledAt = new Date(selectedDate)
    scheduledAt.setHours(hours, minutes, 0, 0)

    setIsSubmitting(true)
    try {
      const result = await createReservationAction({
        scheduledAt: scheduledAt.toISOString(),
        studentId: selectedStudentId,
        parentId: selectedParentId,
        topic: topic.trim(),
      })

      if (result.success) {
        toast.success("예약이 등록되었습니다.")
        onSuccess()
      } else {
        toast.error(result.error || "예약 등록에 실패했습니다.")
      }
    } catch (error) {
      console.error("Reservation creation error:", error)
      toast.error("예약 등록 중 오류가 발생했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // 과거 날짜 비활성화
  const disabledDate = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>예약 등록</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 날짜 선택 */}
        <div className="space-y-3">
          <Label>날짜 *</Label>
          <ReservationCalendar
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={disabledDate}
          />
        </div>

        {/* 시간 선택 */}
        {selectedDate && (
          <div className="space-y-3">
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
          <Label htmlFor="student">학생 *</Label>
          <Select value={selectedStudentId} onValueChange={handleStudentChange}>
            <SelectTrigger id="student">
              <SelectValue placeholder="학생을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {students.map((student) => (
                <SelectItem key={student.id} value={student.id}>
                  {student.name}
                  {student.school && ` (${student.school}${student.grade ? ` ${student.grade}학년` : ""})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 학부모 선택 */}
        {selectedStudent && parents.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="parent">학부모 *</Label>
            <Select value={selectedParentId} onValueChange={setSelectedParentId}>
              <SelectTrigger id="parent">
                <SelectValue placeholder="학부모를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {parents.map((parent) => (
                  <SelectItem key={parent.id} value={parent.id}>
                    {parent.name} ({parent.relation})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedStudent && parents.length === 0 && (
          <p className="text-sm text-gray-500">
            해당 학생의 학부모 정보가 없습니다. 학생 상세 페이지에서 학부모를 등록해주세요.
          </p>
        )}

        {/* 상담 주제 입력 */}
        <div className="space-y-2">
          <Label htmlFor="topic">상담 주제 *</Label>
          <Input
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="상담 주제를 입력해주세요 (2-200자)"
            maxLength={200}
          />
          <p className="text-xs text-gray-500">{topic.length} / 200자</p>
        </div>

        {/* 버튼 그룹 */}
        <div className="flex gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1"
          >
            취소
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? "등록 중..." : "예약 등록"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default ReservationForm
