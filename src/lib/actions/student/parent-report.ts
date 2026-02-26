'use server';

import { getCurrentTeacher } from '@/lib/dal';
import { ok, fail, okVoid, type ActionResult, type ActionVoidResult } from '@/lib/errors/action-result';
import { logger } from '@/lib/logger';
import { revalidatePath } from 'next/cache';
import {
  generateParentReport,
  saveParentReport,
  markReportAsSent,
  getParentReports,
  type ParentReportData,
} from '@/features/grade-management/report/parent-report-generator';

// =============================================================================
// 타입 정의
// =============================================================================

export type ParentReportListItem = Awaited<ReturnType<typeof getParentReports>>[number];

// =============================================================================
// Server Actions
// =============================================================================

/**
 * 학부모 리포트 생성 Server Action
 */
export async function generateParentReportAction(
  studentId: string
): Promise<ActionResult<{ reportId: string; reportData: ParentReportData }>> {
  try {
    const teacher = await getCurrentTeacher();

    // 리포트 데이터 생성
    const reportData = await generateParentReport(studentId, teacher.id);

    // DB에 저장
    const reportId = await saveParentReport(studentId, reportData);

    revalidatePath(`/grades/reports`);
    return ok({ reportId, reportData });
  } catch (error) {
    logger.error({ err: error, studentId }, '학부모 리포트 생성 실패');
    const message = error instanceof Error
      ? error.message
      : '학부모 리포트 생성 중 오류가 발생했습니다.';
    return fail(message);
  }
}

/**
 * 학부모 리포트 발송 Server Action (placeholder)
 *
 * 실제 이메일/카카오 발송은 추후 구현합니다.
 * 현재는 발송 기록만 업데이트합니다.
 */
export async function sendParentReportAction(
  reportId: string,
  method: 'email' | 'kakao' | 'sms'
): Promise<ActionVoidResult> {
  try {
    await getCurrentTeacher();

    // 발송 기록 업데이트
    await markReportAsSent(reportId, method);

    // TODO: 실제 발송 로직
    // - email: nodemailer 또는 외부 이메일 서비스
    // - kakao: 카카오 알림톡 API
    // - sms: SMS 발송 서비스
    logger.info({ reportId, method }, '학부모 리포트 발송 기록 (placeholder)');

    revalidatePath(`/grades/reports`);
    return okVoid();
  } catch (error) {
    logger.error({ err: error, reportId, method }, '학부모 리포트 발송 실패');
    return fail('리포트 발송에 실패했습니다.');
  }
}

/**
 * 학부모 리포트 히스토리 조회 Server Action
 */
export async function getParentReportsAction(
  studentId: string
): Promise<ActionResult<ParentReportListItem[]>> {
  try {
    await getCurrentTeacher();
    const reports = await getParentReports(studentId);
    return ok(reports);
  } catch (error) {
    logger.error({ err: error, studentId }, '학부모 리포트 조회 실패');
    return fail('리포트 히스토리를 불러오는 중 오류가 발생했습니다.');
  }
}
