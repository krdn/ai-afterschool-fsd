import { z } from "zod"

// 파일 크기 제한: 10MB (10 * 1024 * 1024 bytes)
const MAX_FILE_SIZE = 10 * 1024 * 1024

export const StudentImageSchema = z
  .object({
    type: z.enum(["profile", "face", "palm"]),
    originalUrl: z.string().url(),
    publicId: z.string().min(1),
    format: z.string().optional(),
    bytes: z.coerce
      .number()
      .int()
      .positive()
      .max(MAX_FILE_SIZE, {
        message: "파일 크기는 10MB 이하여야 해요",
      })
      .optional(),
    width: z.coerce.number().int().positive().optional(),
    height: z.coerce.number().int().positive().optional(),
  })
  .refine((data) => {
    // URL이 유효한지 추가 검증
    if (!data.originalUrl || !data.originalUrl.startsWith("http")) {
      return false
    }
    return true
  }, {
    message: "이미지 URL이 올바르지 않아요",
    path: ["originalUrl"],
  })

export type StudentImageInput = z.infer<typeof StudentImageSchema>
