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
