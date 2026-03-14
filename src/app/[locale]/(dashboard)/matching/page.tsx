import { verifySession } from "@/lib/dal"
import { db } from "@/lib/db/client"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Users, BarChart2, UserX } from "lucide-react"
import { MatchingPageTabs } from "./matching-tabs"
import { AssignmentHelpDialog } from "@/components/assignment/assignment-help-dialog"

export default async function MatchingPage() {
  await verifySession()

  const totalStudents = await db.student.count()

  const teachers = await db.teacher.findMany({
    where: {
      role: {
        in: ["TEACHER", "MANAGER", "TEAM_LEADER"],
      },
    },
    select: {
      id: true,
      name: true,
      role: true,
      email: true,
      students: {
        select: {
          id: true,
          name: true,
          school: true,
          grade: true,
        },
      },
    },
    orderBy: { name: "asc" },
  })

  const averageStudentsPerTeacher =
    teachers.length > 0 ? Math.round(totalStudents / teachers.length) : 0

  const allStudents = await db.student.findMany({
    select: {
      id: true,
      name: true,
      school: true,
      grade: true,
      teacherId: true,
    },
  })

  const unassignedStudents = allStudents.filter((s) => !s.teacherId)
  const assignedCount = totalStudents - unassignedStudents.length

  const teachersList = teachers.map((t) => ({
    id: t.id,
    name: t.name,
    role: t.role,
  }))

  // 활성 LLM 제공자 목록 조회
  const enabledProviders = await db.provider.findMany({
    where: { isEnabled: true },
    select: {
      id: true,
      name: true,
      providerType: true,
      models: {
        where: { isDefault: true },
        select: { modelId: true, displayName: true },
        take: 1,
      },
    },
    orderBy: { createdAt: "asc" },
  })

  const llmProviders = enabledProviders.map((p) => ({
    id: p.id,
    name: p.name,
    providerType: p.providerType,
    defaultModel: p.models[0]?.displayName ?? p.models[0]?.modelId ?? "모델 없음",
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">배정 관리</h1>
          <p className="text-muted-foreground">학생-선생님 배정 현황 및 관리</p>
        </div>
        <AssignmentHelpDialog />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 학생</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}명</div>
            <p className="text-xs text-muted-foreground">
              배정 완료 {assignedCount}명
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">미배정</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${unassignedStudents.length > 0 ? "text-orange-600" : "text-green-600"}`}>
              {unassignedStudents.length}명
            </div>
            <p className="text-xs text-muted-foreground">
              {unassignedStudents.length > 0 ? "배정이 필요합니다" : "모두 배정 완료"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균 담당 학생</CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageStudentsPerTeacher}명</div>
            <p className="text-xs text-muted-foreground">
              선생님 {teachers.length}명 기준
            </p>
          </CardContent>
        </Card>
      </div>

      <MatchingPageTabs
        teachers={teachers}
        allStudents={allStudents}
        teachersList={teachersList}
        unassignedStudents={unassignedStudents.map((s) => ({
          id: s.id,
          name: s.name,
          school: s.school,
          grade: s.grade,
        }))}
        llmProviders={llmProviders}
      />
    </div>
  )
}
