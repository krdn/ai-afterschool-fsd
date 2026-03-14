import { notFound, redirect } from "next/navigation"
import { verifySession } from "@/lib/dal"
import { db } from "@/lib/db/client"
import { TeacherForm } from "@/components/teachers/teacher-form"
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function EditTeacherPage({ params }: PageProps) {
  const session = await verifySession()
  const { id } = await params

  const teacher = await db.teacher.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      teamId: true,
      phone: true,
      birthDate: true,
      nameHanja: true,
      birthTimeHour: true,
      birthTimeMinute: true,
      profileImage: true,
      profileImagePublicId: true,
    },
  })

  if (!teacher) {
    notFound()
  }

  // 권한 검증: 원장, 팀장(같은 팀), 본인만 수정 가능
  const isDirector = session.role === 'DIRECTOR'
  const isSelf = session.userId === id
  const isTeamLeaderOfSameTeam =
    session.role === 'TEAM_LEADER' &&
    session.teamId !== null &&
    session.teamId === teacher.teamId

  if (!isDirector && !isSelf && !isTeamLeaderOfSameTeam) {
    redirect(`/teachers/${id}`)
  }

  // 팀 목록 조회 (DIRECTOR용)
  const teams = isDirector
    ? await db.team.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : []

  return (
    <div className="max-w-2xl mx-auto">
      <BreadcrumbNav items={[
        { label: "선생님 목록", href: "/teachers" },
        { label: teacher.name, href: `/teachers/${id}` },
        { label: "수정" },
      ]} />
      <TeacherForm
        teacher={teacher}
        teams={teams}
        currentRole={session.role}
      />
    </div>
  )
}
