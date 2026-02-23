import { verifySession } from "@/lib/dal"
import { getRBACPrisma } from "@/lib/db/common/rbac"
import { StudentSatisfactionForm } from "@/components/satisfaction/StudentSatisfactionForm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

export default async function NewSatisfactionPage() {
  const session = await verifySession()
  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500">로그인이 필요합니다</p>
        </div>
      </div>
    )
  }

  const rbacDb = getRBACPrisma(session)

  const canViewAll = session.role === "DIRECTOR"
  const canViewTeam =
    session.role === "TEAM_LEADER" || session.role === "MANAGER"

  const students = await rbacDb.student.findMany({
    where: canViewAll
      ? undefined
      : canViewTeam && session.teamId
      ? { teamId: session.teamId }
      : session.role === "TEACHER"
      ? { teacherId: session.userId }
      : undefined,
    select: {
      id: true,
      name: true,
      school: true,
      grade: true,
      teacherId: true,
    },
    orderBy: {
      name: "asc",
    },
  })

  const teachers = await rbacDb.teacher.findMany({
    where: canViewAll
      ? undefined
      : canViewTeam && session.teamId
      ? { teamId: session.teamId }
      : session.role === "TEACHER"
      ? { id: session.userId }
      : undefined,
    select: {
      id: true,
      name: true,
      role: true,
    },
    orderBy: {
      name: "asc",
    },
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">학생 만족도 조사</h1>
          <p className="text-gray-600">학생 만족도 조사를 기록합니다</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>조사 대상 선택</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="student-select">학생</Label>
              <Select name="studentId" required>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="teacher-select">선생님</Label>
              <Select name="teacherId" required>
                <SelectTrigger id="teacher-select">
                  <SelectValue placeholder="선생님을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <p className="text-xs text-gray-500">
              학생과 선생님을 선택하면 만족도 조사 폼이 나타납니다
            </p>
          </CardContent>
        </Card>

        <div id="satisfaction-form-container">
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed">
            <p className="text-gray-500">
              상단에서 학생과 선생님을 선택하면 만족도 조사 폼이 나타납니다
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
