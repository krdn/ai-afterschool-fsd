'use server'

import { verifySession } from '@/lib/dal'
import { getRBACPrisma } from '@/lib/db/common/rbac'

export interface AuditLogEntry {
  id: string
  teacherId: string
  teacherName: string
  action: string
  entityType: string
  entityId: string | null
  changes: Record<string, unknown> | null
  ipAddress: string | null
  createdAt: Date
}

export interface AuditLogsResult {
  logs: AuditLogEntry[]
  total: number
  page: number
  pageSize: number
}

export async function getAuditLogs(params: {
  action?: string
  page?: number
  pageSize?: number
}): Promise<AuditLogsResult> {
  const session = await verifySession()

  // Allow both DIRECTOR and TEAM_LEADER roles
  if (session.role !== 'DIRECTOR' && session.role !== 'TEAM_LEADER') {
    return { logs: [], total: 0, page: 1, pageSize: 20 }
  }

  const page = params.page || 1
  const pageSize = params.pageSize || 20
  const skip = (page - 1) * pageSize

  const where = params.action && params.action !== 'ALL'
    ? { action: params.action }
    : {}

  // Use RBAC Prisma for automatic team filtering
  const prisma = getRBACPrisma(session)

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ])

  return {
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
    page,
    pageSize,
  }
}
