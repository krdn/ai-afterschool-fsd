import { z } from "zod"

export const CreateSajuPresetSchema = z.object({
  promptKey: z.string().min(1, "프롬프트 키를 입력해주세요"),
  name: z.string().min(1, "이름을 입력해주세요"),
  shortDescription: z.string().min(1, "설명을 입력해주세요"),
  target: z.string().min(1, "대상을 입력해주세요"),
  levels: z.string().optional(),
  purpose: z.string().min(1, "목적을 입력해주세요"),
  recommendedTiming: z.string().min(1, "추천 시기를 입력해주세요"),
  tags: z.array(z.string()).optional(),
  promptTemplate: z.string().min(1, "프롬프트 템플릿을 입력해주세요"),
  isBuiltIn: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export const UpdateSajuPresetSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요").optional(),
  shortDescription: z.string().min(1, "설명을 입력해주세요").optional(),
  target: z.string().min(1, "대상을 입력해주세요").optional(),
  levels: z.string().optional(),
  purpose: z.string().min(1, "목적을 입력해주세요").optional(),
  recommendedTiming: z.string().min(1, "추천 시기를 입력해주세요").optional(),
  tags: z.array(z.string()).optional(),
  promptTemplate: z.string().min(1, "프롬프트 템플릿을 입력해주세요").optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export const SajuPresetIdSchema = z.string().cuid("유효하지 않은 ID입니다")
