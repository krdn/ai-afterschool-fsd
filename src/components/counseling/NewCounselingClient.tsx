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
import { CounselingSessionForm } from "@/components/counseling/CounselingSessionForm"
import { useRouter } from "next/navigation"

interface Student {
  id: string
  name: string
  school: string
  grade: number
}

interface NewCounselingClientProps {
  students: Student[]
  teacherId: string
}

export function NewCounselingClient({ students, teacherId }: NewCounselingClientProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>("")
  const router = useRouter()

  const handleSuccess = () => {
    router.push("/counseling")
  }

  const selectedStudent = students.find((s) => s.id === selectedStudentId)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">새 상담 기록</h1>
          <p className="text-gray-600">선생님-학생 상담을 기록합니다</p>
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
                <p className="text-xs text-gray-500">
                  학생을 선택한 후 아래 폼을 작성해주세요
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div id="counseling-form-container">
          {selectedStudentId && selectedStudent ? (
            <CounselingSessionForm
              studentId={selectedStudentId}
              studentName={selectedStudent.name}
              teacherId={teacherId}
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
