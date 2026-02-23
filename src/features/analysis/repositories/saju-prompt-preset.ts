/**
 * 사주 프롬프트 프리셋 (하위 호환 래퍼)
 *
 * 기존 코드와의 호환성을 위해 analysis-prompt-preset.ts의 래퍼로 동작합니다.
 */

import {
  getActivePresetsByType,
  getAllPresetsByType,
  getPresetByKey as getPresetByKeyGeneric,
  createPreset as createPresetGeneric,
  updatePreset as updatePresetGeneric,
  deletePreset as deletePresetGeneric,
  seedBuiltInPresets as seedBuiltInPresetsGeneric,
  type AnalysisPromptPresetData,
  type CreatePresetInput as CreatePresetInputGeneric,
  type UpdatePresetInput as UpdatePresetInputGeneric,
} from "./prompt-preset"

// 하위 호환을 위한 타입 재export
export type SajuPromptPresetData = Omit<AnalysisPromptPresetData, "analysisType">

export type CreatePresetInput = Omit<CreatePresetInputGeneric, "analysisType">

export type UpdatePresetInput = UpdatePresetInputGeneric

/** 활성 프롬프트 프리셋 전체 목록 조회 */
export async function getActivePresets(): Promise<SajuPromptPresetData[]> {
  const rows = await getActivePresetsByType("saju")
  return rows.map((row) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { analysisType, ...rest } = row
    return rest
  })
}

/** 전체 프리셋 목록 (관리자용, 비활성 포함) */
export async function getAllPresets(): Promise<SajuPromptPresetData[]> {
  const rows = await getAllPresetsByType("saju")
  return rows.map((row) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { analysisType, ...rest } = row
    return rest
  })
}

/** 단일 프리셋 조회 */
export async function getPresetByKey(promptKey: string): Promise<SajuPromptPresetData | null> {
  const row = await getPresetByKeyGeneric(promptKey, "saju")
  if (!row) return null
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { analysisType, ...rest } = row
  return rest
}

/** 프리셋 생성 */
export async function createPreset(input: CreatePresetInput): Promise<SajuPromptPresetData> {
  const row = await createPresetGeneric({
    ...input,
    analysisType: "saju",
  })
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { analysisType, ...rest } = row
  return rest
}

/** 프리셋 수정 */
export async function updatePreset(
  id: string,
  input: UpdatePresetInput,
): Promise<SajuPromptPresetData> {
  const row = await updatePresetGeneric(id, input)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { analysisType, ...rest } = row
  return rest
}

/** 프리셋 삭제 (내장 프롬프트는 비활성 처리만 가능) */
export async function deletePreset(id: string): Promise<void> {
  return deletePresetGeneric(id)
}

/** 코드 기본 프롬프트를 DB에 upsert (없으면 생성, 있으면 스킵) */
export async function seedBuiltInPresets(
  definitions: Array<{
    promptKey: string
    name: string
    shortDescription: string
    target: string
    levels: string
    purpose: string
    recommendedTiming: string
    tags: string[]
    promptTemplate: string
    sortOrder: number
  }>,
): Promise<number> {
  return seedBuiltInPresetsGeneric(
    definitions.map((def) => ({
      ...def,
      analysisType: "saju" as const,
    })),
  )
}
