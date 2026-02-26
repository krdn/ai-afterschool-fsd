'use server';

import { getCurrentTeacher } from '@/lib/dal';
import { ok, fail, type ActionResult } from '@/lib/errors/action-result';
import { logger } from '@/lib/logger';
import { analyzeStrengthWeakness } from '@/features/grade-management/analysis/strength-weakness';
import { analyzeGoalGap } from '@/features/grade-management/analysis/goal-gap-analyzer';
import { generateStudyPlan } from '@/features/grade-management/analysis/study-plan-generator';
import type { StrengthWeaknessResult, GoalGapResult, StudyPlanResult } from '@/features/grade-management/types';

/**
 * 학생 강점/약점 분석 Server Action
 */
export async function analyzeStudentStrengthWeakness(
  studentId: string
): Promise<ActionResult<StrengthWeaknessResult>> {
  try {
    const teacher = await getCurrentTeacher();
    const result = await analyzeStrengthWeakness(studentId, teacher.id);
    return ok(result);
  } catch (error) {
    logger.error({ err: error, studentId }, '강점/약점 분석 Server Action 실패');
    const message = error instanceof Error ? error.message : '강점/약점 분석 중 오류가 발생했습니다.';
    return fail(message);
  }
}

/**
 * 학생 목표 격차 분석 Server Action
 */
export async function analyzeStudentGoalGap(
  studentId: string
): Promise<ActionResult<GoalGapResult>> {
  try {
    const teacher = await getCurrentTeacher();
    const result = await analyzeGoalGap(studentId, teacher.id);
    return ok(result);
  } catch (error) {
    logger.error({ err: error, studentId }, '목표 격차 분석 Server Action 실패');
    const message = error instanceof Error ? error.message : '목표 격차 분석 중 오류가 발생했습니다.';
    return fail(message);
  }
}

/**
 * 학생 학습 플랜 생성 Server Action
 */
export async function generateStudentStudyPlan(
  studentId: string
): Promise<ActionResult<StudyPlanResult>> {
  try {
    const teacher = await getCurrentTeacher();
    const result = await generateStudyPlan(studentId, teacher.id);
    return ok(result);
  } catch (error) {
    logger.error({ err: error, studentId }, '학습 플랜 생성 Server Action 실패');
    const message = error instanceof Error ? error.message : '학습 플랜 생성 중 오류가 발생했습니다.';
    return fail(message);
  }
}
