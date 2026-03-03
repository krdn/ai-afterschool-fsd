import { db } from '@/lib/db/client';
import type { Prisma } from '@/lib/db';
import { getStudentProfile } from './student-profiler';
import { analyzeSubjectStrengths } from './stat-analyzer';
import { generateAnalysis } from './llm-composer';
import type { StrengthWeaknessResult } from '../types';
import { calculateImprovementRate } from '@/lib/analysis/grade-analytics';
import { logger } from '@/lib/logger';

/**
 * 학생의 강점/약점 종합 분석을 수행한다.
 * 1) 캐시 확인 (24시간 이내)
 * 2) 통계 분석 (stat-analyzer)
 * 3) LLM 인사이트 생성
 * 4) LearningAnalysis DB에 캐싱
 */
export async function analyzeStrengthWeakness(
  studentId: string,
  teacherId?: string
): Promise<StrengthWeaknessResult> {
  // 캐시 확인 (24시간 이내)
  const cached = await db.learningAnalysis.findFirst({
    where: {
      studentId,
      analysisType: 'STRENGTH_WEAKNESS',
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (cached) {
    return cached.analysisData as unknown as StrengthWeaknessResult;
  }

  // 프로필 수집
  const profile = await getStudentProfile(studentId);
  if (!profile || profile.gradeHistory.length === 0) {
    throw new Error('분석할 성적 데이터가 없습니다.');
  }

  // 통계 분석
  const subjects = analyzeSubjectStrengths(
    profile.gradeHistory.map((g) => ({
      subject: g.subject,
      normalizedScore: g.score,
      testDate: g.testDate,
      category: g.category,
    }))
  );

  // 전체 향상률
  let improvementRate = 0;
  let trend: 'UP' | 'STABLE' | 'DOWN' = 'STABLE';
  try {
    const improvement = calculateImprovementRate(
      profile.gradeHistory.map((g) => ({ score: g.score, testDate: g.testDate }))
    );
    improvementRate = improvement.improvementRate;
    trend = improvement.trend;
  } catch {
    // 데이터 부족 시 무시
  }

  const overallAvg =
    subjects.length > 0
      ? Math.round((subjects.reduce((sum, s) => sum + s.avgScore, 0) / subjects.length) * 10) / 10
      : 0;

  // LLM 인사이트 생성 - JSON 형태의 StrengthWeaknessResult 요청
  const prompt = `이 학생의 과목별 성적 분석 결과를 바탕으로 강점/약점 분석을 JSON으로 작성해주세요.

통계 분석 결과:
- 강점 과목: ${subjects.filter((s) => s.strength).map((s) => `${s.name}(평균 ${s.avgScore}점)`).join(', ') || '없음'}
- 약점 과목: ${subjects.filter((s) => !s.strength).map((s) => `${s.name}(평균 ${s.avgScore}점)`).join(', ') || '없음'}
- 전체 평균: ${overallAvg}점, 향상 추세: ${trend}, 향상률: ${improvementRate}%
- 약한 단원: ${subjects.flatMap((s) => s.weakCategories).join(', ') || '파악 안됨'}

VARK 학습스타일: ${profile.varkType ?? '미측정'}
MBTI: ${profile.mbtiType ?? '미측정'}

아래 JSON 형식으로만 응답해주세요:
{
  "strengths": [{"subject": "과목명", "reason": "강점 이유", "score": 평균점수}],
  "weaknesses": [{"subject": "과목명", "reason": "약점 이유", "score": 평균점수, "improvementTip": "구체적 향상 팁"}],
  "summary": "종합 분석 3~5문장"
}`;

  let result: StrengthWeaknessResult;
  try {
    const llmResponse = await generateAnalysis(profile, prompt, teacherId);
    // JSON 파싱 시도
    const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      result = JSON.parse(jsonMatch[0]) as StrengthWeaknessResult;
    } else {
      // JSON 파싱 실패 시 통계 기반으로 결과 생성
      result = buildFromStats(subjects, llmResponse);
    }
  } catch (error) {
    logger.warn({ err: error }, 'LLM 강점/약점 분석 실패, 통계 결과만 반환');
    result = buildFromStats(subjects, 'AI 분석을 사용할 수 없습니다. 통계 데이터를 참고해주세요.');
  }

  // DB 캐싱
  await db.learningAnalysis.create({
    data: {
      studentId,
      teacherId,
      analysisType: 'STRENGTH_WEAKNESS',
      analysisData: result as unknown as Prisma.InputJsonValue,
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  return result;
}

function buildFromStats(
  subjects: ReturnType<typeof analyzeSubjectStrengths>,
  summary: string
): StrengthWeaknessResult {
  return {
    strengths: subjects
      .filter((s) => s.strength)
      .map((s) => ({
        subject: s.name,
        reason: `평균 ${s.avgScore}점으로 전체 평균 이상`,
        score: s.avgScore,
      })),
    weaknesses: subjects
      .filter((s) => !s.strength)
      .map((s) => ({
        subject: s.name,
        reason: `평균 ${s.avgScore}점으로 전체 평균 미만`,
        score: s.avgScore,
        improvementTip:
          s.weakCategories.length > 0
            ? `${s.weakCategories.join(', ')} 단원 집중 학습 필요`
            : '기본 개념부터 복습 필요',
      })),
    summary,
  };
}
