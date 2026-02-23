import { notFound, redirect } from "next/navigation"
import { verifySession } from "@/lib/dal"
import { db } from "@/lib/db/client"
import { StudentForm } from "@/components/students/student-form"

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await verifySession()

  const student = await db.student.findUnique({
    where: { id },
    include: {
      images: true,
      parents: true,
    },
  })

  if (!student) {
    notFound()
  }

  // 권한 검증: 원장, 팀장(같은 팀), 담당 교사만 수정 가능
  const isDirector = session.role === 'DIRECTOR'
  const isOwner = student.teacherId === session.userId
  const isTeamLeader =
    session.role === 'TEAM_LEADER' &&
    session.teamId !== null &&
    session.teamId === student.teamId

  if (!isDirector && !isOwner && !isTeamLeader) {
    redirect(`/students/${id}`)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <StudentForm student={student} />
    </div>
  )
}
