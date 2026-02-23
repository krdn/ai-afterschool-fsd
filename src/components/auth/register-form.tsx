"use client"

import { useActionState, useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { toast } from "sonner"
import { signup, type AuthFormState } from "@/lib/actions/auth/login"
import { SignupSchema, type SignupInput } from "@/lib/validations/auth"
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

export function RegisterForm() {
    const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
        signup,
        { errors: {} }
    )

    const prevErrorRef = useRef<string | undefined>(undefined)
    useEffect(() => {
        const errorMessage = state?.errors?._form?.[0]
        if (errorMessage && errorMessage !== prevErrorRef.current) {
            toast.error(errorMessage)
            prevErrorRef.current = errorMessage
        }
    }, [state?.errors?._form])

    const form = useForm<SignupInput>({
        resolver: zodResolver(SignupSchema),
        defaultValues: {
            email: "",
            password: "",
            name: "",
            confirmPassword: "",
        },
        mode: "onChange",
    })

    return (
        <Card>
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold text-center">회원가입</CardTitle>
                <CardDescription className="text-center">
                    새로운 계정을 생성합니다
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form action={formAction} className="space-y-4" noValidate>
                    <div className="space-y-2">
                        <Label htmlFor="email">이메일</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="teacher@school.com"
                            autoComplete="email"
                            {...form.register("email")}
                        />
                        {(state?.errors?.email || form.formState.errors.email) && (
                            <p className="text-sm text-red-600">
                                {state?.errors?.email?.[0] || form.formState.errors.email?.message}
                            </p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">비밀번호</Label>
                        <Input
                            id="password"
                            type="password"
                            autoComplete="new-password"
                            {...form.register("password")}
                        />
                        {(state?.errors?.password || form.formState.errors.password) && (
                            <p className="text-sm text-red-600">
                                {state?.errors?.password?.[0] || form.formState.errors.password?.message}
                            </p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">비밀번호 확인</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            autoComplete="new-password"
                            {...form.register("confirmPassword")}
                        />
                        {(state?.errors?.confirmPassword || form.formState.errors.confirmPassword) && (
                            <p className="text-sm text-red-600">
                                {state?.errors?.confirmPassword?.[0] || form.formState.errors.confirmPassword?.message}
                            </p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="name">이름</Label>
                        <Input
                            id="name"
                            type="text"
                            autoComplete="name"
                            {...form.register("name")}
                        />
                        {(state?.errors?.name || form.formState.errors.name) && (
                            <p className="text-sm text-red-600">
                                {state?.errors?.name?.[0] || form.formState.errors.name?.message}
                            </p>
                        )}
                    </div>
                    <Button type="submit" className="w-full" disabled={pending}>
                        {pending ? "가입 중..." : "회원가입"}
                    </Button>
                </form>
            </CardContent>
            <CardFooter className="justify-center">
                <Link
                    href="/auth/login"
                    className="text-sm text-gray-600 hover:text-gray-900 hover:underline"
                >
                    이미 계정이 있으신가요? 로그인
                </Link>
            </CardFooter>
        </Card>
    )
}
