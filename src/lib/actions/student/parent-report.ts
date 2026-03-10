'use server';

import { getCurrentTeacher } from '@/lib/dal';
import { ok, fail, okVoid, type ActionResult, type ActionVoidResult } from '@/lib/errors/action-result';
import { logger } from '@/lib/logger';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import {
  generateParentReport,
  saveParentReport,
  markReportAsSent,
  getParentReports,
  type ParentReportData,
} from '@/features/grade-management/report/parent-report-generator';
import { sendAlimtalk, sendSms, ALIMTALK_TEMPLATES } from '@/features/notification';

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
 * 학부모 리포트 발송 Server Action
 *
 * 알리고 API를 통해 카카오 알림톡 또는 SMS로 발송한다.
 */
export async function sendParentReportAction(
  reportId: string,
  method: 'email' | 'kakao' | 'sms'
): Promise<ActionVoidResult> {
  try {
    await getCurrentTeacher();

    // 리포트 + 학부모 정보 조회
    const report = await db.parentGradeReport.findUnique({
      where: { id: reportId },
      include: {
        student: { select: { name: true } },
        parent: { select: { name: true, phone: true } },
      },
    });

    if (!report) {
      return fail('리포트를 찾을 수 없습니다.');
    }

    if (!report.parent?.phone) {
      return fail('학부모 연락처가 등록되지 않았습니다.');
    }

    const reportData = report.reportData as unknown as ParentReportData;
    const parentPhone = report.parent.phone;
    const parentName = report.parent.name;
    const studentName = report.student.name;

    if (method === 'kakao') {
      const message = buildGradeReportMessage(studentName, reportData);
      const smsMessage = buildGradeReportSmsMessage(studentName, reportData);

      const result = await sendAlimtalk({
        templateCode: ALIMTALK_TEMPLATES.gradeReport,
        receivers: [{
          phone: parentPhone,
          subject: `${studentName} 학생 성적 리포트`,
          message,
          name: parentName,
          fallbackMessage: smsMessage,
          fallbackSubject: `[성적리포트] ${studentName}`,
        }],
        failover: true,
      });

      if (!result.success) {
        return fail(result.errorMessage ?? '알림톡 발송에 실패했습니다.');
      }

      await markReportAsSent(reportId, method, {
        sendStatus: 'sent',
        aligoMid: result.mid,
      });
    } else if (method === 'sms') {
      const smsMessage = buildGradeReportSmsMessage(studentName, reportData);

      const result = await sendSms({
        receiver: parentPhone,
        message: smsMessage,
        title: `[성적리포트] ${studentName}`,
      });

      if (!result.success) {
        return fail(result.errorMessage ?? 'SMS 발송에 실패했습니다.');
      }

      await markReportAsSent(reportId, method, {
        sendStatus: 'sent',
        aligoMid: result.mid,
      });
    } else {
      // email: 추후 구현
      await markReportAsSent(reportId, method);
      logger.info({ reportId, method }, 'Email 발송은 아직 미구현');
    }

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

// =============================================================================
// 내부 헬퍼
// =============================================================================

/**
 * 알림톡용 성적 리포트 메시지를 생성한다.
 */
function buildGradeReportMessage(
  studentName: string,
  reportData: ParentReportData
): string {
  const subjects = reportData.subjectComments
    .map((s) => `${s.subject}: ${s.score}점 - ${s.comment}`)
    .join('\n');

  return `[성적 리포트 안내]

${studentName} 학생의 성적 리포트가 준비되었습니다.

■ 기간: ${reportData.reportPeriod}
■ 요약: ${reportData.summary}

■ 과목별 성적
${subjects}

■ 선생님 한마디
${reportData.teacherNote}`;
}

/**
 * SMS 대체 발송용 축약 메시지를 생성한다.
 */
function buildGradeReportSmsMessage(
  studentName: string,
  reportData: ParentReportData
): string {
  return `[방과후학교] ${studentName} 학생 성적 리포트가 준비되었습니다. 기간: ${reportData.reportPeriod}`;
}
