import { verifySession } from "@/lib/dal"
import { getRBACPrisma } from "@/lib/db/common/rbac"
import { NewCounselingClient } from "@/components/counseling/NewCounselingClient"

export default async function NewCounselingPage() {
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
    },
    orderBy: {
      name: "asc",
    },
  })

  return <NewCounselingClient students={students} teacherId={session.userId} />
}
