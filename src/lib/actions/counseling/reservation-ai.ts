'use server'

import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/dal'
import { getRBACPrisma } from '@/lib/db/common/rbac'
import { db } from '@/lib/db/client'
import { okVoid, fail, type ActionVoidResult } from '@/lib/errors/action-result'
import { logger } from '@/lib/logger'

/**
 * 예약에 연결된 CounselingSession의 aiSummary를 무효화(null)
 *
 * 예약 수정 시 학생이나 주제가 변경되면 기존 AI 보고서가
 * 더 이상 유효하지 않으므로 삭제한다.
 */
export async function invalidateAiSummaryAction(
  reservationId: string
): Promise<ActionVoidResult> {
  const session = await verifySession()
  if (!session) return fail('인증되지 않은 요청입니다.')

  const rbacDb = getRBACPrisma(session)

  try {
    // 예약 조회 (소유권 확인 + counselingSessionId)
    const reservation = await rbacDb.parentCounselingReservation.findUnique({
      where: { id: reservationId, teacherId: session.userId },
      select: { id: true, studentId: true, counselingSessionId: true },
    })

    if (!reservation) return fail('예약을 찾을 수 없습니다.')

    // counselingSession이 없으면 무효화할 대상 없음
    if (!reservation.counselingSessionId) return okVoid()

    // aiSummary를 null로 업데이트
    await db.counselingSession.update({
      where: { id: reservation.counselingSessionId },
      data: { aiSummary: null },
    })

    revalidatePath('/counseling')
    revalidatePath(`/students/${reservation.studentId}`)

    return okVoid()
  } catch (error) {
    logger.error({ err: error }, 'Failed to invalidate AI summary')
    return fail('AI 보고서 무효화 중 오류가 발생했습니다.')
  }
}
