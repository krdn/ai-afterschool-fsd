"use server"

import { revalidatePath } from "next/cache"
import { verifySession, logAuditAction, logSystemAction } from "@/lib/dal"
import { db } from "@/lib/db/client"
import argon2 from "argon2"
import { runSeed } from "@/lib/db/seed"
import type { SeedResult, SeedOptions } from "@/lib/db/seed"

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
// 시드 데이터 로드
// ---------------------------------------------------------------------------

export async function runSeedAction(): Promise<ActionResult<SeedResult>> {
  try {
    await requireDirector()

    const result = await runSeed(db)

    await logAuditAction({
      action: "SEED_DATABASE",
      entityType: "SYSTEM",
      changes: result as unknown as Record<string, unknown>,
    })

    await logSystemAction({
      level: "INFO",
      message: "시드 데이터 로드 완료",
      context: result as unknown as Record<string, unknown>,
    })

    revalidatePath("/admin")
    return { success: true, data: result }
  } catch (error) {
    console.error("Failed to run seed:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "시드 데이터 로드 중 오류가 발생했어요",
    }
  }
}

// ---------------------------------------------------------------------------
// 데모 시드 데이터 실행 (비밀번호 검증 포함)
// ---------------------------------------------------------------------------

export async function runDemoSeedAction(
  options: SeedOptions,
  password: string
): Promise<ActionResult<SeedResult>> {
  try {
    const session = await requireDirector()

    // 비밀번호 검증
    const teacher = await db.teacher.findUnique({
      where: { id: session.userId },
      select: { password: true },
    })

    if (!teacher) {
      return { success: false, error: "사용자를 찾을 수 없습니다" }
    }

    const passwordValid = await argon2.verify(teacher.password, password)
    if (!passwordValid) {
      return { success: false, error: "비밀번호가 올바르지 않습니다" }
    }

    // 시드 실행 (현재 로그인한 선생님은 삭제에서 제외)
    const result = await runSeed(db, { ...options, excludeTeacherId: session.userId })

    // 감사 로그
    await logAuditAction({
      action: "DEMO_SEED_DATABASE",
      entityType: "SYSTEM",
      changes: {
        groups: options.groups,
        modes: options.modes,
        result,
      } as unknown as Record<string, unknown>,
    })

    await logSystemAction({
      level: "INFO",
      message: "데모 시드 데이터 실행 완료",
      context: {
        groups: options.groups,
        modes: options.modes,
        result,
      } as unknown as Record<string, unknown>,
    })

    revalidatePath("/admin")
    revalidatePath("/dashboard")
    return { success: true, data: result }
  } catch (error) {
    console.error("Failed to run demo seed:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "데모 시드 실행 중 오류가 발생했어요",
    }
  }
}
