"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { X, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { assignStudentBatch } from "@/lib/actions/matching/assignment"
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

interface BatchAssignmentProps {
  students: Student[]
  teachers: Teacher[]
  trigger?: React.ReactNode
}

export function BatchAssignment({
  students,
  teachers,
  trigger,
}: BatchAssignmentProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  const availableStudents = students.filter((s) => !s.teacherId)

  const handleOpen = () => setIsOpen(true)
  const handleClose = () => {
    setIsOpen(false)
    setSelectedStudentIds([])
    setSelectedTeacherId("")
  }

  const toggleStudent = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    )
  }

  const selectAll = () => {
    setSelectedStudentIds(availableStudents.map((s) => s.id))
  }

  const deselectAll = () => {
    setSelectedStudentIds([])
  }

  const handleBatchAssign = async () => {
    if (selectedStudentIds.length === 0) {
      toast.error("배정할 학생을 선택해주세요.")
      return
    }

    if (!selectedTeacherId) {
      toast.error("선생님을 선택해주세요.")
      return
    }

    setIsLoading(true)
    try {
      const result = await assignStudentBatch(selectedStudentIds, selectedTeacherId)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(`${result.data.count}명의 학생이 성공적으로 배정되었습니다.`)
      handleClose()
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "일괄 배정 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) {
    if (trigger) {
      return <div onClick={handleOpen}>{trigger}</div>
    }
    return <Button variant="outline" onClick={handleOpen}>일괄 배정</Button>
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-semibold">학생 일괄 배정</h3>
            <p className="text-sm text-gray-500">
              여러 학생을 한 번에 선생님에게 배정합니다.
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
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Teacher Selection */}
          <div className="space-y-2">
            <Label htmlFor="teacher">배정할 선생님</Label>
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

          {/* Student Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>배정할 학생 선택 ({selectedStudentIds.length}명 선택됨)</Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  전체 선택
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAll}>
                  전체 해제
                </Button>
              </div>
            </div>

            {availableStudents.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                배정 가능한 학생이 없습니다. 모든 학생이 이미 선생님에게 배정되었습니다.
              </p>
            ) : (
              <div className="grid gap-2 max-h-64 overflow-y-auto">
                {availableStudents.map((student) => {
                  const isSelected = selectedStudentIds.includes(student.id)
                  return (
                    <Card
                      key={student.id}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"
                      }`}
                      onClick={() => toggleStudent(student.id)}
                    >
                      <CardContent className="p-3 flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded border flex items-center justify-center ${
                            isSelected
                              ? "bg-blue-500 border-blue-500"
                              : "border-gray-300"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{student.name}</div>
                          <div className="text-sm text-gray-500">
                            {student.school} {student.grade}학년
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex gap-3 justify-end shrink-0">
          <Button variant="outline" onClick={handleClose}>
            취소
          </Button>
          <Button
            onClick={handleBatchAssign}
            disabled={isLoading || selectedStudentIds.length === 0 || !selectedTeacherId}
          >
            {isLoading
              ? "배정 중..."
              : `${selectedStudentIds.length}명 일괄 배정`}
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
