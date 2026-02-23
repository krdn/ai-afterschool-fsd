"use server"

import { redirect } from "next/navigation"
import { verifySession } from "@/lib/dal"
import { db } from "@/lib/db/client"
import { TeamSchema, type TeamFormState } from "@/lib/validations/teams"

export async function createTeam(
  prevState: TeamFormState,
  formData: FormData
): Promise<TeamFormState> {
  const session = await verifySession()

  // 권한 검증: 원장만 팀 생성 가능
  if (session.role !== 'DIRECTOR') {
    return {
      errors: {
        _form: ["팀을 생성할 권한이 없어요"],
      },
    }
  }

  const validatedFields = TeamSchema.safeParse({
    name: formData.get("name"),
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const { name } = validatedFields.data

  // 팀 이름 중복 검증
  const existingTeam = await db.team.findUnique({
    where: { name },
  })

  if (existingTeam) {
    return {
      errors: {
        name: ["이미 사용 중인 팀 이름이에요"],
      },
    }
  }

  try {
    await db.team.create({
      data: { name },
    })
  } catch (error) {
    console.error("Failed to create team:", error)
    return {
      errors: {
        _form: ["팀 생성 중 오류가 발생했어요"],
      },
    }
  }

  redirect("/admin/teams")
}

export async function updateTeam(
  id: string,
  prevState: TeamFormState,
  formData: FormData
): Promise<TeamFormState> {
  const session = await verifySession()

  // 권한 검증: 원장만 팀 수정 가능
  if (session.role !== 'DIRECTOR') {
    return {
      errors: {
        _form: ["팀을 수정할 권한이 없어요"],
      },
    }
  }

  const team = await db.team.findUnique({
    where: { id },
  })

  if (!team) {
    return {
      errors: {
        _form: ["팀을 찾을 수 없어요"],
      },
    }
  }

  const validatedFields = TeamSchema.safeParse({
    name: formData.get("name"),
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const { name } = validatedFields.data

  // 팀 이름 중복 검증
  const existingTeam = await db.team.findUnique({
    where: { name },
  })

  if (existingTeam && existingTeam.id !== id) {
    return {
      errors: {
        name: ["이미 사용 중인 팀 이름이에요"],
      },
    }
  }

  try {
    await db.team.update({
      where: { id },
      data: { name },
    })
  } catch (error) {
    console.error("Failed to update team:", error)
    return {
      errors: {
        _form: ["팀 수정 중 오류가 발생했어요"],
      },
    }
  }

  redirect(`/admin/teams/${id}`)
}

export async function deleteTeam(id: string): Promise<void> {
  const session = await verifySession()

  // 권한 검증: 원장만 팀 삭제 가능
  if (session.role !== 'DIRECTOR') {
    throw new Error("팀을 삭제할 권한이 없어요")
  }

  const team = await db.team.findUnique({
    where: { id },
    include: {
      teachers: { select: { id: true } },
      students: { select: { id: true } },
    },
  })

  if (!team) {
    throw new Error("팀을 찾을 수 없어요")
  }

  // 연관된 선생님 또는 학생이 있는 경우 삭제 불가
  if (team.teachers.length > 0 || team.students.length > 0) {
    throw new Error("팀에 소속된 선생님 또는 학생이 있어 삭제할 수 없어요")
  }

  try {
    await db.team.delete({
      where: { id },
    })
  } catch (error) {
    console.error("Failed to delete team:", error)
    throw new Error("팀 삭제 중 오류가 발생했어요")
  }

  redirect("/admin/teams")
}

export async function getTeams() {
  const session = await verifySession()

  // 원장: 모든 팀 조회
  // 팀장/매니저/선생님: 자신의 팀만 조회
  const teams = await db.team.findMany({
    where: session.role === 'DIRECTOR'
      ? undefined
      : { id: session.teamId || undefined },
    include: {
      _count: {
        select: {
          teachers: true,
          students: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  return teams
}

export async function getTeamById(id: string) {
  const session = await verifySession()

  const team = await db.team.findUnique({
    where: { id },
    include: {
      teachers: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
        orderBy: { name: 'asc' },
      },
      students: {
        select: {
          id: true,
          name: true,
          grade: true,
        },
        orderBy: { name: 'asc' },
      },
    },
  })

  if (!team) {
    return null
  }

  // 권한 검증: 원장 또는 소속 팀만 조회 가능
  if (session.role !== 'DIRECTOR' && session.teamId !== id) {
    return null
  }

  return team
}
