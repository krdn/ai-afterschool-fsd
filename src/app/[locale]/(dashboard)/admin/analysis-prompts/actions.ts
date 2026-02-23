"use server"

import { verifySession } from "@/lib/dal"
import { redirect } from "next/navigation"
import {
  getAllGeneralPresetsByType,
  createGeneralPreset,
  updateGeneralPreset,
  deleteGeneralPreset,
  type AnalysisPromptPresetData,
} from '@/features/analysis'
import {
  AnalysisTypeSchema,
  CreatePresetSchema,
  UpdatePresetSchema,
  PresetIdSchema,
} from "@/lib/validations/analysis-prompts"

// ---------------------------------------------------------------------------
// 권한 검증
// ---------------------------------------------------------------------------

async function requireAdmin() {
  const session = await verifySession()
  if (!session) {
    redirect("/login")
  }
  if (session.role !== "DIRECTOR") {
    redirect("/access-denied")
  }
  return session
}

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

/** 특정 분석 유형의 전체 프리셋 조회 (관리자용) */
export async function getPresetsByTypeAction(
  analysisType: unknown,
): Promise<AnalysisPromptPresetData[]> {
  await requireAdmin()
  const parsed = AnalysisTypeSchema.safeParse(analysisType)
  if (!parsed.success) {
    throw new Error("유효하지 않은 분석 유형입니다.")
  }
  return getAllGeneralPresetsByType(parsed.data)
}

/** 프리셋 생성 */
export async function createPresetAction(
  input: unknown,
): Promise<AnalysisPromptPresetData> {
  await requireAdmin()
  const parsed = CreatePresetSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((e) => e.message).join(", "))
  }
  return createGeneralPreset(parsed.data)
}

/** 프리셋 수정 */
export async function updatePresetAction(
  id: unknown,
  input: unknown,
): Promise<AnalysisPromptPresetData> {
  await requireAdmin()
  const parsedId = PresetIdSchema.safeParse(id)
  if (!parsedId.success) {
    throw new Error("유효하지 않은 ID입니다.")
  }
  const parsed = UpdatePresetSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((e) => e.message).join(", "))
  }
  return updateGeneralPreset(parsedId.data, parsed.data)
}

/** 프리셋 삭제 */
export async function deletePresetAction(id: unknown): Promise<void> {
  await requireAdmin()
  const parsedId = PresetIdSchema.safeParse(id)
  if (!parsedId.success) {
    throw new Error("유효하지 않은 ID입니다.")
  }
  return deleteGeneralPreset(parsedId.data)
}
