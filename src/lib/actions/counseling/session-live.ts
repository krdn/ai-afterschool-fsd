'use server'

import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/dal'
import { getRBACPrisma } from '@/lib/db/common/rbac'
import { db } from '@/lib/db/client'
import { ReservationStatus } from '@/lib/db'
import { ok, fail, type ActionResult } from '@/lib/errors/action-result'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// startSessionAction — 상담 세션 시작
// ---------------------------------------------------------------------------

export type StartSessionResult = {
  sessionId: string
  reservationId: string
}

/**
 * 예약 상태를 IN_PROGRESS로 전환하고 상담 세션을 준비한다.
 *
 * 트랜잭션:
 * 1. Wizard 예약(counselingSessionId 있음) → 기존 세션 ID 사용
 * 2. 일반 예약 → 새 CounselingSession 생성 (기본값)
 * 3. 예약 상태 SCHEDULED → IN_PROGRESS, counselingSessionId 연결
 */
export async function startSessionAction(
  reservationId: string
): Promise<ActionResult<StartSessionResult>> {
  const session = await verifySession()
  if (!session) return fail('인증되지 않은 요청입니다.')

  const rbacDb = getRBACPrisma(session)

  try {
    // 예약 접근 권한 확인 (teacherId 필터)
    const reservation = await rbacDb.parentCounselingReservation.findUnique({
      where: { id: reservationId, teacherId: session.userId },
      include: {
        counselingSession: true,
        student: true,
      },
    })

    if (!reservation) return fail('예약을 찾을 수 없습니다.')
    if (reservation.status !== ReservationStatus.SCHEDULED) {
      return fail('SCHEDULED 상태의 예약만 시작할 수 있습니다.')
    }

    // 트랜잭션: CounselingSession 생성/재사용 + 예약 상태 변경
    const result = await db.$transaction(async (tx) => {
      let sessionId: string

      if (reservation.counselingSessionId) {
        // Wizard로 생성된 예약: 기존 세션 ID 사용
        sessionId = reservation.counselingSessionId
      } else {
        // 일반 예약: 새 CounselingSession 생성 (기본값)
        const newSession = await tx.counselingSession.create({
          data: {
            studentId: reservation.studentId,
            teacherId: session.userId,
            sessionDate: reservation.scheduledAt,
            duration: 0,
            type: 'ACADEMIC',
            summary: '',
          },
        })
        sessionId = newSession.id
      }

      // 예약 상태 IN_PROGRESS로 변경 + counselingSessionId 연결
      await tx.parentCounselingReservation.update({
        where: { id: reservationId },
        data: {
          status: ReservationStatus.IN_PROGRESS,
          counselingSessionId: sessionId,
        },
      })

      return { sessionId, reservationId }
    })

    revalidatePath('/counseling')

    return ok(result)
  } catch (error) {
    logger.error({ err: error }, 'Failed to start counseling session')
    return fail('상담 시작 처리 중 오류가 발생했습니다.')
  }
}

// ---------------------------------------------------------------------------
// getSessionWithNotesAction — 예약 + 세션 + 노트 조회
// ---------------------------------------------------------------------------

export type SessionWithNotes = {
  id: string
  scheduledAt: Date
  topic: string
  status: string
  student: {
    id: string
    name: string
    grade: number
    teamId: string | null
  }
  parent: {
    id: string
    name: string
    phone: string
  }
  counselingSession: {
    id: string
    sessionDate: Date
    duration: number
    type: string
    summary: string
    aiSummary: string | null
    followUpRequired: boolean
    followUpDate: Date | null
    satisfactionScore: number | null
    notes: {
      id: string
      content: string
      memo: string | null
      checked: boolean
      order: number
      source: string
      createdAt: Date
    }[]
  } | null
}

/**
 * 예약 ID로 예약 + 세션 + 노트 목록을 조회한다.
 * 교사 본인의 예약만 접근 가능 (teacherId 필터).
 */
export async function getSessionWithNotesAction(
  reservationId: string
): Promise<ActionResult<SessionWithNotes>> {
  const session = await verifySession()
  if (!session) return fail('인증되지 않은 요청입니다.')

  const rbacDb = getRBACPrisma(session)

  try {
    const reservation = await rbacDb.parentCounselingReservation.findUnique({
      where: { id: reservationId, teacherId: session.userId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            grade: true,
            teamId: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        counselingSession: {
          include: {
            notes: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    })

    if (!reservation) return fail('예약을 찾을 수 없습니다.')

    return ok(reservation as SessionWithNotes)
  } catch (error) {
    logger.error({ err: error }, 'Failed to get session with notes')
    return fail('상담 정보 조회 중 오류가 발생했습니다.')
  }
}
