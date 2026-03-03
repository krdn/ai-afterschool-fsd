import { Prisma } from '@/lib/db'
import { db } from '@/lib/db/client'
import { ReservationStatus, CounselingType } from '@/lib/db'

/**
 * 예약 생성 파라미터
 */
export interface CreateReservationParams {
  scheduledAt: Date
  studentId: string
  teacherId: string
  parentId: string
  topic: string
}

/**
 * 예약 목록 조회 파라미터
 */
export interface GetReservationsParams {
  teacherId: string
  studentId?: string
  dateFrom?: Date
  dateTo?: Date
  status?: ReservationStatus
}

/**
 * 트랜잭션 기반 중복 검증과 함께 예약 생성
 *
 * 같은 선생님의 같은 시간대에 이미 예약이 있는지 확인합니다.
 * CANCELLED 상태의 예약은 제외하고 확인합니다.
 *
 * @param params 예약 생성 파라미터
 * @returns 생성된 예약
 * @throws {Error} 같은 선생님의 같은 시간대에 이미 예약이 있는 경우
 */
export async function createReservationWithConflictCheck(
  params: CreateReservationParams
) {
  const { scheduledAt, studentId, teacherId, parentId, topic } = params

  // 예약 시간의 시작과 끝 (30분 간격)
  const slotStart = new Date(scheduledAt)
  const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000) // +30분

  // 트랜잭션으로 중복 검증과 생성 원자성 보장
  return await db.$transaction(async (tx) => {
    // 같은 선생님의 같은 시간대에 있는 예약 확인 (CANCELLED 제외)
    const conflictingReservation = await tx.parentCounselingReservation.findFirst({
      where: {
        teacherId,
        status: {
          not: ReservationStatus.CANCELLED,
        },
        OR: [
          // 새 예약의 시작 시간이 기존 예약 시간대와 겹침
          {
            scheduledAt: {
              gte: slotStart,
              lt: slotEnd,
            },
          },
          // 기존 예약의 시작 시간이 새 예약 시간대와 겹침
          {
            scheduledAt: {
              lt: slotStart,
            },
            counselingSessionId: null, // 완료되지 않은 예약만 확인
          },
        ],
      },
    })

    if (conflictingReservation) {
      throw new Error('이미 해당 시간대에 예약이 있습니다')
    }

    // 충돌이 없으면 예약 생성
    const reservation = await tx.parentCounselingReservation.create({
      data: {
        scheduledAt: slotStart,
        studentId,
        teacherId,
        parentId,
        topic,
        status: ReservationStatus.SCHEDULED,
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
        teacher: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return reservation
  })
}

/**
 * 예약 목록 조회
 * - teacherId로 필터링 (현재 세션 선생님)
 * - 선택적 필터: studentId, dateFrom, dateTo, status
 * - Student, Parent 조인 포함
 * - scheduledAt 기준 내림차순 정렬
 */
export async function getReservations(params: GetReservationsParams) {
  const { teacherId, studentId, dateFrom, dateTo, status } = params

  const where: Prisma.ParentCounselingReservationWhereInput = {
    teacherId,
  }

  // 학생 필터
  if (studentId) {
    where.studentId = studentId
  }

  // 날짜 범위 필터
  if (dateFrom || dateTo) {
    where.scheduledAt = {}
    if (dateFrom) {
      where.scheduledAt.gte = dateFrom
    }
    if (dateTo) {
      where.scheduledAt.lte = dateTo
    }
  }

  // 상태 필터
  if (status) {
    where.status = status
  }

  return db.parentCounselingReservation.findMany({
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
      parent: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          relation: true,
        },
      },
      teacher: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      scheduledAt: 'desc',
    },
  })
}

/**
 * 단일 예약 조회
 * - ID로 예약 상세 조회
 * - 관련 Student, Parent 정보 포함
 */
export async function getReservationById(id: string, teacherId: string) {
  return db.parentCounselingReservation.findUnique({
    where: {
      id,
      teacherId, // 보안: 다른 선생님 예약 접근 방지
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          school: true,
          grade: true,
          phone: true,
          primaryParentId: true,
        },
      },
      parent: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          relation: true,
          note: true,
        },
      },
      counselingSession: {
        select: {
          id: true,
          type: true,
          duration: true,
          summary: true,
          aiSummary: true,
        },
      },
    },
  })
}

/**
 * 예약 수정 파라미터
 */
export interface UpdateReservationParams {
  reservationId: string
  teacherId: string
  scheduledAt?: Date
  studentId?: string
  parentId?: string
  topic?: string
}

/**
 * 예약 수정
 * - 현재 상태가 SCHEDULED인지 확인
 * - 시간 변경 시 중복 검증
 * - 트랜잭션으로 원자적 처리
 *
 * @param params 수정 파라미터
 * @returns 수정된 예약
 * @throws {Error} SCHEDULED 상태가 아닌 경우
 * @throws {Error} 시간 중복인 경우
 */
