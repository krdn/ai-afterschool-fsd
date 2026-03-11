'use server'

import { db } from '@/lib/db/client'
import { verifySession } from '@/lib/dal'
import type { GetReservationsParams } from '@/features/counseling';
import { reservationsRepo } from '@/features/counseling';
const {
  getReservations,
  getReservationById
} = reservationsRepo;
import { ReservationStatus } from '@/lib/db'
import { ok, fail, type ActionResult } from '@/lib/errors/action-result'
import { logger } from "@/lib/logger"

/**
 * 예약 목록 조회 액션
 * - 인증 체크
 * - TEACHER 역할 시 자신 예약만 조회
 * - 검색 파라미터 전달
 */
export async function getReservationsAction(params: {
  studentId?: string
  dateFrom?: string
  dateTo?: string
  status?: ReservationStatus
}): Promise<ActionResult<Awaited<ReturnType<typeof getReservations>>>> {
  const session = await verifySession()

  if (!session) {
    return fail('인증되지 않은 요청입니다.')
  }

  try {
    // 날짜 파싱
    const dateFrom = params.dateFrom ? new Date(params.dateFrom) : undefined
    const dateTo = params.dateTo ? new Date(params.dateTo) : undefined

    // 조회 파라미터 구성: DIRECTOR는 전체 예약, 나머지는 자신 예약만
    const getParams: GetReservationsParams = {
      teacherId: session.role === "DIRECTOR" ? undefined : session.userId,
      studentId: params.studentId,
      dateFrom,
      dateTo,
      status: params.status,
    }

    const reservations = await getReservations(getParams)

    return ok(reservations)
  } catch (error) {
    logger.error({ err: error }, 'Failed to get reservations')
    return fail('예약 목록 조회 중 오류가 발생했습니다.')
  }
}

/**
 * 단일 예약 조회 액션
 * - 인증 및 권한 체크
 * - 예약 데이터 반환
 */
export async function getReservationByIdAction(id: string): Promise<ActionResult<NonNullable<Awaited<ReturnType<typeof getReservationById>>>>> {
  const session = await verifySession()

  if (!session) {
    return fail('인증되지 않은 요청입니다.')
  }

  try {
    const reservation = await getReservationById(id, session.userId)

    if (!reservation) {
      return fail('예약을 찾을 수 없습니다.')
    }

    return ok(reservation)
  } catch (error) {
    logger.error({ err: error }, 'Failed to get reservation')
    return fail('예약 조회 중 오류가 발생했습니다.')
  }
}

/**
 * 예약 상태별 개수 조회 액션
 * - 대시보드용 통계
 */
export async function getReservationStatsAction(): Promise<ActionResult<Record<ReservationStatus, number>>> {
  const session = await verifySession()

  if (!session) {
    return fail('인증되지 않은 요청입니다.')
  }

  try {
    const stats = await db.parentCounselingReservation.groupBy({
      by: ['status'],
      where: {
        // DIRECTOR는 전체 예약 통계, 나머지는 자신 예약만
        ...(session.role === "DIRECTOR" ? {} : { teacherId: session.userId }),
      },
      _count: {
        status: true,
      },
    })

    // 상태별 개수를 객체로 변환
    const statsMap: Record<ReservationStatus, number> = {
      SCHEDULED: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      NO_SHOW: 0,
    }

    for (const stat of stats) {
      statsMap[stat.status as ReservationStatus] = stat._count.status
    }

    return ok(statsMap)
  } catch (error) {
    logger.error({ err: error }, 'Failed to get reservation stats')
    return fail('예약 통계 조회 중 오류가 발생했습니다.')
  }
}
