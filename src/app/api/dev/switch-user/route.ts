import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { createSession } from "@/lib/session"

function guardDev() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 })
  }
  return null
}

/**
 * GET: 전체 사용자 목록 조회 (개발 환경 전용)
 */
export async function GET() {
  const blocked = guardDev()
  if (blocked) return blocked

  const teachers = await db.teacher.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      teamId: true,
      team: { select: { name: true } },
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  })

  return NextResponse.json({ teachers })
}

/**
 * POST: 선택한 사용자로 세션 전환 (개발 환경 전용)
 */
export async function POST(request: Request) {
  const blocked = guardDev()
  if (blocked) return blocked

  const { userId } = await request.json()

  const teacher = await db.teacher.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true, teamId: true },
  })

  if (!teacher) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  await createSession(teacher.id, teacher.role, teacher.teamId)

  return NextResponse.json({
    success: true,
    user: { id: teacher.id, name: teacher.name, role: teacher.role },
  })
}
