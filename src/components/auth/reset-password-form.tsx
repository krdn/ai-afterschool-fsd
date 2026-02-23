"use client"

import { useActionState } from "react"
import Link from "next/link"
import { requestPasswordReset, type ResetFormState } from "@/lib/actions/auth/login"
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

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState<ResetFormState, FormData>(
    requestPasswordReset,
    { errors: {} }
  )

  if (state?.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-center">이메일을 확인해주세요</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="text-6xl">📧</div>
          <p className="text-gray-600">{state.message}</p>
          <p className="text-sm text-gray-500">
            이메일이 도착하지 않았다면 스팸 폴더를 확인해주세요.
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          <Link
            href="/login"
            className="text-sm text-gray-600 hover:text-gray-900 hover:underline"
          >
            로그인으로 돌아가기
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          비밀번호 재설정
        </CardTitle>
        <CardDescription className="text-center">
          가입하신 이메일 주소를 입력해주세요
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
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="teacher@school.com"
              autoComplete="email"
            />
            {state?.errors?.email && (
              <p className="text-sm text-red-600">{state.errors.email[0]}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "요청 중..." : "재설정 링크 받기"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <Link
          href="/login"
          className="text-sm text-gray-600 hover:text-gray-900 hover:underline"
        >
          로그인으로 돌아가기
        </Link>
      </CardFooter>
    </Card>
  )
}
