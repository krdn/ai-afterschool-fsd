import { verifySession } from "@/lib/dal"
import { getRBACPrisma } from "@/lib/db/common/rbac"
import { NewCounselingClient } from "@/components/counseling/new-counseling-client"

type PageProps = {
  searchParams: Promise<{
    editId?: string
  }>
}

export default async function NewCounselingPage({ searchParams }: PageProps) {
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

  const params = await searchParams
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
    },
    orderBy: {
      name: "asc",
    },
  })

  // 수정 모드: editId가 있으면 기존 세션 데이터 로드
  let editSession = null
  if (params.editId) {
    const existing = await rbacDb.counselingSession.findUnique({
      where: { id: params.editId },
      select: {
        id: true,
        studentId: true,
        sessionDate: true,
        duration: true,
        type: true,
        summary: true,
        followUpRequired: true,
        followUpDate: true,
        satisfactionScore: true,
        aiSummary: true,
      },
    })
    if (existing) {
      editSession = {
        ...existing,
        sessionDate: existing.sessionDate.toISOString().split("T")[0],
        followUpDate: existing.followUpDate
          ? existing.followUpDate.toISOString().split("T")[0]
          : null,
      }
    }
  }

  return (
    <NewCounselingClient
      students={students}
      teacherId={session.userId}
      editSession={editSession}
    />
  )
}
