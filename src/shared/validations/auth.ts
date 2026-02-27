// Canonical source: @/lib/validations/auth
// shared 레이어에서 접근이 필요한 경우를 위한 re-export
export {
  LoginSchema,
  SignupSchema,
  RequestResetSchema,
  ResetPasswordSchema,
  type LoginInput,
  type SignupInput,
  type RequestResetInput,
  type ResetPasswordInput,
} from "@/lib/validations/auth"
