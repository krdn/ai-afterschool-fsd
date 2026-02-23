"use server"

import { verifySession } from "@/lib/dal"
import {
  getAllSajuPresets,
  createSajuPreset,
  updateSajuPreset,
  deleteSajuPreset,
} from '@/features/analysis'
import {
  CreateSajuPresetSchema,
  UpdateSajuPresetSchema,
  SajuPresetIdSchema,
} from "@/lib/validations/saju-prompts"

async function requireAdmin() {
  const session = await verifySession()
  if (!session || (session.role !== "DIRECTOR" && session.role !== "TEAM_LEADER")) {
    throw new Error("권한이 없습니다.")
  }
  return session
}

export async function getPresetsAction() {
  await requireAdmin()
  return getAllSajuPresets()
}

export async function createPresetAction(input: unknown) {
  await requireAdmin()
  const parsed = CreateSajuPresetSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((e) => e.message).join(", "))
  }
  return createSajuPreset(parsed.data)
}

export async function updatePresetAction(id: unknown, input: unknown) {
  await requireAdmin()
  const parsedId = SajuPresetIdSchema.safeParse(id)
  if (!parsedId.success) {
    throw new Error("유효하지 않은 ID입니다.")
  }
  const parsed = UpdateSajuPresetSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((e) => e.message).join(", "))
  }
  return updateSajuPreset(parsedId.data, parsed.data)
}

export async function deletePresetAction(id: unknown) {
  await requireAdmin()
  const parsedId = SajuPresetIdSchema.safeParse(id)
  if (!parsedId.success) {
    throw new Error("유효하지 않은 ID입니다.")
  }
  await deleteSajuPreset(parsedId.data)
}
