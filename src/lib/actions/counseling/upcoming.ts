'use server'

import { addDays, startOfDay, endOfDay } from 'date-fns'
import { db } from '@/lib/db/client'
import { verifySession } from '@/lib/dal'
import { ok, fail, type ActionResult } from '@/lib/errors/action-result'
import { logger } from "@/lib/logger"

/**
 * 다가오는 상담 데이터 타입
 */
type UpcomingCounselingItem = {
  id: string
  scheduledAt: Date
  student: { id: string; name: string }
  parent: { id: string; name: string; relation: string }
}

/**
 * 다가오는 상담 조회 결과 타입 (ActionResult 기반)
 */
export type UpcomingCounselingResult = ActionResult<UpcomingCounselingItem[]>

/**
 * 다가오는 상담 조회 액션
 * - 오늘부터 7일 이내의 SCHEDULED 상태 예약을 조회합니다
 * - verifySession으로 인증된 사용자의 예약만 조회
 */
export async function getUpcomingCounseling(): Promise<UpcomingCounselingResult> {
  const session = await verifySession()

  if (!session) {
    return fail('인증되지 않은 요청입니다.')
  }

  try {
    const now = new Date()
    const sevenDaysLater = addDays(now, 7)

    const reservations = await db.parentCounselingReservation.findMany({
      where: {
        teacherId: session.userId,
        status: 'SCHEDULED',
        scheduledAt: {
          gte: startOfDay(now),
          lte: endOfDay(sevenDaysLater),
        },
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
            relation: true,
          },
        },
      },
      orderBy: {
        scheduledAt: 'asc',
      },
    })

    return ok(reservations)
  } catch (error) {
    logger.error({ err: error }, 'Failed to get upcoming counseling')
    return fail('다가오는 상담 조회 중 오류가 발생했습니다.')
  }
}
