import { z } from "zod";

export const TeacherSchema = z.object({
  name: z
    .string()
    .min(1, "이름을 입력해주세요")
    .max(50, "이름은 50자 이내로 입력해주세요"),
  email: z.string().email("올바른 이메일을 입력해주세요"),
  role: z.enum(["DIRECTOR", "TEAM_LEADER", "MANAGER", "TEACHER"], {
    message: "올바른 역할을 선택해주세요",
  }),
  teamId: z.string().nullable().optional(),
  phone: z.string().min(1, "연락처를 입력해주세요"),
  birthDate: z.string().min(1, "생년월일을 입력해주세요"),
  nameHanja: z.string().optional(),
  birthTimeHour: z.number().min(0).max(23).nullable().optional(),
  birthTimeMinute: z.number().min(0).max(59).nullable().optional(),
});

export type TeacherInput = z.infer<typeof TeacherSchema>;

export const UpdateTeacherSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z
    .enum(["DIRECTOR", "TEAM_LEADER", "MANAGER", "TEACHER"])
    .optional(),
  teamId: z.string().nullable().optional(),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  nameHanja: z.string().optional(),
  birthTimeHour: z.number().min(0).max(23).nullable().optional(),
  birthTimeMinute: z.number().min(0).max(59).nullable().optional(),
});

export type UpdateTeacherInput = z.infer<typeof UpdateTeacherSchema>;
