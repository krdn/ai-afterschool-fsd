'use server'

import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/dal'
import { getRBACPrisma } from '@/lib/db/common/rbac'
import { reservationsRepo } from '@/features/counseling';
const { 
  deleteReservation,
  transitionReservationStatus,
 } = reservationsRepo;
import { ReservationStatus } from '@/lib/db'
import {
  reservationDeleteSchema,
  completeReservationSchema,
} from '@/lib/validations/reservations'
import type {
  DeleteReservationInput,
  CompleteReservationInput,
} from '@/lib/validations/reservations'
import { ok, okVoid, fail, type ActionResult, type ActionVoidResult } from '@/lib/errors/action-result'
import { logger } from "@/lib/logger"

/**
 * 예약 삭제 결과 타입 (ActionVoidResult 기반)
 */
export type DeleteReservationResult = ActionVoidResult

/**
 * 예약 완료 결과 타입 (ActionResult 기반)
 */
export type CompleteReservationResult = ActionResult<{
  id: string
  status: ReservationStatus
  counselingSessionId?: string | null
}>

/**
 * 예약 취소/불참 결과 타입 (ActionResult 기반)
 */
export type CancelReservationResult = ActionResult<{
  id: string
  status: ReservationStatus
}>

/**
 * 예약 삭제 액션
 * - 인증 및 권한 체크
 * - 상태 검증
 * - 삭제 처리
 * - revalidatePath()
 */
export async function deleteReservationAction(
  input: DeleteReservationInput
): Promise<DeleteReservationResult> {
  // 1. 인증 체크
  const session = await verifySession()

  if (!session) {
    return fail('인증되지 않은 요청입니다.')
  }

  // 2. Zod 스키마 검증
  const validationResult = reservationDeleteSchema.safeParse(input)

  if (!validationResult.success) {
    return fail('잘못된 요청입니다.')
  }

  const { reservationId } = validationResult.data

  // 3. RBAC Prisma Client 생성
  const rbacDb = getRBACPrisma(session)

  try {
    // 4. 기존 예약 조회 (캐시 무효화를 위해 studentId 필요)
    const existingReservation = await rbacDb.parentCounselingReservation.findUnique({
      where: {
        id: reservationId,
        teacherId: session.userId,
      },
      select: {
        id: true,
        studentId: true,
        status: true,
      },
    })

    if (!existingReservation) {
      return fail('예약을 찾을 수 없습니다.')
    }

    // 5. 예약 삭제
    await deleteReservation(reservationId, session.userId)

    // 6. 캐시 무효화
    revalidatePath('/counseling')
    revalidatePath(`/students/${existingReservation.studentId}`)

    return okVoid()
  } catch (error) {
    logger.error({ err: error }, 'Failed to delete reservation')

    // 에러 메시지 처리
    if (error instanceof Error) {
      if (error.message === '완료되었거나 노쇼 처리된 예약은 삭제할 수 없습니다') {
        return fail(error.message)
      }
    }

    return fail('예약 삭제 중 오류가 발생했습니다.')
  }
}

/**
 * 예약 완료 액션
 * - 인증 및 권한 체크
 * - Zod 검증
 * - COMPLETED로 상태 변경 + CounselingSession 생성
 * - revalidatePath()
 */
export async function completeReservationAction(
  input: CompleteReservationInput
): Promise<CompleteReservationResult> {
  // 1. 인증 체크
  const session = await verifySession()

  if (!session) {
    return fail('인증되지 않은 요청입니다.')
  }

  // 2. Zod 스키마 검증
  const validationResult = completeReservationSchema.safeParse(input)

  if (!validationResult.success) {
    return fail('잘못된 요청입니다.')
  }

  const { reservationId, summary } = validationResult.data

  // 3. RBAC Prisma Client 생성
  const rbacDb = getRBACPrisma(session)

  try {
    // 4. 예약 접근 권한 확인
    const existingReservation = await rbacDb.parentCounselingReservation.findUnique({
      where: {
        id: reservationId,
        teacherId: session.userId,
      },
      select: {
        id: true,
        studentId: true,
        status: true,
      },
    })

    if (!existingReservation) {
      return fail('예약을 찾을 수 없습니다.')
    }

    // 5. 상태 전환 (COMPLETED + CounselingSession 생성)
    const updatedReservation = await transitionReservationStatus({
      reservationId,
      teacherId: session.userId,
      newStatus: ReservationStatus.COMPLETED,
      summary,
    })

    // 6. 캐시 무효화
    revalidatePath('/counseling')
    revalidatePath(`/students/${existingReservation.studentId}`)

    return ok({
      id: updatedReservation.id,
      status: updatedReservation.status,
      counselingSessionId: updatedReservation.counselingSessionId,
    })
  } catch (error) {
    logger.error({ err: error }, 'Failed to complete reservation')

    // 에러 메시지 처리
    if (error instanceof Error) {
      if (error.message === '이미 완료된 예약은 상태를 변경할 수 없습니다') {
        return fail(error.message)
      }
    }

    return fail('예약 완료 처리 중 오류가 발생했습니다.')
  }
}

