"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { assignStudentToTeacher } from "@/lib/actions/matching/assignment"
import { toast } from "sonner"

interface Student {
  id: string
  name: string
  school: string
  grade: number
  teacherId?: string | null
}

interface Teacher {
  id: string
  name: string
  role: string
}

interface ManualAssignmentFormProps {
  students: Student[]
  teachers: Teacher[]
  studentId?: string
  trigger?: React.ReactNode
}

export function ManualAssignmentForm({
  students,
  teachers,
  studentId,
  trigger,
}: ManualAssignmentFormProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState<string>(studentId || "")
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  // 선생님 ID→이름 매핑 (배정된 학생의 현재 담당 표시용)
  const teacherMap = new Map(teachers.map((t) => [t.id, t.name]))

  const displayStudents = studentId
    ? students.filter((s) => s.id === studentId)
    : students

  const handleOpen = () => setIsOpen(true)
  const handleClose = () => {
    setIsOpen(false)
    setSelectedStudentId(studentId || "")
    setSelectedTeacherId("")
  }

  const handleAssign = async () => {
    if (!selectedStudentId || !selectedTeacherId) {
      toast.error("학생과 선생님을 모두 선택해주세요.")
      return
    }

    setIsLoading(true)
    try {
      const result = await assignStudentToTeacher(selectedStudentId, selectedTeacherId)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("학생이 성공적으로 배정되었습니다.")
      handleClose()
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "배정 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) {
    if (trigger) {
      return <div onClick={handleOpen}>{trigger}</div>
    }
    return <Button variant="outline" onClick={handleOpen}>수동 배정</Button>
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">학생 수동 배정</h3>
            <p className="text-sm text-gray-500">
              학생을 특정 선생님에게 직접 배정합니다.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {!studentId && (
            <div className="space-y-2">
              <Label htmlFor="student">학생 선택</Label>
              <Select
                value={selectedStudentId}
                onValueChange={setSelectedStudentId}
              >
                <SelectTrigger id="student">
                  <SelectValue placeholder="학생을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {displayStudents.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name} ({student.school} {student.grade}학년)
                      {student.teacherId && (
                        <span className="text-muted-foreground ml-1">
                          — {teacherMap.get(student.teacherId) ?? "배정됨"}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="teacher">선생님 선택</Label>
            <Select
              value={selectedTeacherId}
              onValueChange={setSelectedTeacherId}
            >
              <SelectTrigger id="teacher">
                <SelectValue placeholder="선생님을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacher.name}{" "}
                    {teacher.role !== "TEACHER" && `(${getRoleLabel(teacher.role)})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex gap-3 justify-end">
          <Button variant="outline" onClick={handleClose}>
            취소
          </Button>
          <Button
            onClick={handleAssign}
            disabled={isLoading || !selectedTeacherId || (!studentId && !selectedStudentId)}
          >
            {isLoading ? "배정 중..." : "배정"}
          </Button>
        </div>
      </div>
    </div>
  )
}

function getRoleLabel(role: string): string {
  switch (role) {
    case "TEAM_LEADER":
      return "팀장"
    case "MANAGER":
      return "매니저"
    default:
      return role
  }
}
