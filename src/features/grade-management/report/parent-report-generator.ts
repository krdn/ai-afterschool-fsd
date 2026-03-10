import { db } from '@/lib/db/client';
import type { Prisma } from '@/lib/db';
import { getStudentProfile } from '../analysis/student-profiler';
import { generateWithProvider } from '@/features/ai-engine/universal-router';
import { logger } from '@/lib/logger';

// =============================================================================
// 타입 정의
// =============================================================================

export interface ParentReportData {
  /** 학생 이름 */
  studentName: string;
  /** 학교/학년 */
  schoolInfo: string;
  /** 리포트 기간 */
  reportPeriod: string;
  /** 전체 요약 (학부모 친화적) */
  summary: string;
  /** 강점 (긍정적으로 표현) */
  strengths: string[];
  /** 성장 포인트 (건설적으로 표현) */
  growthPoints: string[];
  /** 가정 학습 지도 방법 */
  homeStudyTips: string[];
  /** 과목별 한줄 평가 */
  subjectComments: Array<{
    subject: string;
    score: number;
    comment: string;
  }>;
  /** 선생님 한마디 */
  teacherNote: string;
  /** 생성 일시 */
  generatedAt: string;
}

// =============================================================================
// 메인 함수
// =============================================================================

/**
 * 학부모 성적 리포트를 생성한다.
 * 코칭 리포트를 학부모 친화적으로 변환하며,
 * 강점을 먼저 언급하고 개선점은 건설적으로 표현한다.
 */
export async function generateParentReport(
  studentId: string,
  teacherId?: string
): Promise<ParentReportData> {
  // 학생 프로필 조회
  const profile = await getStudentProfile(studentId);
  if (!profile) {
    throw new Error('학생 정보를 찾을 수 없습니다.');
  }

  if (profile.gradeHistory.length === 0) {
    throw new Error('리포트를 생성할 성적 데이터가 없습니다.');
  }

  // 리포트 기간 계산
  const dates = profile.gradeHistory.map((g) => g.testDate);
  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
  const reportPeriod = `${formatDate(minDate)} ~ ${formatDate(maxDate)}`;

  // 과목별 최근 성적 요약
  const subjectMap = new Map<string, { score: number; scores: number[] }>();
  for (const g of profile.gradeHistory) {
    const existing = subjectMap.get(g.subject);
    if (existing) {
      existing.scores.push(g.score);
      existing.score = g.score; // 마지막 점수가 최신
    } else {
      subjectMap.set(g.subject, { score: g.score, scores: [g.score] });
    }
  }

  const subjectSummary = Array.from(subjectMap.entries())
    .map(([subject, data]) => ({
      subject,
      score: data.score,
      avg: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
      trend: data.scores.length >= 2
        ? data.scores[data.scores.length - 1] - data.scores[data.scores.length - 2]
        : 0,
    }));

  // LLM으로 학부모 친화적 리포트 생성
  const prompt = buildParentReportPrompt(profile, subjectSummary, reportPeriod);

  try {
    const result = await generateWithProvider({
      featureType: 'grade_analysis',
      teacherId,
      prompt,
      system: PARENT_REPORT_SYSTEM_PROMPT,
      maxOutputTokens: 2048,
      temperature: 0.3,
    });

    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as Partial<ParentReportData>;
      return {
        studentName: profile.name,
        schoolInfo: `${profile.school} ${profile.grade}학년`,
        reportPeriod,
        summary: parsed.summary || '분석 결과를 생성했습니다.',
        strengths: parsed.strengths || [],
        growthPoints: parsed.growthPoints || [],
        homeStudyTips: parsed.homeStudyTips || [],
        subjectComments: parsed.subjectComments || subjectSummary.map((s) => ({
          subject: s.subject,
          score: s.score,
          comment: `평균 ${s.avg}점`,
        })),
        teacherNote: parsed.teacherNote || '열심히 노력하고 있습니다.',
        generatedAt: new Date().toISOString(),
      };
    }

    // JSON 파싱 실패 시 기본 리포트 반환
    return buildFallbackReport(profile, subjectSummary, reportPeriod);
  } catch (error) {
    logger.warn({ err: error }, 'LLM 학부모 리포트 생성 실패, 통계 기반 리포트 반환');
    return buildFallbackReport(profile, subjectSummary, reportPeriod);
  }
}

/**
 * 생성된 리포트를 DB에 저장한다.
 */
export async function saveParentReport(
  studentId: string,
  reportData: ParentReportData,
  parentId?: string
): Promise<string> {
  const report = await db.parentGradeReport.create({
    data: {
      studentId,
      parentId,
      reportPeriod: reportData.reportPeriod,
      reportData: reportData as unknown as Prisma.InputJsonValue,
    },
  });
  return report.id;
}

/**
 * 리포트 발송 기록을 업데이트한다.
 */
export async function markReportAsSent(
  reportId: string,
  method: 'email' | 'kakao' | 'sms',
  options?: { sendStatus?: string; aligoMid?: string }
): Promise<void> {
  await db.parentGradeReport.update({
    where: { id: reportId },
    data: {
      sentAt: new Date(),
      sentMethod: method,
      sendStatus: options?.sendStatus ?? 'sent',
      aligoMid: options?.aligoMid ?? null,
    },
  });
}

