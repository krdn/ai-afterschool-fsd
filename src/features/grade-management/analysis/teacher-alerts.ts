import { db } from '@/lib/db/client';
import type { TeacherAlert } from '../types';
import { logger } from '@/lib/logger';

/**
 * 학생의 최근 성적 히스토리를 분석하여 교사 알림을 생성한다.
 *
 * 알림 조건:
 * - SCORE_DROP (severity 4-5): 최근 시험 점수가 직전 대비 -15% 이상 하락
 * - BELOW_AVERAGE (severity 3): 반 평균 대비 -20점 이하
 * - AT_RISK (severity 5): 연속 3회 이상 하락세
 * - IMPROVEMENT (severity 1): 연속 3회 이상 상승세 (긍정적 알림)
 */
export async function checkTeacherAlerts(studentId: string): Promise<TeacherAlert[]> {
  // 최근 성적 히스토리 조회 (과목별 시간순 정렬)
  const gradeHistory = await db.gradeHistory.findMany({
    where: { studentId },
    orderBy: { testDate: 'asc' },
    select: {
      subject: true,
      normalizedScore: true,
      classAverage: true,
      testDate: true,
    },
  });

  if (gradeHistory.length === 0) {
    return [];
  }

  const alerts: TeacherAlert[] = [];

  // 과목별로 그룹핑
  const subjectMap = new Map<string, typeof gradeHistory>();
  for (const grade of gradeHistory) {
    if (!subjectMap.has(grade.subject)) {
      subjectMap.set(grade.subject, []);
    }
    subjectMap.get(grade.subject)!.push(grade);
  }

  // 급격한 하락 과목 추적
  const scoreDropSubjects: string[] = [];
  // 반 평균 이하 과목 추적
  const belowAverageSubjects: string[] = [];
  // 연속 하락 과목 추적
  const atRiskSubjects: string[] = [];
  // 연속 상승 과목 추적
  const improvementSubjects: string[] = [];

  for (const [subject, grades] of subjectMap) {
    if (grades.length < 2) continue;

    // 최근 2개 시험 비교 - SCORE_DROP 체크
    const latest = grades[grades.length - 1];
    const previous = grades[grades.length - 2];
    const dropPercent = ((latest.normalizedScore - previous.normalizedScore) / previous.normalizedScore) * 100;

    if (dropPercent <= -15) {
      scoreDropSubjects.push(subject);
    }

    // BELOW_AVERAGE 체크 (최신 시험 기준)
    if (latest.classAverage != null) {
      const diff = latest.normalizedScore - latest.classAverage;
      if (diff <= -20) {
        belowAverageSubjects.push(subject);
      }
    }

    // 연속 하락/상승 체크 (최소 3회 필요)
    if (grades.length >= 3) {
      const recent = grades.slice(-4); // 최근 최대 4개 (3개 비교를 위해)
      let consecutiveDrops = 0;
      let consecutiveRises = 0;

      for (let i = 1; i < recent.length; i++) {
        if (recent[i].normalizedScore < recent[i - 1].normalizedScore) {
          consecutiveDrops++;
          consecutiveRises = 0;
        } else if (recent[i].normalizedScore > recent[i - 1].normalizedScore) {
          consecutiveRises++;
          consecutiveDrops = 0;
        } else {
          consecutiveDrops = 0;
          consecutiveRises = 0;
        }
      }

      if (consecutiveDrops >= 3) {
        atRiskSubjects.push(subject);
      }
      if (consecutiveRises >= 3) {
        improvementSubjects.push(subject);
      }
    }
  }

  // SCORE_DROP 알림 생성
  if (scoreDropSubjects.length > 0) {
    const severity = scoreDropSubjects.length >= 3 ? 5 : 4;
    alerts.push({
      alertType: 'SCORE_DROP',
      severity,
      subjects: scoreDropSubjects,
      message: `${scoreDropSubjects.join(', ')} 과목에서 직전 시험 대비 15% 이상 점수가 하락했습니다.`,
      suggestedAction:
        '학생과 개별 면담을 통해 학습 어려움이나 외부 요인을 파악하고, 해당 과목의 기본 개념 복습을 권장해주세요.',
    });
  }

  // BELOW_AVERAGE 알림 생성
  if (belowAverageSubjects.length > 0) {
    alerts.push({
      alertType: 'BELOW_AVERAGE',
      severity: 3,
      subjects: belowAverageSubjects,
      message: `${belowAverageSubjects.join(', ')} 과목에서 반 평균보다 20점 이상 낮은 성적을 받았습니다.`,
      suggestedAction:
        '보충 학습 자료를 제공하고, 수업 중 이해도를 확인하는 질문을 늘려주세요. 필요시 방과후 보충 수업을 고려해주세요.',
    });
  }

  // AT_RISK 알림 생성
  if (atRiskSubjects.length > 0) {
    alerts.push({
      alertType: 'AT_RISK',
      severity: 5,
      subjects: atRiskSubjects,
      message: `${atRiskSubjects.join(', ')} 과목에서 연속 3회 이상 성적이 하락하고 있습니다. 즉각적인 관심이 필요합니다.`,
      suggestedAction:
        '학부모와 긴급 상담을 진행하고, 학습 플랜을 재설계해주세요. 학습 동기와 심리적 요인도 함께 점검해주세요.',
    });
  }

  // IMPROVEMENT 알림 생성
  if (improvementSubjects.length > 0) {
    alerts.push({
      alertType: 'IMPROVEMENT',
      severity: 1,
      subjects: improvementSubjects,
      message: `${improvementSubjects.join(', ')} 과목에서 연속 3회 이상 성적이 향상되고 있습니다! 훌륭한 성과입니다.`,
      suggestedAction:
        '학생의 노력을 칭찬해주시고, 현재 학습 방법을 유지하도록 격려해주세요. 다른 과목에도 동일한 학습 전략을 적용할 수 있도록 안내해주세요.',
    });
  }

  // severity 높은 순으로 정렬
  alerts.sort((a, b) => b.severity - a.severity);

  logger.info(
    { studentId, alertCount: alerts.length },
    '교사 알림 체크 완료'
  );

  return alerts;
}
