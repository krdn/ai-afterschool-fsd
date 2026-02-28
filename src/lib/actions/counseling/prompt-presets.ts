'use server'

import { verifySession } from '@/lib/dal'
import { ok, fail, type ActionResult } from '@/lib/errors/action-result'
import { logger } from '@/lib/logger'
import {
  counselingPromptPresetSchema,
  counselingPromptPresetUpdateSchema,
} from '@/lib/validations/counseling'
import {
  getActivePresetsByType,
  getAllPresetsByType,
  getPresetById,
  createPreset,
  updatePreset,
  deletePreset,
  type CounselingPromptPresetData,
  type CounselingPromptType,
} from '@/features/counseling/repositories/prompt-preset'

// ---------------------------------------------------------------------------
// 프리셋 목록 조회
// ---------------------------------------------------------------------------

/** 특정 프롬프트 유형의 전체 프리셋 조회 (Admin용) */
export async function getCounselingPresetsAction(
  promptType: CounselingPromptType,
): Promise<ActionResult<CounselingPromptPresetData[]>> {
  try {
    const session = await verifySession()
    if (!session) return fail('인증이 필요합니다.')

    // TEAM_LEADER 이상만 접근 가능
    const allowedRoles = ['TEAM_LEADER', 'MANAGER', 'DIRECTOR']
    if (!allowedRoles.includes(session.role)) {
      return fail('권한이 없습니다.')
    }

    const presets = await getAllPresetsByType(promptType)
    return ok(presets)
  } catch (error) {
    logger.error({ err: error }, 'Failed to get counseling presets')
    return fail('프리셋 목록을 불러오지 못했습니다.')
  }
}

/** 활성 프리셋만 조회 (프롬프트 빌더용) */
export async function getActiveCounselingPresetsAction(
  promptType: CounselingPromptType,
): Promise<ActionResult<CounselingPromptPresetData[]>> {
  try {
    const session = await verifySession()
    if (!session) return fail('인증이 필요합니다.')

    const presets = await getActivePresetsByType(promptType)
    return ok(presets)
  } catch (error) {
    logger.error({ err: error }, 'Failed to get active counseling presets')
    return fail('프리셋 목록을 불러오지 못했습니다.')
  }
}

// ---------------------------------------------------------------------------
// 프리셋 생성
// ---------------------------------------------------------------------------

export async function createCounselingPresetAction(
  input: unknown,
): Promise<ActionResult<CounselingPromptPresetData>> {
  try {
    const session = await verifySession()
    if (!session) return fail('인증이 필요합니다.')

    const allowedRoles = ['TEAM_LEADER', 'MANAGER', 'DIRECTOR']
    if (!allowedRoles.includes(session.role)) {
      return fail('권한이 없습니다.')
    }

    const parsed = counselingPromptPresetSchema.safeParse(input)
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message || '입력값이 올바르지 않습니다.')
    }

    const preset = await createPreset({
      promptType: parsed.data.promptType,
      name: parsed.data.name,
      description: parsed.data.description,
      promptTemplate: parsed.data.promptTemplate,
      systemPrompt: parsed.data.systemPrompt,
      maxOutputTokens: parsed.data.maxOutputTokens,
      temperature: parsed.data.temperature,
    })
    return ok(preset)
  } catch (error) {
    logger.error({ err: error }, 'Failed to create counseling preset')
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return fail('같은 유형에 동일한 이름의 프리셋이 이미 존재합니다.')
    }
    return fail('프리셋 생성에 실패했습니다.')
  }
}

// ---------------------------------------------------------------------------
// 프리셋 수정
// ---------------------------------------------------------------------------

export async function updateCounselingPresetAction(
  id: string,
  input: unknown,
): Promise<ActionResult<CounselingPromptPresetData>> {
  try {
    const session = await verifySession()
    if (!session) return fail('인증이 필요합니다.')

    const allowedRoles = ['TEAM_LEADER', 'MANAGER', 'DIRECTOR']
    if (!allowedRoles.includes(session.role)) {
      return fail('권한이 없습니다.')
    }

    const parsed = counselingPromptPresetUpdateSchema.safeParse(input)
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message || '입력값이 올바르지 않습니다.')
    }

    // 내장 프리셋의 이름 변경 방지
    const existing = await getPresetById(id)
    if (!existing) return fail('프리셋을 찾을 수 없습니다.')
    if (existing.isBuiltIn && parsed.data.name && parsed.data.name !== existing.name) {
      return fail('내장 프리셋의 이름은 변경할 수 없습니다.')
    }

    const preset = await updatePreset(id, parsed.data)
    return ok(preset)
  } catch (error) {
    logger.error({ err: error }, 'Failed to update counseling preset')
    return fail('프리셋 수정에 실패했습니다.')
  }
}

// ---------------------------------------------------------------------------
// 프리셋 삭제
// ---------------------------------------------------------------------------

export async function deleteCounselingPresetAction(
  id: string,
): Promise<ActionResult<{ deleted: boolean }>> {
  try {
    const session = await verifySession()
    if (!session) return fail('인증이 필요합니다.')

    const allowedRoles = ['TEAM_LEADER', 'MANAGER', 'DIRECTOR']
    if (!allowedRoles.includes(session.role)) {
      return fail('권한이 없습니다.')
    }

    await deletePreset(id)
    return ok({ deleted: true })
  } catch (error) {
    logger.error({ err: error }, 'Failed to delete counseling preset')
    return fail('프리셋 삭제에 실패했습니다.')
  }
}
