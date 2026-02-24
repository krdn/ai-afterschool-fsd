import 'server-only'
import { cookies } from 'next/headers'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { decrypt } from '@/lib/session'
import { db } from '@/lib/db/client'
import { setRLSSessionContext, getRBACPrisma } from '@/lib/db/common/rbac'

export type VerifiedSession = {
  isAuth: true
  userId: string
  role: 'DIRECTOR' | 'TEAM_LEADER' | 'MANAGER' | 'TEACHER'
  teamId: string | null
}

/**
 * Verifies the session and returns the authenticated user.
 * CRITICAL: Call this in every Server Action and Server Component that accesses data.
 * This is the security layer - middleware is for UX (fast redirects) only.
 * Also sets PostgreSQL RLS context for tenant isolation.
 */
export const verifySession = cache(async (): Promise<VerifiedSession> => {
  const cookieStore = await cookies()
  const session = cookieStore.get('session')?.value
  const payload = await decrypt(session)

  if (!payload?.userId) {
    redirect('/auth/login')
  }

  // NOTE: Session update is disabled in layouts/server components
  // Session refresh only happens in middleware to avoid cookie modification in non-action contexts
  // await updateSession(payload.userId, payload.role, payload.teamId)

  // PostgreSQL RLS 세션 컨텍스트 설정
  // 빈 문자열 teamId를 null로 변환
  const normalizedTeamId = payload.teamId && payload.teamId.trim() !== '' ? payload.teamId : null

  await setRLSSessionContext({
    teacherId: payload.userId,
    role: payload.role,
    teamId: normalizedTeamId,
  })

  return {
    isAuth: true,
    userId: payload.userId,
    role: payload.role,
    teamId: payload.teamId,
  }
})

/**
 * Get RBAC-aware Prisma client with team filtering.
 * Convenience function that combines session verification with RBAC client.
 */
export const getRBACDB = cache(async () => {
  const session = await verifySession()
  return getRBACPrisma(session)
})

/**
 * Get current teacher with session verification.
 * Returns teacher data including role, teamId, and team relation after verifying auth.
 */
export const getCurrentTeacher = cache(async () => {
  const session = await verifySession()

  const teacher = await db.teacher.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      teamId: true,
      team: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  if (!teacher) {
    redirect('/auth/login')
  }

  return teacher
})

/**
 * 감사 로그 기록 함수
 * 주요 설정 변경 시 호출하여 이력을 남깁니다
 */
export async function logAuditAction(params: {
  action: string
  entityType: string
  entityId?: string
  changes?: Record<string, unknown>
}) {
  const session = await verifySession()
  if (!session?.userId) return

  const headersList = await headers()
  const ipAddress = headersList.get('x-forwarded-for') ||
    headersList.get('x-real-ip') ||
    null
  const userAgent = headersList.get('user-agent') || null

  await db.auditLog.create({
    data: {
      teacherId: session.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      changes: params.changes as import('@/lib/db').Prisma.InputJsonValue | undefined,
      ipAddress,
      userAgent,
    },
  })
}

/**
 * 시스템 로그 기록 함수
 * 애플리케이션 이벤트를 로그에 남깁니다
 */
export async function logSystemAction(params: {
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG'
  message: string
  context?: Record<string, unknown>
}) {
  await db.systemLog.create({
    data: {
      level: params.level,
      message: params.message,
      context: params.context as import('@/lib/db').Prisma.InputJsonValue | undefined,
    },
  })
}
