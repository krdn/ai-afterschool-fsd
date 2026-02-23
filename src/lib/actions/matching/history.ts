'use server'

import { verifySession } from '@/lib/dal'
import { db } from '@/lib/db/client'
import type { AuditLogEntry } from '@/lib/actions/admin/audit'
import { ok, fail, type ActionResult } from '@/lib/errors/action-result'

export interface MatchingHistoryParams {
  startDate?: string
  endDate?: string
  teacherId?: string
  action?: string
  page?: number
  pageSize?: number
}

export async function getMatchingHistory(
  params: MatchingHistoryParams
): Promise<ActionResult<{ logs: AuditLogEntry[]; total: number }>> {
  const session = await verifySession()

  // 권한 검증: DIRECTOR만 조회 가능
  if (session.role !== 'DIRECTOR') {
    return fail('권한이 없습니다.')
  }

  const page = params.page || 1
  const pageSize = params.pageSize || 20
  const skip = (page - 1) * pageSize

  // Prisma 쿼리 조건
  const where: {
    entityType: string
    teacherId?: string
    action?: string
    createdAt?: {
      gte?: Date
      lte?: Date
    }
  } = {
    entityType: 'Student', // 학생 배정 변경만 추적
  }

  // 날짜 범위 필터
  if (params.startDate || params.endDate) {
    where.createdAt = {}
    if (params.startDate) {
      where.createdAt.gte = new Date(params.startDate)
    }
    if (params.endDate) {
      // 종료일은 하루 끝까지 포함하기 위해 23:59:59로 설정
      const endDate = new Date(params.endDate)
      endDate.setHours(23, 59, 59, 999)
      where.createdAt.lte = endDate
    }
  }

  // 변경자 필터
  if (params.teacherId) {
    where.teacherId = params.teacherId
  }

  // 변경 유형 필터
  if (params.action && params.action !== 'ALL') {
    where.action = params.action
  }

  try {
    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        include: {
          teacher: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      db.auditLog.count({ where }),
    ])

    return ok({
      logs: logs.map((log) => ({
        id: log.id,
        teacherId: log.teacherId,
        teacherName: log.teacher.name,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        changes: log.changes as Record<string, unknown> | null,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt,
      })),
      total,
    })
  } catch (error) {
    console.error('Failed to fetch matching history:', error)
    return fail('매칭 이력 조회 중 오류가 발생했습니다.')
  }
}
