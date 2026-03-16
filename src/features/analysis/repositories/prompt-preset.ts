import { db } from "@/lib/db/client"

// ---------------------------------------------------------------------------
// 타입 정의
// ---------------------------------------------------------------------------

export type AnalysisType = "saju" | "face" | "palm" | "mbti" | "vark" | "name" | "zodiac" | "grade_strength" | "grade_gap" | "grade_plan" | "grade_coaching"

export type AnalysisPromptPresetData = {
  id: string
  analysisType: AnalysisType
  promptKey: string
  name: string
  shortDescription: string
  target: string
  levels: string
  purpose: string
  recommendedTiming: string
  tags: string[]
  promptTemplate: string
  isBuiltIn: boolean
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

export type CreatePresetInput = {
  analysisType: AnalysisType
  promptKey: string
  name: string
  shortDescription: string
  target: string
  levels?: string
  purpose: string
  recommendedTiming: string
  tags?: string[]
  promptTemplate: string
  isBuiltIn?: boolean
  sortOrder?: number
}

export type UpdatePresetInput = Partial<Omit<CreatePresetInput, "promptKey" | "analysisType">> & {
  isActive?: boolean
}

// ---------------------------------------------------------------------------
// CRUD 함수
// ---------------------------------------------------------------------------

/** 특정 분석 유형의 활성 프리셋 조회 */
export async function getActivePresetsByType(
  analysisType: AnalysisType,
): Promise<AnalysisPromptPresetData[]> {
  const rows = await db.analysisPromptPreset.findMany({
    where: {
      analysisType,
      isActive: true,
    },
    orderBy: { sortOrder: "asc" },
  })
  return rows.map(normalizeRow)
}

/** 특정 분석 유형의 전체 프리셋 조회 (관리자용, 비활성 포함) */
export async function getAllPresetsByType(
  analysisType: AnalysisType,
): Promise<AnalysisPromptPresetData[]> {
  const rows = await db.analysisPromptPreset.findMany({
    where: { analysisType },
    orderBy: { sortOrder: "asc" },
  })
  return rows.map(normalizeRow)
}

/** 단일 프리셋 조회 */
export async function getPresetByKey(
  promptKey: string,
  analysisType: AnalysisType,
): Promise<AnalysisPromptPresetData | null> {
  const row = await db.analysisPromptPreset.findUnique({
    where: {
      promptKey_analysisType: {
        promptKey,
        analysisType,
      },
    },
  })
  return row ? normalizeRow(row) : null
}

/** 프리셋 생성 */
export async function createPreset(input: CreatePresetInput): Promise<AnalysisPromptPresetData> {
  const row = await db.analysisPromptPreset.create({
    data: {
      analysisType: input.analysisType,
      promptKey: input.promptKey,
      name: input.name,
      shortDescription: input.shortDescription,
      target: input.target,
      levels: input.levels ?? "★★★☆☆",
      purpose: input.purpose,
      recommendedTiming: input.recommendedTiming,
      tags: input.tags ?? [],
      promptTemplate: input.promptTemplate,
      isBuiltIn: input.isBuiltIn ?? false,
      sortOrder: input.sortOrder ?? 0,
    },
  })
  return normalizeRow(row)
}

/** 프리셋 수정 */
export async function updatePreset(
  id: string,
  input: UpdatePresetInput,
): Promise<AnalysisPromptPresetData> {
  const data: Record<string, unknown> = {}
  if (input.name !== undefined) data.name = input.name
  if (input.shortDescription !== undefined) data.shortDescription = input.shortDescription
  if (input.target !== undefined) data.target = input.target
  if (input.levels !== undefined) data.levels = input.levels
  if (input.purpose !== undefined) data.purpose = input.purpose
  if (input.recommendedTiming !== undefined) data.recommendedTiming = input.recommendedTiming
  if (input.tags !== undefined) data.tags = input.tags
  if (input.promptTemplate !== undefined) data.promptTemplate = input.promptTemplate
  if (input.isActive !== undefined) data.isActive = input.isActive
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder

  const row = await db.analysisPromptPreset.update({
    where: { id },
    data,
  })
  return normalizeRow(row)
}

/** 프리셋 삭제 (내장 프롬프트는 비활성 처리만 가능) */
export async function deletePreset(id: string): Promise<void> {
  const preset = await db.analysisPromptPreset.findUnique({ where: { id } })
  if (!preset) return
  if (preset.isBuiltIn) {
    await db.analysisPromptPreset.update({
      where: { id },
      data: { isActive: false },
    })
  } else {
    await db.analysisPromptPreset.delete({ where: { id } })
  }
}

/** 코드 기본 프롬프트를 DB에 upsert (없으면 생성, 있으면 스킵) */
export async function seedBuiltInPresets(
  definitions: Array<{
    analysisType: AnalysisType
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
  let created = 0
  for (const def of definitions) {
    const existing = await db.analysisPromptPreset.findUnique({
      where: {
        promptKey_analysisType: {
          promptKey: def.promptKey,
          analysisType: def.analysisType,
        },
      },
    })
    if (!existing) {
      await db.analysisPromptPreset.create({
        data: {
          analysisType: def.analysisType,
          promptKey: def.promptKey,
          name: def.name,
          shortDescription: def.shortDescription,
          target: def.target,
          levels: def.levels,
          purpose: def.purpose,
          recommendedTiming: def.recommendedTiming,
          tags: def.tags,
          promptTemplate: def.promptTemplate,
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

// JSON tags → string[] 변환
function normalizeRow(row: {
  id: string
  analysisType: string
  promptKey: string
  name: string
  shortDescription: string
  target: string
  levels: string
  purpose: string
  recommendedTiming: string
  tags: unknown
  promptTemplate: string
  isBuiltIn: boolean
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}): AnalysisPromptPresetData {
  return {
    ...row,
    analysisType: row.analysisType as AnalysisType,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
  }
}
