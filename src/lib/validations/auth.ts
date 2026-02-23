import { z } from "zod"

export const LoginSchema = z.object({
  email: z.string().email("올바른 이메일 주소를 입력해주세요"),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 해요"),
})

export const SignupSchema = z
  .object({
    name: z.string().min(2, "이름은 2자 이상이어야 해요"),
    email: z.string().email("올바른 이메일 주소를 입력해주세요"),
    password: z
      .string()
      .min(8, "비밀번호는 8자 이상이어야 해요")
      .regex(/[a-zA-Z]/, "비밀번호에 영문자가 포함되어야 해요")
      .regex(/[0-9]/, "비밀번호에 숫자가 포함되어야 해요"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "비밀번호가 일치하지 않아요",
    path: ["confirmPassword"],
  })

export const RequestResetSchema = z.object({
  email: z.string().email("올바른 이메일 주소를 입력해주세요"),
})

export const ResetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "비밀번호는 8자 이상이어야 해요")
      .regex(/[a-zA-Z]/, "비밀번호에 영문자가 포함되어야 해요")
      .regex(/[0-9]/, "비밀번호에 숫자가 포함되어야 해요"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "비밀번호가 일치하지 않아요",
    path: ["confirmPassword"],
  })

export type LoginInput = z.infer<typeof LoginSchema>
export type SignupInput = z.infer<typeof SignupSchema>
export type RequestResetInput = z.infer<typeof RequestResetSchema>
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>
