'use server'

import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/dal'
import { getRBACPrisma } from '@/lib/db/common/rbac'
import { reservationsRepo } from '@/features/counseling';
const { 
  createReservationWithConflictCheck,
  updateReservation,
 } = reservationsRepo;
import {
  createReservationSchema,
  reservationUpdateSchema,
} from '@/lib/validations/reservations'
import type {
  CreateReservationInput,
  UpdateReservationInput,
} from '@/lib/validations/reservations'
import { ok, fail, fieldError, type ActionResult } from '@/lib/errors/action-result'

/**
 * 예약 데이터 타입
 */
type ReservationData = {
  id: string
  scheduledAt: Date
  student: { id: string; name: string }
  parent: { id: string; name: string; relation: string }
  teacher: { id: string; name: string }
}

/**
 * 예약 생성 결과 타입 (ActionResult 기반)
 */
export type CreateReservationResult = ActionResult<ReservationData>

// 조회/상태 관련 액션은 각 파일에서 직접 import
// - reservations-query.ts: getReservationsAction, getReservationByIdAction, getReservationStatsAction
// - reservations-status.ts: deleteReservationAction, completeReservationAction, cancelReservationAction, markNoShowAction

/**
 * 예약 생성 액션
 * - verifySession() 인증 체크
 * - Zod 스키마 검증
 * - TEACHER 역할 시 RBAC 체크 (getRBACPrisma)
 * - createReservationWithConflictCheck() 호출
 * - revalidatePath()로 캐시 무효화
 * - { success, error? } 형식 응답
 */
export async function createReservationAction(
  input: CreateReservationInput
): Promise<CreateReservationResult> {
  // 1. 인증 체크
  const session = await verifySession()

  // 2. Zod 스키마 검증
  const validationResult = createReservationSchema.safeParse(input)

  if (!validationResult.success) {
    return fieldError(validationResult.error.flatten().fieldErrors as Record<string, string[]>)
  }

  const { scheduledAt, studentId, parentId, topic } = validationResult.data

  // 3. RBAC Prisma Client 생성 (TEACHER 역할 시 팀 필터링 적용)
  const rbacDb = getRBACPrisma(session)

  try {
    // 4. 학생 접근 권한 확인 (TEACHER는 자신 팀 학생만 예약 가능)
    const student = await rbacDb.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        name: true,
        primaryParentId: true,
      },
    })

    if (!student) {
      return fail('학생을 찾을 수 없습니다.')
    }

    // 5. 학부모 검증 (해당 학생의 학부모인지 확인)
    const parent = await rbacDb.parent.findFirst({
      where: {
        id: parentId,
        studentId: studentId,
      },
    })

    if (!parent) {
      return fail('학부모를 찾을 수 없습니다.')
    }

    // 6. 중복 검증과 함께 예약 생성
    const reservation = await createReservationWithConflictCheck({
      scheduledAt: new Date(scheduledAt),
      studentId,
      teacherId: session.userId,
      parentId,
      topic,
    })

    // 7. 캐시 무효화
    revalidatePath('/reservations')
    revalidatePath(`/students/${studentId}`)

    return ok({
      id: reservation.id,
      scheduledAt: reservation.scheduledAt,
      student: reservation.student,
      parent: reservation.parent,
      teacher: reservation.teacher,
    })
  } catch (error) {
    console.error('Failed to create reservation:', error)

    // 중복 에러 처리
    if (error instanceof Error && error.message === '이미 해당 시간대에 예약이 있습니다') {
      return fail(error.message)
    }

    return fail('예약 생성 중 오류가 발생했습니다.')
  }
}

/**
 * 예약 수정 결과 타입 (ActionResult 기반)
 */
export type UpdateReservationResult = ActionResult<ReservationData>

/**
 * 예약 수정 액션
 * - 인증 및 권한 체크
 * - Zod 검증
 * - RBAC 체크
 * - updateReservation() 호출
 * - revalidatePath()
 */
export async function updateReservationAction(
  input: UpdateReservationInput & { reservationId: string }
): Promise<UpdateReservationResult> {
  // 1. 인증 체크
  const session = await verifySession()

  if (!session) {
    return fail('인증되지 않은 요청입니다.')
  }

  // 2. Zod 스키마 검증
  const validationResult = reservationUpdateSchema.safeParse(input)

  if (!validationResult.success) {
    return fieldError(validationResult.error.flatten().fieldErrors as Record<string, string[]>)
  }

  const { reservationId, scheduledAt, studentId, parentId, topic } =
    validationResult.data

  // 3. RBAC Prisma Client 생성
  const rbacDb = getRBACPrisma(session)

  try {
    // 4. 기존 예약 조회
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

    // 5. 학생 변경 시 권한 확인
    if (studentId && studentId !== existingReservation.studentId) {
      const student = await rbacDb.student.findUnique({
        where: { id: studentId },
        select: { id: true, name: true, primaryParentId: true },
      })

      if (!student) {
        return fail('학생을 찾을 수 없습니다.')
      }
    }

    // 6. 학부모 변경 시 검증
    const targetStudentId = studentId || existingReservation.studentId
    if (parentId) {
      const parent = await rbacDb.parent.findFirst({
        where: {
          id: parentId,
          studentId: targetStudentId,
        },
      })

      if (!parent) {
        return fail('학부모를 찾을 수 없습니다.')
      }
    }

    // 7. 예약 수정
    const updatedReservation = await updateReservation({
      reservationId,
      teacherId: session.userId,
      ...(scheduledAt && { scheduledAt: new Date(scheduledAt) }),
      ...(studentId && { studentId }),
      ...(parentId && { parentId }),
      ...(topic && { topic }),
    })

    // 8. 캐시 무효화
    revalidatePath('/reservations')
    revalidatePath(`/reservations/${reservationId}`)
    revalidatePath(`/students/${targetStudentId}`)

    return ok({
      id: updatedReservation.id,
      scheduledAt: updatedReservation.scheduledAt,
      student: updatedReservation.student,
      parent: updatedReservation.parent,
      teacher: updatedReservation.teacher,
    })
  } catch (error) {
    console.error('Failed to update reservation:', error)

    // 에러 메시지 처리
    if (error instanceof Error) {
      if (error.message === '이미 완료된 예약은 수정할 수 없습니다') {
        return fail(error.message)
      }
      if (error.message === '이미 해당 시간대에 예약이 있습니다') {
        return fail(error.message)
      }
    }

    return fail('예약 수정 중 오류가 발생했습니다.')
  }
}
