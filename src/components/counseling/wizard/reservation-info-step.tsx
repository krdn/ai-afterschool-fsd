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
import { ReservationCalendar } from '../reservation-calendar'
import { TimeSlotGrid } from '../time-slot-grid'
import {
  getStudentsAction,
  type StudentWithParents,
} from '@/lib/actions/student/crud'
import { getReservationsAction } from '@/lib/actions/counseling/reservations-query'
import { toast } from 'sonner'
import { ChevronRight } from 'lucide-react'
import { Link } from '@/i18n/navigation'

interface ReservationInfoStepProps {
  data: {
    selectedDate?: Date
    selectedTime?: string
    selectedStudentId: string
    selectedParentId: string
    topic: string
  }
  onChange: (data: Partial<ReservationInfoStepProps['data']>) => void
  onNext: () => void
}

export function ReservationInfoStep({
  data,
  onChange,
  onNext,
}: ReservationInfoStepProps) {
  const [students, setStudents] = useState<StudentWithParents[]>([])
  const [reservedSlots, setReservedSlots] = useState<string[]>([])

  // 학생 목록 로드
  useEffect(() => {
    const fetchStudents = async () => {
      const result = await getStudentsAction()
      if (result.success) {
        setStudents(result.data.data)
      } else {
        toast.error(result.error || '학생 목록을 불러오지 못했습니다.')
      }
    }
    fetchStudents()
  }, [])

  // 날짜 선택 시 예약된 슬롯 조회
  useEffect(() => {
    const fetchReservedSlots = async () => {
      if (data.selectedDate) {
        const dayStart = new Date(data.selectedDate)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(data.selectedDate)
        dayEnd.setHours(23, 59, 59, 999)

        const result = await getReservationsAction({
          dateFrom: dayStart.toISOString(),
          dateTo: dayEnd.toISOString(),
          status: undefined,
        })

        if (result.success && result.data) {
          // 예약된 시간 슬롯 추출 (HH:mm 형식)
          // CANCELLED와 NO_SHOW 상태는 제외
          const slots = result.data
            .filter((r) => r.status !== 'CANCELLED' && r.status !== 'NO_SHOW')
            .map((r) => {
              const date = new Date(r.scheduledAt)
              return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
            })
          setReservedSlots(slots)
        }
      } else {
        setReservedSlots([])
      }
    }
    fetchReservedSlots()
  }, [data.selectedDate])

  // 학생/학부모 연동
  const selectedStudent = students.find((s) => s.id === data.selectedStudentId)
  const parents = selectedStudent?.parents || []

  // 학생 변경 시 학부모 선택 초기화
  const handleStudentChange = useCallback(
    (studentId: string) => {
      onChange({ selectedStudentId: studentId, selectedParentId: '' })
    },
    [onChange]
  )

  // 과거 날짜 비활성화
  const disabledDate = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  // 다음 단계 가능 여부
  const canProceed =
    data.selectedDate &&
    data.selectedTime &&
    data.selectedStudentId &&
    data.selectedParentId &&
    data.topic.trim().length >= 2

  const handleNext = () => {
    if (!data.selectedDate) {
      toast.error('날짜를 선택해주세요.')
      return
    }
    if (!data.selectedTime) {
      toast.error('시간을 선택해주세요.')
      return
    }
    if (!data.selectedStudentId) {
      toast.error('학생을 선택해주세요.')
      return
    }
    if (!data.selectedParentId) {
      toast.error('학부모를 선택해주세요.')
      return
    }
    if (!data.topic.trim()) {
      toast.error('상담 주제를 입력해주세요.')
      return
    }
    onNext()
  }

  return (
    <div className="space-y-6">
      {/* 달력 + 시간슬롯 2컬럼 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Label>날짜 *</Label>
          <ReservationCalendar
            selected={data.selectedDate}
            onSelect={(date) =>
              onChange({ selectedDate: date, selectedTime: undefined })
            }
            disabled={disabledDate}
          />
        </div>

        {data.selectedDate && (
          <div className="space-y-3">
            <Label>시간 *</Label>
            <TimeSlotGrid
              selectedDate={data.selectedDate}
              selectedTime={data.selectedTime}
              onSelectTime={(time) => onChange({ selectedTime: time })}
              reservedSlots={reservedSlots}
            />
          </div>
        )}
      </div>

      {/* 학생 선택 */}
      <div className="space-y-2">
        <Label htmlFor="student">학생 *</Label>
        <Select
          value={data.selectedStudentId}
          onValueChange={handleStudentChange}
        >
          <SelectTrigger id="student">
            <SelectValue placeholder="학생을 선택하세요" />
          </SelectTrigger>
          <SelectContent>
            {students.map((student) => (
              <SelectItem key={student.id} value={student.id}>
                {student.name}
                {student.school &&
                  ` (${student.school}${student.grade ? ` ${student.grade}학년` : ''})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 학부모 선택 */}
      {selectedStudent && parents.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="parent">학부모 *</Label>
          <Select
            value={data.selectedParentId}
            onValueChange={(id) => onChange({ selectedParentId: id })}
          >
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
        <p className="text-sm text-muted-foreground">
          해당 학생의 학부모 정보가 없습니다.{' '}
          <Link
            href={`/students/${selectedStudent.id}`}
            className="text-blue-600 hover:underline"
          >
            학생 상세 페이지
          </Link>
          에서 학부모를 등록해주세요.
        </p>
      )}

      {/* 상담 주제 */}
      <div className="space-y-2">
        <Label htmlFor="topic">상담 주제 *</Label>
        <Input
          id="topic"
          value={data.topic}
          onChange={(e) => onChange({ topic: e.target.value })}
          placeholder="상담 주제를 입력해주세요 (2-200자)"
          maxLength={200}
        />
        <p className="text-xs text-muted-foreground">
          {data.topic.length} / 200자
        </p>
      </div>

      {/* 다음 버튼 */}
      <div className="flex justify-end">
        <Button onClick={handleNext} disabled={!canProceed}>
          다음
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}
