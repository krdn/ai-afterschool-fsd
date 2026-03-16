import { db } from '@/lib/db/client';
import type { Prisma } from '@/lib/db';
import { getStudentProfile } from './student-profiler';
import { analyzeStrengthWeakness } from './strength-weakness';
import { generateAnalysis } from './llm-composer';
import type { StudyPlanResult, StrengthWeaknessResult } from '../types';
import { loadGradePromptTemplate, renderPromptTemplate } from './grade-prompt-loader';
import { logger } from '@/lib/logger';

/**
 * 학생 맞춤형 학습 플랜을 생성한다.
 * 1) 캐시 확인 (STUDY_PLAN, 24시간)
 * 2) 프로필 수집
 * 3) 강점/약점 결과 활용 (analyzeStrengthWeakness 호출)
 * 4) LLM에 StudyPlanResult JSON 형식으로 응답 요청
 * 5) DB 캐싱
 */
export async function generateStudyPlan(
  studentId: string,
  teacherId?: string
): Promise<StudyPlanResult> {
  // 캐시 확인 (24시간 이내)
  const cached = await db.learningAnalysis.findFirst({
    where: {
      studentId,
      analysisType: 'STUDY_PLAN',
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (cached) {
    return cached.analysisData as unknown as StudyPlanResult;
  }

  // 프로필 수집
  const profile = await getStudentProfile(studentId);
  if (!profile || profile.gradeHistory.length === 0) {
    throw new Error('분석할 성적 데이터가 없습니다.');
  }

  // 강점/약점 분석 결과 가져오기 (캐싱 활용)
  let swResult: StrengthWeaknessResult;
  try {
    swResult = await analyzeStrengthWeakness(studentId, teacherId);
  } catch (error) {
    logger.warn({ err: error }, '강점/약점 분석 실패, 기본 데이터로 학습 플랜 생성');
    swResult = {
      strengths: [],
      weaknesses: [],
      summary: '강점/약점 분석 데이터가 없습니다.',
    };
  }

  // VARK 학습스타일 기반 학습 방법 제안
  const varkAdvice = getVarkLearningAdvice(profile.varkType);

  // 동적 데이터 구성
  const dynamicData = `강점 과목:
${swResult.strengths.length > 0
    ? swResult.strengths.map((s) => `- ${s.subject}: ${s.reason} (${s.score}점)`).join('\n')
    : '- 분석 데이터 부족'}

약점 과목:
${swResult.weaknesses.length > 0
    ? swResult.weaknesses.map((w) => `- ${w.subject}: ${w.reason} (${w.score}점) → ${w.improvementTip}`).join('\n')
    : '- 분석 데이터 부족'}

VARK 학습스타일: ${profile.varkType ?? '미측정'}
${varkAdvice ? `학습스타일 특성: ${varkAdvice}` : ''}
MBTI: ${profile.mbtiType ?? '미측정'}
목표 대학: ${profile.targetUniversity ?? '미정'}
목표 학과: ${profile.targetMajor ?? '미정'}`;

  // 폴백 프롬프트
  const fallbackTemplate = `이 학생의 강점/약점 분석과 학습스타일을 바탕으로 맞춤형 주간 학습 플랜을 JSON으로 작성해주세요.

{{DATA}}

학습 플랜 작성 규칙:
1. 약점 과목에 더 많은 시간을 배정하세요
2. 강점 과목은 유지/심화 수준으로 배정하세요
3. VARK 학습스타일을 반영한 구체적 학습 방법을 focus에 포함하세요
4. 월~일(7일) 플랜을 작성하세요
5. 하루 총 학습 시간은 3~5시간 내외로 설정하세요

아래 JSON 형식으로만 응답해주세요:
{
  "weeklyPlan": [
    {
      "day": "월요일",
      "subjects": [
        { "name": "과목명", "hours": 학습시간, "focus": "구체적 학습 포인트" }
      ]
    }
  ],
  "prioritySubjects": ["우선순위 과목1", "우선순위 과목2"],
  "rationale": "이 학습 플랜의 근거와 기대 효과 3~5문장"
}`;

  // DB에서 프롬프트 템플릿 로드
  const template = await loadGradePromptTemplate('grade_plan', fallbackTemplate);
  const prompt = renderPromptTemplate(template, dynamicData);

  let result: StudyPlanResult;
  try {
    const llmResponse = await generateAnalysis(profile, prompt, teacherId);
    // JSON 파싱 시도
    const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      result = JSON.parse(jsonMatch[0]) as StudyPlanResult;
    } else {
      // JSON 파싱 실패 시 통계 기반으로 결과 생성
      result = buildFromAnalysis(swResult, profile.varkType, llmResponse);
    }
  } catch (error) {
    logger.warn({ err: error }, 'LLM 학습 플랜 생성 실패, 기본 플랜 반환');
    result = buildFromAnalysis(
      swResult,
      profile.varkType,
      'AI 분석을 사용할 수 없습니다. 기본 학습 플랜을 참고해주세요.'
    );
  }

  // DB 캐싱
  await db.learningAnalysis.create({
    data: {
      studentId,
      teacherId,
      analysisType: 'STUDY_PLAN',
      analysisData: result as unknown as Prisma.InputJsonValue,
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  return result;
}

/**
 * VARK 학습스타일 기반 학습 방법 조언을 반환한다.
 */
function getVarkLearningAdvice(varkType: string | null | undefined): string {
  if (!varkType) return '';

  const type = varkType.toUpperCase();
  if (type.includes('V')) {
    return '시각적 학습자 - 도표, 그래프, 마인드맵 활용이 효과적';
  }
  if (type.includes('A')) {
    return '청각적 학습자 - 강의 듣기, 토론, 녹음 복습이 효과적';
  }
  if (type.includes('R')) {
    return '읽기/쓰기 학습자 - 노트 정리, 요약문 작성, 교재 반복 읽기가 효과적';
  }
  if (type.includes('K')) {
    return '체험적 학습자 - 실습, 실험, 문제풀이 위주 학습이 효과적';
  }
  return '';
}

/**
 * 강점/약점 분석 결과 기반으로 기본 학습 플랜을 생성한다 (LLM 폴백용).
 */
function buildFromAnalysis(
  swResult: StrengthWeaknessResult,
  varkType: string | null | undefined,
  rationale: string
): StudyPlanResult {
  // 약점 과목 우선순위로 정렬
  const weakSubjects = swResult.weaknesses.map((w) => w.subject);
  const strongSubjects = swResult.strengths.map((s) => s.subject);
  const allSubjects = [...new Set([...weakSubjects, ...strongSubjects])];

  // 과목이 없으면 기본 과목 사용
  const subjects = allSubjects.length > 0
    ? allSubjects
    : ['국어', '수학', '영어'];

  const days = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'];

  // VARK에 맞는 학습 방법 기본값
  const focusPrefix = varkType?.toUpperCase().includes('V')
    ? '도표/그래프 활용 '
    : varkType?.toUpperCase().includes('A')
      ? '강의/설명 듣기 '
      : varkType?.toUpperCase().includes('R')
        ? '노트 정리 '
        : varkType?.toUpperCase().includes('K')
          ? '문제풀이 위주 '
          : '';

  const weeklyPlan = days.map((day) => ({
    day,
    subjects: subjects.slice(0, 3).map((name) => {
      const isWeak = weakSubjects.includes(name);
      return {
        name,
        hours: isWeak ? 1.5 : 1,
        focus: `${focusPrefix}${isWeak ? '기본 개념 복습 및 취약 단원 집중' : '심화 학습 및 응용'}`,
      };
    }),
  }));

  return {
    weeklyPlan,
    prioritySubjects: weakSubjects.length > 0 ? weakSubjects : subjects.slice(0, 2),
    rationale,
  };
}
