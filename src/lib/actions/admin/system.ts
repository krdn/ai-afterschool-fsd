'use server'

import { verifySession } from '@/lib/dal'
import { db } from '@/lib/db/client'
import { getRBACPrisma } from '@/lib/db/common/rbac'

export interface SystemLogEntry {
  id: string
  level: string
  message: string
  context: Record<string, unknown> | null
  timestamp: Date
}

export interface SystemLogsResult {
  logs: SystemLogEntry[]
  total: number
  page: number
  pageSize: number
}

export async function getSystemLogs(params: {
  level?: string
  page?: number
  pageSize?: number
}): Promise<SystemLogsResult> {
  const session = await verifySession()

  // Allow both DIRECTOR and TEAM_LEADER roles
  if (session.role !== 'DIRECTOR' && session.role !== 'TEAM_LEADER') {
    return { logs: [], total: 0, page: 1, pageSize: 20 }
  }

  const page = params.page || 1
  const pageSize = params.pageSize || 20
  const skip = (page - 1) * pageSize

  const where = params.level && params.level !== 'ALL'
    ? { level: params.level }
    : {}

  // Use RBAC Prisma for automatic team filtering
  const prisma = getRBACPrisma(session)

  const [logs, total] = await Promise.all([
    prisma.systemLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.systemLog.count({ where }),
  ])

  return {
    logs: logs.map((log) => ({
      id: log.id,
      level: log.level,
      message: log.message,
      context: log.context as Record<string, unknown> | null,
      timestamp: log.timestamp,
    })),
    total,
    page,
    pageSize,
  }
}
