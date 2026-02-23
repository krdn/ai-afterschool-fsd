import { z } from "zod";

export const satisfactionSchema = z.object({
  studentId: z.string().min(1, "학생을 선택해주세요"),
  teacherId: z.string().min(1, "선생님을 선택해주세요"),
  surveyDate: z.string().min(1, "조사일을 입력해주세요"),
  overallSatisfaction: z
    .number()
    .min(1, "만족도는 최소 1 이상이어야 합니다")
    .max(10, "만족도는 최대 10 이하여야 합니다"),
  teachingQuality: z
    .number()
    .min(1, "교육 품질은 최소 1 이상이어야 합니다")
    .max(10, "교육 품질은 최대 10 이하여야 합니다"),
  communication: z
    .number()
    .min(1, "의사소통은 최소 1 이상이어야 합니다")
    .max(10, "의사소통은 최대 10 이하여야 합니다"),
  supportLevel: z
    .number()
    .min(1, "지원 수준은 최소 1 이상이어야 합니다")
    .max(10, "지원 수준은 최대 10 이하여야 합니다"),
  feedback: z
    .string()
    .max(500, "피드백은 최대 500자 이하여야 합니다")
    .optional(),
});

export type SatisfactionFormData = z.infer<typeof satisfactionSchema>;
