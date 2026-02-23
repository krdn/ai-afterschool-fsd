import { db } from '@/lib/db/client'
import { logSystemAction } from '@/lib/dal'
import { headers } from 'next/headers'
import { NewPasswordForm } from '@/components/auth/new-password-form'
import { ResetPasswordError } from '@/components/auth/reset-password-error'

export default async function ResetPasswordTokenPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const resetToken = await db.passwordResetToken.findUnique({
    where: { token },
  })

  // 유효하지 않은 토큰 처리
  if (!resetToken) {
    const headersList = await headers()
    const ip =
      headersList.get('x-forwarded-for') ||
      headersList.get('x-real-ip') ||
      'unknown'

    // 의심스러운 활동 로깅 (WARN 레벨)
    await logSystemAction({
      level: 'WARN',
      message: 'Invalid password reset token accessed',
      context: { token: token.substring(0, 8) + '...', ip },
    })

    return <ResetPasswordError errorType="invalid" />
  }

  // 만료된 토큰 처리
  if (resetToken.expiresAt < new Date()) {
    // 만료된 토큰은 INFO 레벨 로깅 (일반적인 만료)
    await logSystemAction({
      level: 'INFO',
      message: 'Expired password reset token accessed',
      context: {
        token: token.substring(0, 8) + '...',
        expiredAt: resetToken.expiresAt,
      },
    })

    return (
      <ResetPasswordError
        errorType="expired"
        expiredAt={resetToken.expiresAt}
        createdAt={resetToken.createdAt}
      />
    )
  }

  // 이미 사용된 토큰 처리
  if (resetToken.used) {
    // 사용된 토큰은 INFO 레벨 로깅 (정상적인 흐름)
    await logSystemAction({
      level: 'INFO',
      message: 'Used password reset token accessed',
      context: { token: token.substring(0, 8) + '...' },
    })

    return <ResetPasswordError errorType="used" />
  }

  return <NewPasswordForm token={token} />
}