export async function updateReservation(params: UpdateReservationParams) {
  const { reservationId, teacherId, scheduledAt, studentId, parentId, topic } = params

  return await db.$transaction(async (tx) => {
    // 1. 현재 예약 상태 확인
    const existingReservation = await tx.parentCounselingReservation.findUnique({
      where: {
        id: reservationId,
        teacherId,
      },
    })

    if (!existingReservation) {
      throw new Error('예약을 찾을 수 없습니다')
    }

    if (existingReservation.status !== ReservationStatus.SCHEDULED) {
      throw new Error('이미 완료된 예약은 수정할 수 없습니다')
    }

    // 2. 시간 변경 시 중복 검증
    if (scheduledAt) {
      const slotStart = new Date(scheduledAt)
      const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000)

      const conflictingReservation = await tx.parentCounselingReservation.findFirst({
        where: {
          teacherId,
          status: {
            not: ReservationStatus.CANCELLED,
          },
          id: {
            not: reservationId, // 자기 자신 제외
          },
          OR: [
            {
              scheduledAt: {
                gte: slotStart,
                lt: slotEnd,
              },
            },
            {
              scheduledAt: {
                lt: slotStart,
              },
              counselingSessionId: null,
            },
          ],
        },
      })

      if (conflictingReservation) {
        throw new Error('이미 해당 시간대에 예약이 있습니다')
      }
    }

    // 3. 예약 수정
    const updatedReservation = await tx.parentCounselingReservation.update({
      where: {
        id: reservationId,
        teacherId,
      },
      data: {
        ...(scheduledAt && { scheduledAt }),
        ...(studentId && { studentId }),
        ...(parentId && { parentId }),
        ...(topic && { topic }),
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
        teacher: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return updatedReservation
  })
}

/**
 * 삭제 가능한 예약 상태
 * - SCHEDULED: 아직 시작 전
 * - IN_PROGRESS: 진행 중 (연결된 CounselingSession도 함께 삭제)
 * - CANCELLED: 이미 취소됨
 */
const DELETABLE_STATUSES: ReadonlySet<ReservationStatus> = new Set([
  ReservationStatus.SCHEDULED,
  ReservationStatus.IN_PROGRESS,
  ReservationStatus.CANCELLED,
])

/**
 * 예약 삭제
 * - SCHEDULED, IN_PROGRESS, CANCELLED 상태만 삭제 가능
 * - IN_PROGRESS인 경우 연결된 CounselingSession도 함께 삭제
 * - 트랜잭션으로 원자적 처리
 *
 * @param reservationId 예약 ID
 * @param teacherId 선생님 ID
 * @throws {Error} 삭제 불가능한 상태인 경우
 */
export async function deleteReservation(reservationId: string, teacherId: string) {
  return await db.$transaction(async (tx) => {
    // 1. 현재 예약 상태 확인
    const existingReservation = await tx.parentCounselingReservation.findUnique({
      where: {
        id: reservationId,
        teacherId,
      },
    })

    if (!existingReservation) {
      throw new Error('예약을 찾을 수 없습니다')
    }

    if (!DELETABLE_STATUSES.has(existingReservation.status)) {
      throw new Error('완료되었거나 노쇼 처리된 예약은 삭제할 수 없습니다')
    }

    // 2. 연결된 CounselingSession 삭제 (IN_PROGRESS일 때)
    if (existingReservation.counselingSessionId) {
      await tx.counselingNote.deleteMany({
        where: { counselingSessionId: existingReservation.counselingSessionId },
      })
      // 예약의 FK 해제 후 세션 삭제
      await tx.parentCounselingReservation.update({
        where: { id: reservationId },
        data: { counselingSessionId: null },
      })
      await tx.counselingSession.delete({
        where: { id: existingReservation.counselingSessionId },
      })
    }

    // 3. hard delete
    await tx.parentCounselingReservation.delete({
      where: {
        id: reservationId,
        teacherId,
      },
    })

    return { success: true }
  })
}

/**
 * 상태 전환 파라미터
 */
export interface TransitionReservationStatusParams {
  reservationId: string
  teacherId: string
  newStatus: ReservationStatus
  summary?: string
}

/**
 * 예약 상태 전환
 * - 현재 상태가 SCHEDULED인지 확인
 * - COMPLETED 시 CounselingSession 생성
 * - 트랜잭션으로 원자적 처리
 * - counselingSessionId 연결
 *
 * @param params 상태 전환 파라미터
 * @returns 업데이트된 예약
 * @throws {Error} SCHEDULED 상태가 아닌 경우
 * @throws {Error} 이미 COMPLETED 상태를 다시 변경하려는 경우
 */
export async function transitionReservationStatus(
  params: TransitionReservationStatusParams
) {
  const { reservationId, teacherId, newStatus, summary } = params

  return await db.$transaction(async (tx) => {
    // 1. 현재 예약 상태 확인
    const existingReservation = await tx.parentCounselingReservation.findUnique({
      where: {
        id: reservationId,
        teacherId,
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!existingReservation) {
      throw new Error('예약을 찾을 수 없습니다')
    }

    // 2. 상태 전환 유효성 검사
    if (existingReservation.status !== ReservationStatus.SCHEDULED) {
      throw new Error('이미 완료된 예약은 상태를 변경할 수 없습니다')
    }

    // 3. COMPLETED 전환 시 CounselingSession 생성
    let counselingSessionId: string | null = null

    if (newStatus === ReservationStatus.COMPLETED) {
      // CounselingSession 생성
      const counselingSession = await tx.counselingSession.create({
        data: {
          studentId: existingReservation.studentId,
          teacherId: existingReservation.teacherId,
          sessionDate: existingReservation.scheduledAt,
          duration: 30, // 기본 30분
          type: CounselingType.ACADEMIC, // 기본값
          summary: summary || '',
          followUpRequired: false,
        },
      })

      counselingSessionId = counselingSession.id
    }

    // 4. 예약 상태 업데이트
    const updatedReservation = await tx.parentCounselingReservation.update({
      where: {
        id: reservationId,
        teacherId,
      },
      data: {
        status: newStatus,
        ...(counselingSessionId && { counselingSessionId }),
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
        counselingSession: {
          select: {
            id: true,
            type: true,
            duration: true,
          },
        },
      },
    })

    return updatedReservation
  })
}
