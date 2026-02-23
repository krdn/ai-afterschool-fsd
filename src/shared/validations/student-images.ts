import { z } from "zod";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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
  .refine(
    (data) => {
      if (!data.originalUrl || !data.originalUrl.startsWith("http")) {
        return false;
      }
      return true;
    },
    {
      message: "이미지 URL이 올바르지 않아요",
      path: ["originalUrl"],
    }
  );

export type StudentImageInput = z.infer<typeof StudentImageSchema>;
