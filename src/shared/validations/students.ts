import { z } from "zod";

const phoneRegex = /^010-\d{4}-\d{4}$/;

const emptyToUndefined = (value: unknown) =>
  value === "" || value === null ? undefined : value;

const birthTimeHourSchema = z
  .preprocess(
    emptyToUndefined,
    z.coerce
      .number()
      .int()
      .min(0, "출생 시간(시)은 0~23 사이여야 해요")
      .max(23, "출생 시간(시)은 0~23 사이여야 해요")
  )
  .optional();

const birthTimeMinuteSchema = z
  .preprocess(
    emptyToUndefined,
    z.coerce
      .number()
      .int()
      .min(0, "출생 시간(분)은 0~59 사이여야 해요")
      .max(59, "출생 시간(분)은 0~59 사이여야 해요")
  )
  .optional();

const baseStudentSchema = z.object({
  name: z.string().min(2, "이름은 2자 이상이어야 해요"),
  birthDate: z.string().refine((val) => {
    const date = new Date(val);
    return !Number.isNaN(date.getTime());
  }, "올바른 생년월일을 입력해주세요"),
  birthTimeHour: birthTimeHourSchema,
  birthTimeMinute: birthTimeMinuteSchema,
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || phoneRegex.test(val),
      "010-0000-0000 형식으로 입력해주세요"
    ),
  school: z.string().min(2, "학교명을 입력해주세요"),
  grade: z.coerce
    .number()
    .int()
    .min(1, "학년은 1 이상이어야 해요")
    .max(3, "학년은 3 이하여야 해요"),
  nationality: z.string().optional(),
  targetUniversity: z.string().optional(),
  targetMajor: z.string().optional(),
  bloodType: z.enum(["A", "B", "AB", "O"]).optional().nullable(),
  parentName: z.string().optional(),
  parentPhone: z
    .string()
    .optional()
    .refine(
      (val) => !val || phoneRegex.test(val),
      "010-0000-0000 형식으로 입력해주세요"
    ),
});

function ensureHourWhenMinuteProvided(
  data: { birthTimeHour?: number; birthTimeMinute?: number },
  ctx: z.RefinementCtx
) {
  if (
    data.birthTimeMinute !== undefined &&
    data.birthTimeHour === undefined
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["birthTimeMinute"],
      message: "출생 시간을 입력할 때는 시를 먼저 입력해주세요",
    });
  }
}

export const CreateStudentSchema =
  baseStudentSchema.superRefine(ensureHourWhenMinuteProvided);

export const HanjaSelectionSchema = z.object({
  syllable: z.string(),
  hanja: z.string().nullable(),
});

export const NameHanjaSchema = z.array(HanjaSelectionSchema);

export const UpdateStudentSchema = baseStudentSchema
  .partial()
  .superRefine(ensureHourWhenMinuteProvided);

export type CreateStudentInput = z.infer<typeof CreateStudentSchema>;
export type UpdateStudentInput = z.infer<typeof UpdateStudentSchema>;
export type NameHanjaInput = z.infer<typeof NameHanjaSchema>;
