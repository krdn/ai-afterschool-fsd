"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { CounselingSessionForm } from "@/components/counseling/counseling-session-form"
import { useRouter } from "next/navigation"

interface Student {
  id: string
  name: string
  school: string
  grade: number
}

export interface EditSessionData {
  id: string
  studentId: string
  sessionDate: string
  duration: number
  type: string
  summary: string
  followUpRequired: boolean
  followUpDate: string | null
  satisfactionScore: number | null
  aiSummary: string | null
}

interface NewCounselingClientProps {
  students: Student[]
  teacherId: string
  editSession?: EditSessionData | null
}

export function NewCounselingClient({ students, teacherId, editSession }: NewCounselingClientProps) {
  const isEditMode = !!editSession
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    editSession?.studentId || ""
  )
  const router = useRouter()

  const handleSuccess = () => {
    router.push("/counseling")
  }

  const selectedStudent = students.find((s) => s.id === selectedStudentId)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">
            {isEditMode ? "상담 기록 수정" : "새 상담 기록"}
          </h1>
          <p className="text-gray-600">
            {isEditMode ? "기존 상담 기록을 수정합니다" : "선생님-학생 상담을 기록합니다"}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>학생 선택</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="student-select">학생</Label>
                <Select
                  value={selectedStudentId}
                  onValueChange={setSelectedStudentId}
                  disabled={isEditMode}
                >
                  <SelectTrigger id="student-select">
                    <SelectValue placeholder="학생을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name} ({student.school} {student.grade}학년)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isEditMode ? (
                  <p className="text-xs text-gray-500">
                    수정 모드에서는 학생을 변경할 수 없습니다
                  </p>
                ) : (
                  <p className="text-xs text-gray-500">
                    학생을 선택한 후 아래 폼을 작성해주세요
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div id="counseling-form-container">
          {selectedStudentId && selectedStudent ? (
            <CounselingSessionForm
              key={editSession?.id || selectedStudentId}
              studentId={selectedStudentId}
              studentName={selectedStudent.name}
              teacherId={teacherId}
              sessionId={editSession?.id}
              editData={editSession || undefined}
              onSuccess={handleSuccess}
            />
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed">
              <p className="text-gray-500">
                상단에서 학생을 선택하면 상담 기록 폼이 나타납니다
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
