import Link from "next/link"
import { notFound } from "next/navigation"
import { verifySession } from "@/lib/dal"
import { getRBACPrisma } from "@/lib/db/common/rbac"
import type { TeacherRole } from "@/lib/db/common/rbac"

type LayoutProps = {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

async function checkTeamAccess(
  session: { userId: string; role?: TeacherRole; teamId?: string | null },
  teamId: string
): Promise<boolean> {
  if (session.role === 'DIRECTOR') {
    return true
  }

  if (session.role === 'TEAM_LEADER' || session.role === 'MANAGER' || session.role === 'TEACHER') {
    return session.teamId === teamId
  }

  return false
}

export default async function TeamLayout({ children, params }: LayoutProps) {
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

  const { id } = await params

  const rbacDb = getRBACPrisma(session)
  const team = await rbacDb.team.findUnique({
    where: { id },
    select: { id: true, name: true },
  })

  if (!team) {
    notFound()
  }

  const canAccess = await checkTeamAccess(session, id)
  if (!canAccess) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500">접근 권한이 없습니다</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { href: `/teams/${id}`, label: '팀 정보' },
    { href: `/teams/${id}/members`, label: '팀원 목록' },
    { href: `/teams/${id}/composition`, label: '구성 분석' },
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{team.name}</h1>
      </div>

      <div className="border-b mb-6">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="pb-4 text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300 data-[active=true]:border-blue-600 data-[active=true]:text-blue-600"
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>

      {children}
    </div>
  )
}
