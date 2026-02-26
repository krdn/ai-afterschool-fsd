'use server';

import { db as prisma } from '@/lib/db/client';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { StudyTaskType } from '@/lib/db';
import { getCurrentTeacher } from '@/lib/dal';
import { ok, fail, okVoid, type ActionResult, type ActionVoidResult } from '@/lib/errors/action-result';
import { logger } from '@/lib/logger';
import { addStudyLog, getStudyLogs, getStudyStats, type StudyStats } from '@/features/grade-management/study-habits/study-log-service';
import { analyzeStudyHabits } from '@/features/grade-management/study-habits/habit-analyzer';
import type { StudyHabitCorrelation } from '@/features/grade-management/types';

// 빈 문자열을 undefined로 변환
const emptyToUndefined = (value: unknown) =>
  value === '' || value === null ? undefined : value;

// 학습 기록 입력 스키마
const StudyLogSchema = z.object({
  studentId: z.string().min(1, '학생 ID가 필요합니다.'),
  studyDate: z.coerce.date(),
  subject: z.preprocess(emptyToUndefined, z.string().optional()),
  durationMin: z.coerce.number().int().min(1, '최소 1분 이상 입력해주세요.').max(720, '최대 12시간까지 입력 가능합니다.'),
  taskType: z.nativeEnum(StudyTaskType),
  notes: z.preprocess(emptyToUndefined, z.string().max(500).optional()),
});

/**
 * 학습 기록 추가 Server Action
 */
export async function addStudyLogAction(
  prevState: unknown,
  formData: FormData
): Promise<{ success: boolean; message: string }> {
  try {
    const teacher = await getCurrentTeacher();

    const rawData = {
      studentId: formData.get('studentId'),
      studyDate: formData.get('studyDate'),
      subject: formData.get('subject'),
      durationMin: formData.get('durationMin'),
      taskType: formData.get('taskType'),
      notes: formData.get('notes'),
    };

    const validated = StudyLogSchema.parse(rawData);

    await addStudyLog(
      validated.studentId,
      {
        studyDate: validated.studyDate,
        subject: validated.subject,
        durationMin: validated.durationMin,
        taskType: validated.taskType,
        notes: validated.notes,
      },
      teacher.id
    );

    revalidatePath(`/grades/${validated.studentId}`);
    return { success: true, message: '학습 기록이 등록되었습니다.' };
  } catch (error) {
    if (
      error instanceof Error &&
      'digest' in error &&
      typeof (error as { digest?: string }).digest === 'string' &&
      (error as { digest: string }).digest.startsWith('NEXT_REDIRECT')
    ) {
      throw error;
    }
    logger.error({ err: error }, '학습 기록 등록 실패');
    const message = error instanceof z.ZodError
      ? error.issues.map((e: z.ZodIssue) => e.message).join(', ')
      : '학습 기록 등록 중 오류가 발생했습니다.';
    return { success: false, message };
  }
}

/**
 * 학습 기록 조회 Server Action
 */
export async function getStudyLogsAction(
  studentId: string
): Promise<ActionResult<Awaited<ReturnType<typeof getStudyLogs>>>> {
  try {
    await getCurrentTeacher();
    const logs = await getStudyLogs(studentId);
    return ok(logs);
  } catch (error) {
    logger.error({ err: error, studentId }, '학습 기록 조회 실패');
    return fail('학습 기록을 불러오는 중 오류가 발생했습니다.');
  }
}

/**
 * 학습 기록 삭제 Server Action
 */
export async function deleteStudyLogAction(
  id: string,
  studentId: string
): Promise<ActionVoidResult> {
  try {
    await getCurrentTeacher();

    await prisma.studyLog.delete({
      where: { id },
    });

    revalidatePath(`/grades/${studentId}`);
    return okVoid();
  } catch (error) {
    logger.error({ err: error, id, studentId }, '학습 기록 삭제 실패');
    return fail('학습 기록 삭제에 실패했습니다.');
  }
}

/**
 * 학습 통계 조회 Server Action
 */
export async function getStudyStatsAction(
  studentId: string,
  periodDays?: number
): Promise<ActionResult<StudyStats>> {
  try {
    await getCurrentTeacher();
    const stats = await getStudyStats(studentId, periodDays);
    return ok(stats);
  } catch (error) {
    logger.error({ err: error, studentId }, '학습 통계 조회 실패');
    return fail('학습 통계를 불러오는 중 오류가 발생했습니다.');
  }
}

/**
 * 학습 습관 분석 Server Action
 */
export async function analyzeStudyHabitsAction(
  studentId: string
): Promise<ActionResult<StudyHabitCorrelation>> {
  try {
    const teacher = await getCurrentTeacher();
    const result = await analyzeStudyHabits(studentId, teacher.id);
    return ok(result);
  } catch (error) {
    logger.error({ err: error, studentId }, '학습 습관 분석 실패');
    const message = error instanceof Error ? error.message : '학습 습관 분석 중 오류가 발생했습니다.';
    return fail(message);
  }
}
