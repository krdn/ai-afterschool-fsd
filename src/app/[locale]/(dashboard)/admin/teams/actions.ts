"use server"

import { revalidatePath } from "next/cache"
import { verifySession } from "@/lib/dal"
import { db } from "@/lib/db/client"
import { TeamSchema } from "@/lib/validations/teams"

// ---------------------------------------------------------------------------
// 결과 타입
// ---------------------------------------------------------------------------

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

// ---------------------------------------------------------------------------
// 권한 검증
// ---------------------------------------------------------------------------

async function requireDirector() {
  const session = await verifySession()
  if (!session || session.role !== "DIRECTOR") {
    throw new Error("권한이 없습니다")
  }
  return session
}

// ---------------------------------------------------------------------------
// 팀 생성
// ---------------------------------------------------------------------------

export async function createTeamAction(
  name: string,
): Promise<ActionResult<{ id: string; name: string }>> {
  try {
    await requireDirector()

    const validated = TeamSchema.safeParse({ name })
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message }
    }

    const existing = await db.team.findUnique({ where: { name } })
    if (existing) {
      return { success: false, error: "이미 사용 중인 팀 이름이에요" }
    }

    const team = await db.team.create({ data: { name } })
    revalidatePath("/admin")
    return { success: true, data: { id: team.id, name: team.name } }
  } catch (error) {
    console.error("Failed to create team:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "팀 생성 중 오류가 발생했어요",
    }
  }
}

// ---------------------------------------------------------------------------
// 팀 수정
// ---------------------------------------------------------------------------

export async function updateTeamAction(
  id: string,
  name: string,
): Promise<ActionResult<{ id: string; name: string }>> {
  try {
    await requireDirector()

    const validated = TeamSchema.safeParse({ name })
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message }
    }

    const existing = await db.team.findUnique({ where: { name } })
    if (existing && existing.id !== id) {
      return { success: false, error: "이미 사용 중인 팀 이름이에요" }
    }

    const team = await db.team.update({ where: { id }, data: { name } })
    revalidatePath("/admin")
    return { success: true, data: { id: team.id, name: team.name } }
  } catch (error) {
    console.error("Failed to update team:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "팀 수정 중 오류가 발생했어요",
    }
  }
}

// ---------------------------------------------------------------------------
// 팀 삭제
// ---------------------------------------------------------------------------

export async function deleteTeamAction(
  id: string,
): Promise<ActionResult> {
  try {
    await requireDirector()

    const team = await db.team.findUnique({
      where: { id },
      include: {
        teachers: { select: { id: true } },
        students: { select: { id: true } },
      },
    })

    if (!team) {
      return { success: false, error: "팀을 찾을 수 없어요" }
    }

    if (team.teachers.length > 0 || team.students.length > 0) {
      return {
        success: false,
        error: `팀에 소속된 멤버가 있어 삭제할 수 없어요 (선생님 ${team.teachers.length}명, 학생 ${team.students.length}명)`,
      }
    }

    await db.team.delete({ where: { id } })
    revalidatePath("/admin")
    return { success: true, data: undefined }
  } catch (error) {
    console.error("Failed to delete team:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "팀 삭제 중 오류가 발생했어요",
    }
  }
}
