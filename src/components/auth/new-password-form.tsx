"use client"

import { useActionState } from "react"
import Link from "next/link"
import { resetPassword, type ResetFormState } from "@/lib/actions/auth/login"
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

type NewPasswordFormProps = {
  token: string
}

export function NewPasswordForm({ token }: NewPasswordFormProps) {
  const boundResetPassword = resetPassword.bind(null, token)

  const [state, formAction, pending] = useActionState<ResetFormState, FormData>(
    boundResetPassword,
    { errors: {} }
  )

  if (state?.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-center">비밀번호가 변경되었어요</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="text-6xl">✅</div>
          <p className="text-gray-600">{state.message}</p>
        </CardContent>
        <CardFooter className="justify-center">
          <Button asChild>
            <Link href="/login">로그인하기</Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          새 비밀번호 설정
        </CardTitle>
        <CardDescription className="text-center">
          새로운 비밀번호를 입력해주세요
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state?.errors?._form && (
            <div className="p-3 rounded-md bg-red-50 text-red-600 text-sm">
              {state.errors._form[0]}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">새 비밀번호</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
            />
            {state?.errors?.password && (
              <p className="text-sm text-red-600">{state.errors.password[0]}</p>
            )}
            <p className="text-xs text-gray-500">8자 이상, 영문자와 숫자 포함</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">비밀번호 확인</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
            />
            {state?.errors?.confirmPassword && (
              <p className="text-sm text-red-600">
                {state.errors.confirmPassword[0]}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "변경 중..." : "비밀번호 변경"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
