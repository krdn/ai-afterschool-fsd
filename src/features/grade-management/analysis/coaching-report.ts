import { db } from '@/lib/db/client';
import type { Prisma } from '@/lib/db';
import { getStudentProfile } from './student-profiler';
import { analyzeStrengthWeakness } from './strength-weakness';
import { analyzeGoalGap } from './goal-gap-analyzer';
import { generateStudyPlan } from './study-plan-generator';
import { generateAnalysis } from './llm-composer';
import type {
  StrengthWeaknessResult,
  GoalGapResult,
  StudyPlanResult,
} from '../types';
import { logger } from '@/lib/logger';

/**
 * 종합 코칭 리포트 인터페이스
 * 4가지 분석(강점/약점, 목표격차, 학습플랜, 동기부여)을 종합한다.
 */
export interface CoachingReport {
  strengthWeakness: StrengthWeaknessResult;
  goalGap: GoalGapResult;
  studyPlan: StudyPlanResult;
  /** MBTI/VARK 기반 동기부여 메시지 */
  motivationMessage: string;
  /** LLM이 생성한 종합 추천 */
  overallRecommendation: string;
  /** 리포트 생성 시각 (ISO string) */
  generatedAt: string;
}

/**
 * 종합 코칭 리포트를 생성한다.
 * 1) 캐시 확인 (COACHING, 24시간)
 * 2) 3개 분석 병렬 호출 (analyzeStrengthWeakness, analyzeGoalGap, generateStudyPlan)
 * 3) LLM으로 종합 추천 + 동기부여 메시지 생성
 * 4) DB 캐싱
 */