/**
 * 예약 취소 액션
 * - 인증 및 권한 체크
 * - CANCELLED로 상태 변경 (세션 생성 없음)
 * - revalidatePath()
 */
export async function cancelReservationAction(
  reservationId: string
): Promise<CancelReservationResult> {
  // 1. 인증 체크
  const session = await verifySession()

  if (!session) {
    return fail('인증되지 않은 요청입니다.')
  }

  // 2. RBAC Prisma Client 생성
  const rbacDb = getRBACPrisma(session)

  try {
    // 3. 예약 접근 권한 확인
    const existingReservation = await rbacDb.parentCounselingReservation.findUnique({
      where: {
        id: reservationId,
        teacherId: session.userId,
      },
      select: {
        id: true,
        studentId: true,
        status: true,
      },
    })

    if (!existingReservation) {
      return fail('예약을 찾을 수 없습니다.')
    }

    // 4. 상태 전환 (CANCELLED)
    const updatedReservation = await transitionReservationStatus({
      reservationId,
      teacherId: session.userId,
      newStatus: ReservationStatus.CANCELLED,
    })

    // 5. 캐시 무효화
    revalidatePath('/counseling')
    revalidatePath(`/students/${existingReservation.studentId}`)

    return ok({
      id: updatedReservation.id,
      status: updatedReservation.status,
    })
  } catch (error) {
    logger.error({ err: error }, 'Failed to cancel reservation')

    // 에러 메시지 처리
    if (error instanceof Error) {
      if (error.message === '이미 완료된 예약은 상태를 변경할 수 없습니다') {
        return fail(error.message)
      }
    }

    return fail('예약 취소 처리 중 오류가 발생했습니다.')
  }
}

/**
 * 예약 불참 액션
 * - 인증 및 권한 체크
 * - NO_SHOW로 상태 변경 (세션 생성 없음)
 * - revalidatePath()
 */
export async function markNoShowAction(
  reservationId: string
): Promise<CancelReservationResult> {
  // 1. 인증 체크
  const session = await verifySession()

  if (!session) {
    return fail('인증되지 않은 요청입니다.')
  }

  // 2. RBAC Prisma Client 생성
  const rbacDb = getRBACPrisma(session)

  try {
    // 3. 예약 접근 권한 확인
    const existingReservation = await rbacDb.parentCounselingReservation.findUnique({
      where: {
        id: reservationId,
        teacherId: session.userId,
      },
      select: {
        id: true,
        studentId: true,
        status: true,
      },
    })

    if (!existingReservation) {
      return fail('예약을 찾을 수 없습니다.')
    }

    // 4. 상태 전환 (NO_SHOW)
    const updatedReservation = await transitionReservationStatus({
      reservationId,
      teacherId: session.userId,
      newStatus: ReservationStatus.NO_SHOW,
    })

    // 5. 캐시 무효화
    revalidatePath('/counseling')
    revalidatePath(`/students/${existingReservation.studentId}`)

    return ok({
      id: updatedReservation.id,
      status: updatedReservation.status,
    })
  } catch (error) {
    logger.error({ err: error }, 'Failed to mark no-show')

    // 에러 메시지 처리
    if (error instanceof Error) {
      if (error.message === '이미 완료된 예약은 상태를 변경할 수 없습니다') {
        return fail(error.message)
      }
    }

    return fail('예약 불참 처리 중 오류가 발생했습니다.')
  }
}
