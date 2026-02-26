'use server'

import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/dal'
import { getRBACPrisma } from '@/lib/db/common/rbac'
import { db } from '@/lib/db/client'
import { ReservationStatus } from '@/lib/db'
import { completeWithRecordSchema } from '@/lib/validations/reservations'
import type { CompleteWithRecordInput } from '@/lib/validations/reservations'
import { ok, fail, fieldError, type ActionResult } from '@/lib/errors/action-result'
import { logger } from '@/lib/logger'

type CompleteWithRecordResult = ActionResult<{
  reservationId: string
  counselingSessionId: string
}>

/**
 * 예약 완료 + 상담 기록 동시 저장
 *
 * 기존 completeReservationAction과 달리 교사가 입력한
 * 상담 유형/시간/내용/만족도/후속 조치를 CounselingSession에 반영한다.
 *
 * 트랜잭션:
 * 1. 예약 상태 SCHEDULED 확인
 * 2. CounselingSession 생성 또는 업데이트 (교사 입력값 반영)
 * 3. 예약 상태 → COMPLETED + counselingSessionId 연결
 */
export async function completeWithRecordAction(
  input: CompleteWithRecordInput
): Promise<CompleteWithRecordResult> {
  const session = await verifySession()
  if (!session) return fail('인증되지 않은 요청입니다.')

  const parsed = completeWithRecordSchema.safeParse(input)
  if (!parsed.success) {
    return fieldError(parsed.error.flatten().fieldErrors as Record<string, string[]>)
  }

  const {
    reservationId, type, duration, summary,
    aiSummary, followUpRequired, followUpDate, satisfactionScore,
  } = parsed.data

  const rbacDb = getRBACPrisma(session)

  try {
    // 예약 접근 권한 확인
    const reservation = await rbacDb.parentCounselingReservation.findUnique({
      where: { id: reservationId, teacherId: session.userId },
      select: {
        id: true,
        studentId: true,
        status: true,
        scheduledAt: true,
        counselingSessionId: true,
      },
    })

    if (!reservation) return fail('예약을 찾을 수 없습니다.')
    if (reservation.status !== ReservationStatus.SCHEDULED) {
      return fail('이미 완료된 예약은 상태를 변경할 수 없습니다.')
    }

    // 트랜잭션: CounselingSession 생성/업데이트 + 예약 상태 변경
    const result = await db.$transaction(async (tx) => {
      let counselingSessionId: string

      if (reservation.counselingSessionId) {
        // Wizard로 생성된 예약: 기존 세션 업데이트
        await tx.counselingSession.update({
          where: { id: reservation.counselingSessionId },
          data: {
            duration,
            type,
            summary,
            ...(aiSummary !== undefined && { aiSummary }),
            followUpRequired,
            ...(followUpDate && { followUpDate: new Date(followUpDate) }),
            ...(satisfactionScore !== undefined && { satisfactionScore }),
          },
        })
        counselingSessionId = reservation.counselingSessionId
      } else {
        // 일반 예약: 새 세션 생성
        const newSession = await tx.counselingSession.create({
          data: {
            studentId: reservation.studentId,
            teacherId: session.userId,
            sessionDate: reservation.scheduledAt,
            duration,
            type,
            summary,
            aiSummary: aiSummary || null,
            followUpRequired,
            ...(followUpDate && { followUpDate: new Date(followUpDate) }),
            ...(satisfactionScore !== undefined && { satisfactionScore }),
          },
        })
        counselingSessionId = newSession.id
      }

      // 예약 상태 COMPLETED로 변경
      await tx.parentCounselingReservation.update({
        where: { id: reservationId },
        data: {
          status: ReservationStatus.COMPLETED,
          counselingSessionId,
        },
      })

      return { reservationId, counselingSessionId }
    })

    revalidatePath('/counseling')
    revalidatePath(`/students/${reservation.studentId}`)

    return ok(result)
  } catch (error) {
    logger.error({ err: error }, 'Failed to complete reservation with record')
    return fail('상담 완료 처리 중 오류가 발생했습니다.')
  }
}
