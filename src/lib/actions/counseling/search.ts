'use server'

import { db } from '@/lib/db/client'
import { verifySession } from '@/lib/dal'
import { getRBACPrisma } from '@/lib/db/common/rbac'
import type { CounselingType, Prisma } from '@/lib/db'
import { ok, fail, type ActionResult } from '@/lib/errors/action-result'
import { logger } from "@/lib/logger"

/**
 * 상담 기록 통합 검색 파라미터
 */
export interface CounselingSearchParams {
  query?: string
  type?: CounselingType
  startDate?: string
  endDate?: string
  teacherId?: string
  followUpRequired?: boolean
}

/**
 * 상담 기록 통합 검색 결과
 */
export interface CounselingSearchResult {
  id: string
  sessionDate: Date
  duration: number
  type: CounselingType
  summary: string
  followUpRequired: boolean
  followUpDate: Date | null
  satisfactionScore: number | null
  student: {
    id: string
    name: string
    school: string | null
    grade: number | null
  }
  teacher: {
    id: string
    name: string
    role: string
  }
}

/**
 * 통합 검색 Server Action
 * - 학생 이름, 학부모 이름, 상담 주제를 통합 검색
 * - Prisma OR 쿼리로 다중 필드 검색
 * - RBAC 적용
 */
export async function searchCounselingSessions(
  params: CounselingSearchParams
): Promise<ActionResult<CounselingSearchResult[]>> {
  const session = await verifySession()

  if (!session) {
    return fail('인증되지 않은 요청입니다.')
  }

  const rbacDb = getRBACPrisma(session)

  // 기본 조건
  const where: Prisma.CounselingSessionWhereInput = {}

  // 통합 검색 (학생 이름, 상담 요약)
  if (params.query && params.query.trim()) {
    const query = params.query.trim()
    where.OR = [
      // 학생 이름 검색
      {
        student: {
          name: {
            contains: query,
            mode: 'insensitive',
          },
        },
      },
      // 상담 요약 검색
      {
        summary: {
          contains: query,
          mode: 'insensitive',
        },
      },
    ]
  }

  // 상담 유형 필터
  if (params.type) {
    where.type = params.type
  }

  // 날짜 범위 필터
  if (params.startDate || params.endDate) {
    where.sessionDate = {}
    if (params.startDate) {
      where.sessionDate.gte = new Date(params.startDate)
    }
    if (params.endDate) {
      where.sessionDate.lte = new Date(params.endDate)
    }
  }

  // 선생님 필터 (권한에 따라)
  if (session.role === 'TEACHER') {
    // TEACHER는 자신의 상담만 조회
    where.teacherId = session.userId
  } else if (params.teacherId) {
    // DIRECTOR/TEAM_LEADER는 teacherId로 필터링
    where.teacherId = params.teacherId
  }

  // 후속 조치 필터
  if (params.followUpRequired !== undefined) {
    where.followUpRequired = params.followUpRequired
  }

  try {
    const sessions = await rbacDb.counselingSession.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            school: true,
            grade: true,
          },
        },
        teacher: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: {
        sessionDate: 'desc',
      },
      take: 100,
    })

    return ok(sessions as CounselingSearchResult[])
  } catch (error) {
    logger.error({ err: error }, 'Failed to search counseling sessions')
    return fail('상담 기록 검색 중 오류가 발생했습니다.')
  }
}
