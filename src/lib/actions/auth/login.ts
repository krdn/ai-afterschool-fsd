"use server"

import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { randomBytes } from "crypto"
import argon2 from "argon2"
import { db } from "@/lib/db/client"
import { createSession, deleteSession } from "@/lib/session"
import { rateLimit } from "@/lib/rate-limit"
import {
  LoginSchema,
  RequestResetSchema,
  ResetPasswordSchema,
  SignupSchema,
} from "@/lib/validations/auth"
import { logger } from "@/lib/logger"

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Resend } = require("resend") as {
  Resend: new (apiKey?: string) => {
    emails: {
      send: (options: {
        from: string
        to: string | string[]
        subject: string
        html?: string
        text?: string
      }) => Promise<unknown>
    }
  }
}

// Lazy initialization to avoid error when API key is not set
function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured")
  }
  return new Resend(apiKey)
}

export type AuthFormState = {
  errors?: {
    email?: string[]
    password?: string[]
    name?: string[]
    confirmPassword?: string[]
    _form?: string[]
  }
  message?: string
}

export type ResetFormState = {
  errors?: {
    email?: string[]
    password?: string[]
    confirmPassword?: string[]
    _form?: string[]
  }
  message?: string
  success?: boolean
}

export async function login(
  prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  // Rate Limiting: 로그인 5회/분 (CI 테스트 환경에서는 비활성화)
  if (!process.env.DISABLE_RATE_LIMIT) {
    const headersList = await headers()
    const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    const { success: rateLimitOk } = rateLimit(`login:${ip}`, {
      windowMs: 60 * 1000,
      maxRequests: 5,
    })
    if (!rateLimitOk) {
      return {
        errors: {
          _form: ["너무 많은 로그인 시도가 있었어요. 1분 후에 다시 시도해주세요."],
        },
      }
    }
  }

  const validatedFields = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const { email, password } = validatedFields.data

  const teacher = await db.teacher.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      password: true,
      name: true,
      role: true,
      teamId: true,
    },
  })

  if (!teacher) {
    return {
      errors: {
        _form: ["이메일 또는 비밀번호가 일치하지 않아요. 다시 확인해주세요."],
      },
    }
  }

  const passwordMatch = await argon2.verify(teacher.password, password)

  if (!passwordMatch) {
    return {
      errors: {
        _form: ["이메일 또는 비밀번호가 일치하지 않아요. 다시 확인해주세요."],
      },
    }
  }

  await createSession(teacher.id, teacher.role, teacher.teamId)

  // callbackUrl이 있으면 해당 경로로, 없으면 기본 /students로 리다이렉트
  const callbackUrl = formData.get("callbackUrl") as string | null
  const safeCallback = callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/students"
  redirect(safeCallback)
}

export async function signup(
  prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const validatedFields = SignupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const { name, email, password } = validatedFields.data

  const existingTeacher = await db.teacher.findUnique({
    where: { email },
  })

  if (existingTeacher) {
    return {
      errors: {
        email: ["이미 사용 중인 이메일이에요"],
      },
    }
  }

  const hashedPassword = await argon2.hash(password)

  try {
    const teacher = await db.teacher.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        teamId: true,
      },
    })

    await createSession(teacher.id, teacher.role, teacher.teamId)
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return {
        errors: {
          email: ["이미 사용 중인 이메일이에요"],
        },
      }
    }
    throw error
  }

  const callbackUrl = formData.get("callbackUrl") as string | null
  const safeCallback = callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/students"
  redirect(safeCallback)
}

export async function logout(): Promise<void> {
  await deleteSession()
  redirect("/auth/login")
}

export async function requestPasswordReset(
  prevState: ResetFormState,
  formData: FormData
): Promise<ResetFormState> {
  // Rate Limiting: 비밀번호 재설정 3회/분
  const resetHeadersList = await headers()
  const resetIp = resetHeadersList.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  const { success: resetRateLimitOk } = rateLimit(`reset:${resetIp}`, {
    windowMs: 60 * 1000,
    maxRequests: 3,
  })
  if (!resetRateLimitOk) {
    return {
      errors: {
        _form: ["너무 많은 요청이 있었어요. 1분 후에 다시 시도해주세요."],
      },
    }
  }

  const validatedFields = RequestResetSchema.safeParse({
    email: formData.get("email"),
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const { email } = validatedFields.data

  const teacher = await db.teacher.findUnique({
    where: { email },
  })

  const successMessage =
    "비밀번호 재설정 링크를 이메일로 보냈어요. 이메일을 확인해주세요."

  if (!teacher) {
    return {
      success: true,
      message: successMessage,
    }
  }

  const token = randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

  await db.passwordResetToken.deleteMany({
    where: { teacherId: teacher.id },
  })

  await db.passwordResetToken.create({
    data: {
      token,
      teacherId: teacher.id,
      expiresAt,
    },
  })

  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password/${token}`

  try {
    const resend = getResendClient()
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "noreply@resend.dev",
      to: email,
      subject: "[AI AfterSchool] 비밀번호 재설정",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>비밀번호 재설정</h2>
          <p>${teacher.name}님, 안녕하세요!</p>
          <p>비밀번호 재설정을 요청하셨습니다. 아래 버튼을 클릭하여 새 비밀번호를 설정해주세요.</p>
          <p>
            <a href="${resetUrl}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              비밀번호 재설정하기
            </a>
          </p>
          <p style="color: #666; font-size: 14px;">
            이 링크는 1시간 동안 유효합니다.<br>
            본인이 요청하지 않았다면 이 이메일을 무시해주세요.
          </p>
        </div>
      `,
    })
  } catch (error) {
    logger.error({ err: error }, 'Failed to send password reset email')
    return {
      errors: {
        _form: ["이메일 발송 중 오류가 발생했어요. 잠시 후 다시 시도해주세요."],
      },
    }
  }

  return {
    success: true,
    message: successMessage,
  }
}

export async function resetPassword(
  token: string,
  prevState: ResetFormState,
  formData: FormData
): Promise<ResetFormState> {
  const validatedFields = ResetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const { password } = validatedFields.data

  const resetToken = await db.passwordResetToken.findUnique({
    where: { token },
    include: { teacher: true },
  })

  if (!resetToken) {
    return {
      errors: {
        _form: ["유효하지 않은 링크예요. 비밀번호 재설정을 다시 요청해주세요."],
      },
    }
  }

  if (resetToken.expiresAt < new Date()) {
    return {
      errors: {
        _form: ["링크가 만료되었어요. 비밀번호 재설정을 다시 요청해주세요."],
      },
    }
  }

  if (resetToken.used) {
    return {
      errors: {
        _form: ["이미 사용된 링크예요. 비밀번호 재설정을 다시 요청해주세요."],
      },
    }
  }

  const hashedPassword = await argon2.hash(password)

  await db.$transaction([
    db.teacher.update({
      where: { id: resetToken.teacherId },
      data: { password: hashedPassword },
    }),
    db.passwordResetToken.update({
      where: { token },
      data: { used: true },
    }),
  ])

  return {
    success: true,
    message: "비밀번호가 변경되었어요. 새 비밀번호로 로그인해주세요.",
  }
}
