'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { requestPasswordReset } from '@/lib/actions/auth/login'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { XCircle, Clock, Lock, AlertCircle, Mail } from 'lucide-react'

interface ResetPasswordErrorProps {
  errorType: 'invalid' | 'expired' | 'used'
  expiredAt?: Date
  createdAt?: Date
}

export function ResetPasswordError({
  errorType,
  expiredAt,
  createdAt,
}: ResetPasswordErrorProps) {
  const [showResendForm, setShowResendForm] = useState(false)
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formState, setFormState] = useState<{
    message?: string
    success?: boolean
  }>()

  const handleResendClick = () => {
    setShowResendForm(true)
  }

  const handleResendSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setFormState(undefined)

    const result = await requestPasswordReset(
      { errors: {}, message: '' },
      new FormData(e.currentTarget as HTMLFormElement)
    )

    setFormState(result)
    setIsSubmitting(false)

    if (result.success) {
      setEmail('')
      setShowResendForm(false)
    }
  }

  const getErrorContent = () => {
    switch (errorType) {
      case 'invalid':
        return {
          icon: <XCircle className="h-16 w-16 text-gray-400" />,
          title: '유효하지 않은 링크예요',
          description:
            '비밀번호 재설정 링크가 유효하지 않아요. 링크가 올바르게 복사되었는지 확인해주세요.',
          iconColor: 'text-gray-400',
        }
      case 'expired':
        return {
          icon: <Clock className="h-16 w-16 text-orange-500" />,
          title: '링크가 만료되었어요',
          description: '비밀번호 재설정 링크의 유효 기간이 지났어요.',
          iconColor: 'text-orange-500',
        }
      case 'used':
        return {
          icon: <Lock className="h-16 w-16 text-gray-400" />,
          title: '이미 사용된 링크예요',
          description:
            '이미 비밀번호가 변경된 링크예요. 새로운 링크를 요청해주세요.',
          iconColor: 'text-gray-400',
        }
    }
  }

  const content = getErrorContent()

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">{content.title}</CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <div className="flex justify-center">{content.icon}</div>
        <p className="text-gray-600">{content.description}</p>

        {errorType === 'expired' && expiredAt && createdAt && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-left">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-2 text-sm">
                <p className="text-orange-800">
                  이 링크는{' '}
                  <span className="font-semibold">
                    {formatDistanceToNow(expiredAt, { locale: ko, addSuffix: true })}
                  </span>{' '}
                  만료되었어요
                </p>
                <p className="text-orange-700">
                  생성 시간:{' '}
                  {formatDistanceToNow(createdAt, { locale: ko, addSuffix: true })}
                </p>
                <p className="text-orange-600 text-xs mt-2">
                  보안을 위해 비밀번호 재설정 링크는 1시간 동안만 유효해요
                </p>
              </div>
            </div>
          </div>
        )}

        {showResendForm ? (
          <form onSubmit={handleResendSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-left block">
                이메일 주소
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1"
                disabled={isSubmitting || !email}
              >
                {isSubmitting ? (
                  <>
                    <Mail className="mr-2 h-4 w-4 animate-pulse" />
                    발송 중...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    재발송
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowResendForm(false)
                  setEmail('')
                  setFormState(undefined)
                }}
                disabled={isSubmitting}
              >
                취소
              </Button>
            </div>
          </form>
        ) : (
          formState?.message && (
            <Alert
              variant={formState.success ? 'default' : 'destructive'}
              className={formState.success ? 'border-green-500 text-green-700' : ''}
            >
              <AlertDescription>{formState.message}</AlertDescription>
            </Alert>
          )
        )}

        {!showResendForm && !formState?.success && (
          <Button
            onClick={handleResendClick}
            variant="outline"
            className="w-full"
          >
            <Mail className="mr-2 h-4 w-4" />
            새 링크 받기
          </Button>
        )}
      </CardContent>
      <CardFooter className="justify-center">
        <Button variant="ghost" asChild>
          <Link href="/auth/login">로그인으로 돌아가기</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
