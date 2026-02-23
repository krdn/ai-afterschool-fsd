'use server';

import { revalidatePath } from 'next/cache';
import { verifySession } from '@/lib/dal';
import { getRBACPrisma } from '@/lib/db/common/rbac';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  isBefore,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { Prisma } from '@/lib/db';
import type {
  FollowUpFilter,
  FollowUpItem,
  FollowUpStatus,
  CompleteFollowUpInput,
} from '@/types/follow-up';
import { ok, fail, type ActionResult } from '@/lib/errors/action-result';

/**
 * 후속 조치 목록 조회
 *
 * @param filter - 필터 옵션 (scope, includeCompleted, teacherId)
 * @returns 후속 조치 목록
 */
export async function getFollowUpsAction(filter: FollowUpFilter): Promise<ActionResult<FollowUpItem[]>> {
  const session = await verifySession();

  if (!session) {
    return fail('인증되지 않은 요청입니다.');
  }

  try {
    const db = await getRBACPrisma(session);
    const today = new Date();

    // 날짜 범위 계산
    let dateFrom: Date | undefined;
    let dateTo: Date | undefined;

    if (filter.scope === 'today') {
      dateFrom = startOfDay(today);
      dateTo = endOfDay(today);
    } else if (filter.scope === 'week') {
      dateFrom = startOfWeek(today, { locale: ko });
      dateTo = endOfWeek(today, { locale: ko });
    }
    // 'all'인 경우 날짜 필터 없음

    // 쿼리 조건 구성
    const whereConditions: Prisma.CounselingSessionWhereInput = {
      followUpRequired: true,
    };

    // 날짜 범위 필터 (scope: today/week)
    if (dateFrom && dateTo) {
      whereConditions.followUpDate = {
        gte: dateFrom,
        lte: dateTo,
      };
    }

    // 완료 여부 필터
    if (!filter.includeCompleted) {
      whereConditions.satisfactionScore = null; // satisfactionScore가 null이면 미완료로 간주
    }

    // 선생님 필터
    if (filter.teacherId) {
      whereConditions.teacherId = filter.teacherId;
    }

    // 후속 조치 목록 조회
    const sessions = await db.counselingSession.findMany({
      where: whereConditions,
      include: {
        student: {
          select: {
            id: true,
            name: true,
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
        followUpDate: 'asc', // 마감일 임박순
      },
    });

    // FollowUpItem으로 변환 및 상태 계산
    const followUpItems: FollowUpItem[] = sessions.map((session) => {
      let status: FollowUpStatus;
      const followUpDate = session.followUpDate!;

      if (session.satisfactionScore !== null) {
        status = 'completed';
      } else if (isBefore(followUpDate, today)) {
        status = 'overdue';
      } else {
        status = 'pending';
      }

      return {
        id: session.id,
        studentId: session.studentId,
        studentName: session.student.name,
        teacherId: session.teacherId,
        teacherName: session.teacher.name,
        sessionDate: session.sessionDate,
        followUpDate: followUpDate,
        summary: session.summary,
        status,
        completedAt: status === 'completed' ? session.updatedAt : undefined,
        completionNote: undefined, // 기존 스키마에 없으므로 undefined
      };
    });

    return ok(followUpItems);
  } catch (error) {
    console.error('Failed to get follow-ups:', error);
    return fail('후속 조치 목록 조회 중 오류가 발생했습니다.');
  }
}

/**
 * 후속 조치 완료 처리
 *
 * @param input - 완료 처리 입력 (sessionId, completionNote)
 * @returns 완료 처리 결과
 */
export async function completeFollowUpAction(input: CompleteFollowUpInput): Promise<ActionResult<{ id: string; completedAt: Date }>> {
  const session = await verifySession();

  if (!session) {
    return fail('인증되지 않은 요청입니다.');
  }

  try {
    const db = await getRBACPrisma(session);

    // 해당 세션 조회 및 권한 확인
    const counselingSession = await db.counselingSession.findUnique({
      where: { id: input.sessionId },
      select: { id: true, teacherId: true },
    });

    if (!counselingSession) {
      return fail('상담 세션을 찾을 수 없습니다.');
    }

    // 권한 확인: 해당 세션의 teacherId와 현재 사용자 일치 확인
    if (counselingSession.teacherId !== session.userId) {
      return fail('해당 후속 조치를 완료할 권한이 없습니다.');
    }

    // 완료 처리: satisfactionScore를 임시값(1)으로 설정
    // Note: 기존 스키마에 followUpCompleted 필드가 없으므로,
    //       satisfactionScore !== null을 완료 기준으로 사용
    const updatedSession = await db.counselingSession.update({
      where: { id: input.sessionId },
      data: {
        satisfactionScore: 1, // 임시값 (후속 조치 완료 표시용)
      },
      select: {
        id: true,
        updatedAt: true,
      },
    });

    revalidatePath('/dashboard/statistics');

    return ok({
      id: updatedSession.id,
      completedAt: updatedSession.updatedAt,
    });
  } catch (error) {
    console.error('Failed to complete follow-up:', error);
    return fail('후속 조치 완료 처리 중 오류가 발생했습니다.');
  }
}

/**
 * 지연된 후속 조치 개수 조회
 *
 * @returns 지연 개수
 */
export async function getOverdueCountAction(): Promise<ActionResult<{ count: number }>> {
  const session = await verifySession();

  if (!session) {
    return fail('인증되지 않은 요청입니다.');
  }

  try {
    const db = await getRBACPrisma(session);
    const today = new Date();

    // 지연된 후속 조치 개수 조회
    const count = await db.counselingSession.count({
      where: {
        followUpRequired: true,
        followUpDate: {
          lt: today, // 오늘보다 이전
        },
        satisfactionScore: null, // 미완료
      },
    });

    return ok({ count });
  } catch (error) {
    console.error('Failed to get overdue count:', error);
    return fail('지연 개수 조회 중 오류가 발생했습니다.');
  }
}
