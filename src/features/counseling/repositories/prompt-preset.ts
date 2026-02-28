import { db } from "@/lib/db/client"
import type {
  CounselingPromptType,
  CounselingPromptPresetData,
  CreateCounselingPresetInput,
  UpdateCounselingPresetInput,
} from "./prompt-preset-types"

// 타입/상수는 prompt-preset-types.ts에서 관리 (Client Component 안전)
export type { CounselingPromptType, CounselingPromptPresetData, CreateCounselingPresetInput, UpdateCounselingPresetInput }
export { TEMPLATE_VARIABLES, PROMPT_TYPE_LABELS } from "./prompt-preset-types"

// ---------------------------------------------------------------------------
// CRUD 함수
// ---------------------------------------------------------------------------

/** 특정 프롬프트 유형의 활성 프리셋 조회 (정렬순) */
export async function getActivePresetsByType(
  promptType: CounselingPromptType,
): Promise<CounselingPromptPresetData[]> {
  const rows = await db.counselingPromptPreset.findMany({
    where: { promptType, isActive: true },
    orderBy: { sortOrder: "asc" },
  })
  return rows.map(normalizeRow)
}

/** 특정 프롬프트 유형의 첫 번째 활성 프리셋 (프롬프트 빌더 용) */
export async function getActiveCounselingPreset(
  promptType: CounselingPromptType,
): Promise<CounselingPromptPresetData | null> {
  const row = await db.counselingPromptPreset.findFirst({
    where: { promptType, isActive: true },
    orderBy: { sortOrder: "asc" },
  })
  return row ? normalizeRow(row) : null
}

/** 전체 프리셋 조회 (관리자용, 비활성 포함) */
export async function getAllPresetsByType(
  promptType: CounselingPromptType,
): Promise<CounselingPromptPresetData[]> {
  const rows = await db.counselingPromptPreset.findMany({
    where: { promptType },
    orderBy: { sortOrder: "asc" },
  })
  return rows.map(normalizeRow)
}

/** 단일 프리셋 조회 */
export async function getPresetById(
  id: string,
): Promise<CounselingPromptPresetData | null> {
  const row = await db.counselingPromptPreset.findUnique({ where: { id } })
  return row ? normalizeRow(row) : null
}

/** 프리셋 생성 */
export async function createPreset(
  input: CreateCounselingPresetInput,
): Promise<CounselingPromptPresetData> {
  const row = await db.counselingPromptPreset.create({
    data: {
      promptType: input.promptType,
      name: input.name,
      description: input.description ?? "",
      promptTemplate: input.promptTemplate,
      systemPrompt: input.systemPrompt ?? null,
      maxOutputTokens: input.maxOutputTokens ?? 1000,
      temperature: input.temperature ?? 0.3,
      isBuiltIn: input.isBuiltIn ?? false,
      sortOrder: input.sortOrder ?? 0,
    },
  })
  return normalizeRow(row)
}

/** 프리셋 수정 */
export async function updatePreset(
  id: string,
  input: UpdateCounselingPresetInput,
): Promise<CounselingPromptPresetData> {
  const data: Record<string, unknown> = {}
  if (input.name !== undefined) data.name = input.name
  if (input.description !== undefined) data.description = input.description
  if (input.promptTemplate !== undefined) data.promptTemplate = input.promptTemplate
  if (input.systemPrompt !== undefined) data.systemPrompt = input.systemPrompt
  if (input.maxOutputTokens !== undefined) data.maxOutputTokens = input.maxOutputTokens
  if (input.temperature !== undefined) data.temperature = input.temperature
  if (input.isActive !== undefined) data.isActive = input.isActive
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder

  const row = await db.counselingPromptPreset.update({
    where: { id },
    data,
  })
  return normalizeRow(row)
}

/** 프리셋 삭제 (내장 프리셋은 비활성 처리만) */
export async function deletePreset(id: string): Promise<void> {
  const preset = await db.counselingPromptPreset.findUnique({ where: { id } })
  if (!preset) return
  if (preset.isBuiltIn) {
    await db.counselingPromptPreset.update({
      where: { id },
      data: { isActive: false },
    })
  } else {
    await db.counselingPromptPreset.delete({ where: { id } })
  }
}

/** 기본 내장 프리셋 시딩 (없으면 생성, 있으면 스킵) */
export async function seedBuiltInPresets(
  definitions: Array<{
    promptType: CounselingPromptType
    name: string
    description: string
    promptTemplate: string
    systemPrompt?: string
    maxOutputTokens: number
    temperature: number
    sortOrder: number
  }>,
): Promise<number> {
  let created = 0
  for (const def of definitions) {
    const existing = await db.counselingPromptPreset.findUnique({
      where: { promptType_name: { promptType: def.promptType, name: def.name } },
    })
    if (!existing) {
      await db.counselingPromptPreset.create({
        data: {
          promptType: def.promptType,
          name: def.name,
          description: def.description,
          promptTemplate: def.promptTemplate,
          systemPrompt: def.systemPrompt ?? null,
          maxOutputTokens: def.maxOutputTokens,
          temperature: def.temperature,
          isBuiltIn: true,
          isActive: true,
          sortOrder: def.sortOrder,
        },
      })
      created++
    }
  }
  return created
}

// ---------------------------------------------------------------------------
// 헬퍼 함수
// ---------------------------------------------------------------------------

function normalizeRow(row: {
  id: string
  promptType: string
  name: string
  description: string
  promptTemplate: string
  systemPrompt: string | null
  maxOutputTokens: number
  temperature: number
  isBuiltIn: boolean
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}): CounselingPromptPresetData {
  return {
    ...row,
    promptType: row.promptType as CounselingPromptType,
  }
}