/**
 * 학생의 리포트 히스토리를 조회한다.
 */
export async function getParentReports(studentId: string) {
  return db.parentGradeReport.findMany({
    where: { studentId },
    orderBy: { createdAt: 'desc' },
    include: {
      parent: {
        select: { name: true, relation: true, email: true },
      },
    },
  });
}

// =============================================================================
// 내부 헬퍼
// =============================================================================

const PARENT_REPORT_SYSTEM_PROMPT = `당신은 한국 학원의 학부모 소통 전문가입니다.
선생님이 작성한 성적 분석 데이터를 학부모가 이해하기 쉬운 리포트로 변환합니다.

핵심 원칙:
1. 교육 전문 용어는 쉬운 한국어로 변환합니다
2. 강점을 반드시 먼저 언급합니다
3. 개선점은 '성장 포인트'로 건설적으로 표현합니다
4. 구체적인 가정 학습 지도 방법을 포함합니다
5. 격려하고 긍정적인 톤을 유지합니다
6. 반드시 한국어로 작성합니다`;

function buildParentReportPrompt(
  profile: NonNullable<Awaited<ReturnType<typeof getStudentProfile>>>,
  subjectSummary: Array<{ subject: string; score: number; avg: number; trend: number }>,
  reportPeriod: string
): string {
  const subjectInfo = subjectSummary
    .map(
      (s) =>
        `${s.subject}: 최근 ${s.score}점, 평균 ${s.avg}점, 변화 ${s.trend > 0 ? '+' : ''}${s.trend}점`
    )
    .join('\n');

  return `아래 학생의 성적 데이터를 학부모 리포트로 작성해주세요.

## 학생 정보
- 이름: ${profile.name}
- 학교/학년: ${profile.school} ${profile.grade}학년
- 기간: ${reportPeriod}

## 과목별 성적
${subjectInfo}

## MBTI: ${profile.mbtiType ?? '미측정'}
## VARK 학습스타일: ${profile.varkType ?? '미측정'}

아래 JSON 형식으로만 응답해주세요:
{
  "summary": "전체 요약 (3~4문장, 학부모 친화적)",
  "strengths": ["강점1", "강점2"],
  "growthPoints": ["성장 포인트1 (건설적으로)", "성장 포인트2"],
  "homeStudyTips": ["가정 학습 방법1", "가정 학습 방법2"],
  "subjectComments": [{"subject": "과목명", "score": 점수, "comment": "한줄평"}],
  "teacherNote": "선생님 한마디 (격려)"
}`;
}

function buildFallbackReport(
  profile: NonNullable<Awaited<ReturnType<typeof getStudentProfile>>>,
  subjectSummary: Array<{ subject: string; score: number; avg: number; trend: number }>,
  reportPeriod: string
): ParentReportData {
  const strong = subjectSummary.filter((s) => s.avg >= 70).sort((a, b) => b.avg - a.avg);
  const weak = subjectSummary.filter((s) => s.avg < 70).sort((a, b) => a.avg - b.avg);
  const improving = subjectSummary.filter((s) => s.trend > 0);

  return {
    studentName: profile.name,
    schoolInfo: `${profile.school} ${profile.grade}학년`,
    reportPeriod,
    summary: `${profile.name} 학생은 ${strong.length > 0 ? strong.map((s) => s.subject).join(', ') + '에서 좋은 성과를 보이고 있으며' : '꾸준히 노력하고 있으며'}, ${improving.length > 0 ? improving.map((s) => s.subject).join(', ') + '에서 향상 추세를 보이고 있습니다.' : '성실하게 학습에 임하고 있습니다.'}`,
    strengths: strong.slice(0, 3).map(
      (s) => `${s.subject} 과목에서 평균 ${s.avg}점으로 우수한 성적을 유지하고 있습니다.`
    ),
    growthPoints: weak.slice(0, 3).map(
      (s) => `${s.subject} 과목은 조금 더 관심을 기울이면 충분히 향상될 수 있습니다.`
    ),
    homeStudyTips: [
      '매일 일정한 시간에 학습하는 습관을 유지해주세요.',
      '학습 내용에 대해 자녀와 대화를 나눠보세요.',
      '칭찬과 격려가 학습 동기에 큰 도움이 됩니다.',
    ],
    subjectComments: subjectSummary.map((s) => ({
      subject: s.subject,
      score: s.score,
      comment: s.trend > 0
        ? `향상 추세입니다 (+${s.trend}점)`
        : s.avg >= 70
          ? '양호한 수준을 유지하고 있습니다'
          : '꾸준한 학습이 필요합니다',
    })),
    teacherNote: `${profile.name} 학생은 성실하게 수업에 참여하고 있습니다. 가정에서도 격려해 주시면 더 좋은 결과가 있을 것입니다.`,
    generatedAt: new Date().toISOString(),
  };
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