export async function generateCoachingReport(
  studentId: string,
  teacherId?: string
): Promise<CoachingReport> {
  // 캐시 확인 (24시간 이내)
  const cached = await db.learningAnalysis.findFirst({
    where: {
      studentId,
      analysisType: 'COACHING',
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (cached) {
    return cached.analysisData as unknown as CoachingReport;
  }

  // 프로필 수집 (동기부여 메시지 생성에 필요)
  const profile = await getStudentProfile(studentId);
  if (!profile || profile.gradeHistory.length === 0) {
    throw new Error('분석할 성적 데이터가 없습니다.');
  }

  // 3개 분석 병렬 호출
  const [strengthWeakness, goalGap, studyPlan] = await Promise.all([
    analyzeStrengthWeakness(studentId, teacherId),
    analyzeGoalGap(studentId, teacherId),
    generateStudyPlan(studentId, teacherId),
  ]);

  // LLM으로 종합 추천 + 동기부여 메시지 생성
  const coachingPrompt = buildCoachingPrompt(
    strengthWeakness,
    goalGap,
    studyPlan,
    profile.mbtiType,
    profile.varkType
  );

  let motivationMessage: string;
  let overallRecommendation: string;

  try {
    const llmResponse = await generateAnalysis(profile, coachingPrompt, teacherId);
    const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as {
        motivationMessage?: string;
        overallRecommendation?: string;
      };
      motivationMessage = parsed.motivationMessage ?? buildDefaultMotivation(profile.mbtiType, profile.varkType);
      overallRecommendation = parsed.overallRecommendation ?? '종합 분석 결과를 기반으로 학습 전략을 수립해주세요.';
    } else {
      // JSON 파싱 실패 시 전체 응답을 추천으로 사용
      motivationMessage = buildDefaultMotivation(profile.mbtiType, profile.varkType);
      overallRecommendation = llmResponse;
    }
  } catch (error) {
    logger.warn({ err: error }, 'LLM 코칭 리포트 생성 실패, 기본 메시지 반환');
    motivationMessage = buildDefaultMotivation(profile.mbtiType, profile.varkType);
    overallRecommendation = buildDefaultRecommendation(strengthWeakness, goalGap);
  }

  const report: CoachingReport = {
    strengthWeakness,
    goalGap,
    studyPlan,
    motivationMessage,
    overallRecommendation,
    generatedAt: new Date().toISOString(),
  };

  // DB 캐싱
  await db.learningAnalysis.create({
    data: {
      studentId,
      teacherId,
      analysisType: 'COACHING',
      analysisData: report as unknown as Prisma.InputJsonValue,
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  return report;
}

/**
 * 코칭 리포트 LLM 프롬프트를 구성한다.
 */
function buildCoachingPrompt(
  sw: StrengthWeaknessResult,
  gg: GoalGapResult,
  sp: StudyPlanResult,
  mbtiType: string | null | undefined,
  varkType: string | null | undefined
): string {
  return `아래 3가지 분석 결과를 종합하여 코칭 리포트를 작성해주세요.

## 강점/약점 분석
- 강점: ${sw.strengths.map((s) => `${s.subject}(${s.score}점)`).join(', ') || '없음'}
- 약점: ${sw.weaknesses.map((w) => `${w.subject}(${w.score}점)`).join(', ') || '없음'}
- 종합: ${sw.summary}

## 목표 격차 분석
- 전체 달성 가능성: ${gg.overallAchievability}%
- 과목별 격차: ${gg.gaps.map((g) => `${g.subject}: 현재 ${g.currentScore}→목표 ${g.targetScore}(${g.achievability})`).join(', ')}
- 조언: ${gg.advice}

## 학습 플랜
- 우선순위 과목: ${sp.prioritySubjects.join(', ')}
- 플랜 근거: ${sp.rationale}

## 학생 특성
- MBTI: ${mbtiType ?? '미측정'}
- VARK 학습스타일: ${varkType ?? '미측정'}

위 분석을 종합하여 아래 JSON 형식으로만 응답해주세요:
{
  "motivationMessage": "학생의 MBTI/VARK 특성을 반영한 개인화 동기부여 메시지 (3~5문장, 따뜻하고 격려하는 톤)",
  "overallRecommendation": "3가지 분석을 종합한 학습 전략 추천 (5~8문장, 구체적인 실행 방안 포함)"
}`;
}

/**
 * LLM 실패 시 MBTI/VARK 기반 기본 동기부여 메시지를 생성한다.
 */
function buildDefaultMotivation(
  mbtiType: string | null | undefined,
  varkType: string | null | undefined
): string {
  const messages: string[] = [];

  // MBTI 기반 동기부여
  if (mbtiType) {
    const type = mbtiType.toUpperCase();
    if (type.includes('E')) {
      messages.push('다른 친구들과 함께 공부하면 더 큰 시너지를 낼 수 있어요.');
    } else if (type.includes('I')) {
      messages.push('혼자만의 집중 시간을 확보하는 것이 성적 향상의 열쇠입니다.');
    }
    if (type.includes('N')) {
      messages.push('큰 그림을 먼저 이해하고 세부사항으로 나아가는 전략이 효과적입니다.');
    } else if (type.includes('S')) {
      messages.push('단계별 목표를 세우고 하나씩 달성해나가는 것이 가장 확실한 방법입니다.');
    }
  }

  // VARK 기반 동기부여
  if (varkType) {
    const type = varkType.toUpperCase();
    if (type.includes('V')) {
      messages.push('마인드맵이나 도표를 활용하면 복잡한 내용도 한눈에 정리할 수 있어요.');
    } else if (type.includes('A')) {
      messages.push('강의를 녹음해서 반복 청취하면 이해도가 크게 높아질 거예요.');
    } else if (type.includes('R')) {
      messages.push('노트 정리와 요약문 작성을 습관화하면 자연스럽게 성적이 오를 거예요.');
    } else if (type.includes('K')) {
      messages.push('직접 문제를 풀고 실습하는 과정에서 가장 효과적으로 배울 수 있어요.');
    }
  }

  if (messages.length === 0) {
    messages.push('꾸준한 노력은 반드시 결과로 이어집니다. 지금의 노력을 믿으세요!');
  }

  messages.push('지금까지의 노력이 분명 결실을 맺을 거예요. 함께 응원합니다!');
  return messages.join(' ');
}

/**
 * LLM 실패 시 분석 결과 기반 기본 추천을 생성한다.
 */
function buildDefaultRecommendation(
  sw: StrengthWeaknessResult,
  gg: GoalGapResult
): string {
  const parts: string[] = [];

  if (sw.weaknesses.length > 0) {
    parts.push(
      `현재 ${sw.weaknesses.map((w) => w.subject).join(', ')} 과목에서 보강이 필요합니다.`
    );
    parts.push(
      `특히 ${sw.weaknesses[0].subject}은(는) ${sw.weaknesses[0].improvementTip}`
    );
  }

  if (sw.strengths.length > 0) {
    parts.push(
      `${sw.strengths.map((s) => s.subject).join(', ')} 과목의 강점을 유지하면서 약한 과목에 집중해주세요.`
    );
  }

  if (gg.overallAchievability >= 70) {
    parts.push('전반적으로 목표 달성 가능성이 높습니다. 현재 페이스를 유지하세요.');
  } else if (gg.overallAchievability >= 40) {
    parts.push('목표 달성을 위해 약점 과목에 추가 시간 투자가 필요합니다.');
  } else {
    parts.push('목표를 단계적으로 조정하고, 기본기부터 탄탄히 다지는 것을 추천합니다.');
  }

  return parts.join(' ') || '분석 결과를 참고하여 학습 계획을 수립해주세요.';
}
