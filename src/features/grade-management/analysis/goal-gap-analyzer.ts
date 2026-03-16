import { db } from '@/lib/db/client';
import type { Prisma } from '@/lib/db';
import { getStudentProfile } from './student-profiler';
import { analyzeSubjectStrengths } from './stat-analyzer';
import { generateAnalysis } from './llm-composer';
import type { GoalGapResult } from '../types';
import { loadGradePromptTemplate, renderPromptTemplate } from './grade-prompt-loader';
import { logger } from '@/lib/logger';

/**
 * 학생의 목표 격차(Goal Gap) 분석을 수행한다.
 * 1) 캐시 확인 (24시간 이내)
 * 2) 프로필 수집 (getStudentProfile)
 * 3) 통계 분석 (analyzeSubjectStrengths로 현재 점수 계산)
 * 4) LLM에 GoalGapResult JSON 형식으로 응답 요청
 * 5) DB 캐싱
 */
export async function analyzeGoalGap(
  studentId: string,
  teacherId?: string
): Promise<GoalGapResult> {
  // 캐시 확인 (24시간 이내)
  const cached = await db.learningAnalysis.findFirst({
    where: {
      studentId,
      analysisType: 'GOAL_GAP',
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (cached) {
    return cached.analysisData as unknown as GoalGapResult;
  }

  // 프로필 수집
  const profile = await getStudentProfile(studentId);
  if (!profile || profile.gradeHistory.length === 0) {
    throw new Error('분석할 성적 데이터가 없습니다.');
  }

  // 통계 분석 - 현재 과목별 평균 점수 계산
  const subjects = analyzeSubjectStrengths(
    profile.gradeHistory.map((g) => ({
      subject: g.subject,
      normalizedScore: g.score,
      testDate: g.testDate,
      category: g.category,
    }))
  );

  // 목표 정보 구성
  const hasTarget = profile.targetUniversity || profile.targetMajor;
  const targetInfo = hasTarget
    ? `목표 대학: ${profile.targetUniversity ?? '미정'}, 목표 학과: ${profile.targetMajor ?? '미정'}`
    : '구체적인 목표 대학/학과가 설정되지 않음 (현재 점수 기반 +10~15점 상향 목표 설정)';

  // 동적 데이터 구성
  const dynamicData = `현재 과목별 성적:
${subjects.map((s) => `- ${s.name}: 평균 ${s.avgScore}점, 추세 ${s.trend}`).join('\n')}

학생 목표 정보:
${targetInfo}

${hasTarget
    ? '목표 대학/학과에 맞는 합리적인 목표 점수를 설정해주세요.'
    : '현재 점수 기반으로 +10~15점 상향 목표를 설정해주세요.'}

VARK 학습스타일: ${profile.varkType ?? '미측정'}
MBTI: ${profile.mbtiType ?? '미측정'}`;

  // 폴백 프롬프트
  const fallbackTemplate = `이 학생의 과목별 현재 성적과 목표를 분석하여 목표 격차(Goal Gap) 분석을 JSON으로 작성해주세요.

{{DATA}}

아래 JSON 형식으로만 응답해주세요:
{
  "gaps": [
    {
      "subject": "과목명",
      "currentScore": 현재평균점수,
      "targetScore": 목표점수,
      "gap": 격차(targetScore - currentScore),
      "achievability": "HIGH" | "MEDIUM" | "LOW",
      "strategy": "구체적인 달성 전략 1~2문장"
    }
  ],
  "overallAchievability": 0~100 사이의 전체 달성 가능성 퍼센트,
  "advice": "종합 조언 3~5문장"
}

achievability 기준:
- HIGH: 격차 10점 이하 또는 상승 추세
- MEDIUM: 격차 10~20점
- LOW: 격차 20점 초과 또는 하락 추세`;

  // DB에서 프롬프트 템플릿 로드
  const template = await loadGradePromptTemplate('grade_gap', fallbackTemplate);
  const prompt = renderPromptTemplate(template, dynamicData);

  let result: GoalGapResult;
  try {
    const llmResponse = await generateAnalysis(profile, prompt, teacherId);
    // JSON 파싱 시도
    const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      result = JSON.parse(jsonMatch[0]) as GoalGapResult;
    } else {
      // JSON 파싱 실패 시 통계 기반으로 결과 생성
      result = buildFromStats(subjects, hasTarget, llmResponse);
    }
  } catch (error) {
    logger.warn({ err: error }, 'LLM 목표 격차 분석 실패, 통계 결과만 반환');
    result = buildFromStats(
      subjects,
      hasTarget,
      'AI 분석을 사용할 수 없습니다. 통계 데이터를 참고해주세요.'
    );
  }

  // DB 캐싱
  await db.learningAnalysis.create({
    data: {
      studentId,
      teacherId,
      analysisType: 'GOAL_GAP',
      analysisData: result as unknown as Prisma.InputJsonValue,
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  return result;
}

/**
 * 통계 데이터 기반으로 GoalGapResult를 생성한다 (LLM 폴백용).
 */
function buildFromStats(
  subjects: ReturnType<typeof analyzeSubjectStrengths>,
  hasTarget: string | null | undefined,
  advice: string
): GoalGapResult {
  const gaps = subjects.map((s) => {
    // 목표 대학/학과가 없으면 현재 점수 + 10~15점 상향
    const targetScore = hasTarget
      ? Math.min(100, s.avgScore + 15)
      : Math.min(100, s.avgScore + (s.strength ? 10 : 15));
    const gap = Math.round((targetScore - s.avgScore) * 10) / 10;

    let achievability: 'HIGH' | 'MEDIUM' | 'LOW';
    if (gap <= 10 || s.trend === 'UP') {
      achievability = 'HIGH';
    } else if (gap <= 20) {
      achievability = 'MEDIUM';
    } else {
      achievability = 'LOW';
    }

    return {
      subject: s.name,
      currentScore: s.avgScore,
      targetScore: Math.round(targetScore * 10) / 10,
      gap,
      achievability,
      strategy: s.weakCategories.length > 0
        ? `${s.weakCategories.join(', ')} 단원 집중 학습 후 전체 복습`
        : s.strength
          ? '현재 수준 유지 및 심화 학습'
          : '기본 개념 복습 후 문제 풀이 반복',
    };
  });

  const overallAchievability = gaps.length > 0
    ? Math.round(
        gaps.reduce(
          (sum, g) =>
            sum + (g.achievability === 'HIGH' ? 90 : g.achievability === 'MEDIUM' ? 60 : 30),
          0
        ) / gaps.length
      )
    : 50;

  return {
    gaps,
    overallAchievability,
    advice,
  };
}
