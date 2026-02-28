import { z } from "zod"

export const counselingSchema = z.object({
  studentId: z.string().min(1, "학생을 선택해주세요"),
  sessionDate: z.string().min(1, "상담일을 입력해주세요"),
  duration: z
    .number()
    .min(5, "상담 시간은 최소 5분 이상이어야 합니다")
    .max(180, "상담 시간은 최대 180분 이하여야 합니다"),
  type: z.enum(["ACADEMIC", "CAREER", "PSYCHOLOGICAL", "BEHAVIORAL"], {
    message: "상담 유형을 선택해주세요",
  }),
  summary: z
    .string()
    .min(10, "요약은 최소 10자 이상이어야 합니다")
    .max(1000, "요약은 최대 1000자 이하여야 합니다"),
  followUpRequired: z.boolean().optional(),
  followUpDate: z.string().optional(),
  satisfactionScore: z
    .number()
    .min(1, "만족도는 최소 1 이상이어야 합니다")
    .max(5, "만족도는 최대 5 이하여야 합니다")
    .optional(),
}).superRefine((data, ctx) => {
  if (data.followUpRequired && !data.followUpDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "후속 조치 날짜를 입력해주세요",
      path: ["followUpDate"],
    })
  }
  if (data.followUpDate) {
    const date = new Date(data.followUpDate)
    if (isNaN(date.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "올바른 날짜 형식이 아닙니다",
        path: ["followUpDate"],
      })
    } else {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (date < today) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "후속 조치 날짜는 오늘 이후여야 합니다",
          path: ["followUpDate"],
        })
      }
    }
  }
})

export type CounselingFormData = z.infer<typeof counselingSchema>

// ---------------------------------------------------------------------------
// 상담 프롬프트 프리셋 검증
// ---------------------------------------------------------------------------

const counselingPromptTypes = [
  "analysis_report",
  "scenario",
  "parent_summary",
  "counseling_summary",
  "personality_summary",
] as const

export const counselingPromptPresetSchema = z.object({
  promptType: z.enum(counselingPromptTypes, {
    message: "프롬프트 유형을 선택해주세요",
  }),
  name: z
    .string()
    .min(1, "프리셋 이름을 입력해주세요")
    .max(100, "프리셋 이름은 최대 100자입니다"),
  description: z
    .string()
    .max(500, "설명은 최대 500자입니다")
    .optional(),
  promptTemplate: z
    .string()
    .min(10, "프롬프트 템플릿은 최소 10자 이상이어야 합니다")
    .max(10000, "프롬프트 템플릿은 최대 10,000자입니다"),
  systemPrompt: z
    .string()
    .max(5000, "시스템 프롬프트는 최대 5,000자입니다")
    .optional()
    .nullable(),
  maxOutputTokens: z
    .number()
    .min(100, "최소 100 토큰 이상이어야 합니다")
    .max(4000, "최대 4,000 토큰까지 가능합니다")
    .optional(),
  temperature: z
    .number()
    .min(0, "temperature는 0 이상이어야 합니다")
    .max(1, "temperature는 1 이하여야 합니다")
    .optional(),
})

export const counselingPromptPresetUpdateSchema = counselingPromptPresetSchema
  .omit({ promptType: true })
  .partial()
  .extend({
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
  })

export type CounselingPromptPresetFormData = z.infer<typeof counselingPromptPresetSchema>
export type CounselingPromptPresetUpdateData = z.infer<typeof counselingPromptPresetUpdateSchema>
