import { verifySession } from "@/lib/dal"
import { db } from "@/lib/db/client"
import { redirect } from "next/navigation"
import { TeacherForm } from "@/components/teachers/teacher-form"

export default async function NewTeacherPage() {
  const session = await verifySession()

  // 권한 검증: 원장만 선생님 등록 가능
  if (session.role !== "DIRECTOR") {
    redirect("/teachers")
  }

  // 팀 목록 조회
  const teams = await db.team.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  })

  return (
    <div className="max-w-2xl mx-auto">
      <TeacherForm teams={teams} currentRole={session.role} />
    </div>
  )
}
