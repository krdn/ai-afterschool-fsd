import { z } from 'zod'

export const updateNoteSchema = z.object({
  noteId: z.string().min(1, "노트 ID가 필요합니다"),
  checked: z.boolean().optional(),
  memo: z.string().max(500, "메모는 500자 이내로 작성해주세요").optional(),
})

export const addNoteSchema = z.object({
  sessionId: z.string().min(1, "세션 ID가 필요합니다"),
  content: z.string().min(1, "내용을 입력해주세요").max(200, "항목은 200자 이내로 작성해주세요"),
})

export const deleteNoteSchema = z.object({
  noteId: z.string().min(1, "노트 ID가 필요합니다"),
})

export const reorderNotesSchema = z.object({
  sessionId: z.string().min(1, "세션 ID가 필요합니다"),
  noteIds: z.array(z.string().min(1)).min(1, "최소 1개 항목이 필요합니다"),
})

export const completeSessionSchema = z.object({
  sessionId: z.string().min(1, "세션 ID가 필요합니다"),
  reservationId: z.string().min(1, "예약 ID가 필요합니다"),
  type: z.enum(["ACADEMIC", "CAREER", "PSYCHOLOGICAL", "BEHAVIORAL"], {
    message: "상담 유형을 선택해주세요",
  }),
  duration: z.number().min(5, "최소 5분").max(180, "최대 180분"),
  summary: z.string().min(10, "상담 내용은 최소 10자 이상 입력해주세요").max(2000, "상담 내용은 2000자 이내로 작성해주세요"),
  aiSummary: z.string().optional(),
  followUpRequired: z.boolean(),
  followUpDate: z.string().optional(),
  satisfactionScore: z.number().min(1).max(5).optional(),
}).superRefine((data, ctx) => {
  if (data.followUpRequired && !data.followUpDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "후속 조치가 필요한 경우 날짜를 선택해주세요",
      path: ["followUpDate"],
    })
  }
})

export type UpdateNoteInput = z.infer<typeof updateNoteSchema>
export type AddNoteInput = z.infer<typeof addNoteSchema>
export type DeleteNoteInput = z.infer<typeof deleteNoteSchema>
export type ReorderNotesInput = z.infer<typeof reorderNotesSchema>
export type CompleteSessionInput = z.infer<typeof completeSessionSchema>
