"use client"

import { useActionState, useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { login, type AuthFormState } from "@/lib/actions/auth/login"
import { LoginSchema, type LoginInput } from "@/lib/validations/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function LoginForm() {
  const t = useTranslations("Auth")
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    login,
    { errors: {} }
  )

  // 로그인 에러 발생 시 토스트 표시
  const prevErrorRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    const errorMessage = state?.errors?._form?.[0]
    if (errorMessage && errorMessage !== prevErrorRef.current) {
      toast.error(errorMessage)
      prevErrorRef.current = errorMessage
    }
  }, [state?.errors?._form])

  const form = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onChange",
  })

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">{t("login")}</CardTitle>
        <CardDescription className="text-center">
          {t("welcome")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state?.errors?._form && (
            <div className="p-3 rounded-md bg-red-50 text-red-600 text-sm" data-testid="form-error">
              {state.errors._form[0]}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              type="email"
              placeholder="teacher@school.com"
              autoComplete="email"
              data-testid="email-input"
              {...form.register("email")}
            />
            {(state?.errors?.email || form.formState.errors.email) && (
              <p className="text-sm text-red-600" data-testid="email-error">
                {state?.errors?.email?.[0] ||
                  form.formState.errors.email?.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t("password")}</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              data-testid="password-input"
              {...form.register("password")}
            />
            {(state?.errors?.password || form.formState.errors.password) && (
              <p className="text-sm text-red-600" data-testid="password-error">
                {state?.errors?.password?.[0] ||
                  form.formState.errors.password?.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={pending} data-testid="login-button">
            {pending ? t("loggingIn") : t("login")}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <Link
          href="/reset-password"
          className="text-sm text-gray-600 hover:text-gray-900 hover:underline"
          data-testid="reset-password-link"
        >
          {t("forgotPassword")}
        </Link>
      </CardFooter>
    </Card>
  )
}
