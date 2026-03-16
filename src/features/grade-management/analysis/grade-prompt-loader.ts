import {
  getActivePresetsByType,
  seedBuiltInPresets,
  type AnalysisType,
} from '@/features/analysis/repositories/prompt-preset';
import { logger } from '@/lib/logger';

// ---------------------------------------------------------------------------
// 성적 분석 프롬프트 타입 매핑
// ---------------------------------------------------------------------------

export type GradePromptType = 'grade_strength' | 'grade_gap' | 'grade_plan' | 'grade_coaching';

// ---------------------------------------------------------------------------
// 프롬프트 로더: DB에서 활성 프리셋을 가져오고, 없으면 폴백 반환
// ---------------------------------------------------------------------------

/**
 * DB에서 성적 분석 프롬프트 템플릿을 로드한다.
 * 활성 프리셋이 없으면 fallback 템플릿을 반환한다.
 *
 * 템플릿에는 {{DATA}} 플레이스홀더가 포함되어 있으며,
 * 호출 측에서 동적 데이터로 치환한다.
 */
export async function loadGradePromptTemplate(
  promptType: GradePromptType,
  fallback: string
): Promise<string> {
  try {
    const presets = await getActivePresetsByType(promptType as AnalysisType);
    if (presets.length > 0) {
      return presets[0].promptTemplate;
    }
  } catch (error) {
    logger.warn({ err: error, promptType }, '성적 분석 프롬프트 프리셋 로드 실패, 폴백 사용');
  }
  return fallback;
}

/**
 * 프롬프트 템플릿의 {{DATA}} 플레이스홀더를 동적 데이터로 치환한다.
 */
export function renderPromptTemplate(template: string, data: string): string {
  return template.replace('{{DATA}}', data);
}

// ---------------------------------------------------------------------------
// 시드: 기본 프롬프트 프리셋 등록
// ---------------------------------------------------------------------------

export async function seedGradeAnalysisPresets(): Promise<number> {
  return seedBuiltInPresets(GRADE_PRESET_DEFINITIONS);
}

const GRADE_PRESET_DEFINITIONS = [
  {
    analysisType: 'grade_strength' as AnalysisType,
    promptKey: 'grade_strength_default',
    name: '강점/약점 분석 (기본)',
    shortDescription: '과목별 성적 데이터 기반 강점/약점을 분석합니다.',
    target: '중·고등학생',
    levels: '★★★☆☆',
    purpose: '학생의 과목별 강점과 약점을 파악하여 효율적인 학습 전략을 수립합니다.',
    recommendedTiming: '시험 성적 입력 후',
    tags: ['성적', '강점', '약점', '과목분석'],
    sortOrder: 1,
    promptTemplate: `이 학생의 과목별 성적 분석 결과를 바탕으로 강점/약점 분석을 JSON으로 작성해주세요.

{{DATA}}

분석 시 다음 사항을 반드시 지켜주세요:
1. 강점 이유는 구체적으로 작성하세요 (예: "문과 과목에서 3회 연속 점수가 상승" — "정기적으로 복습을 수행하기 때문" 같은 동어반복 금지).
2. 약점의 향상 팁은 실행 가능한 수준으로 구체적이어야 합니다 (예: "수학 2단원 함수 개념을 교과서로 복습 후 기출 5문제 풀기").
3. 종합 분석은 학생의 전체적인 학습 패턴과 주요 개선 방향을 포함하세요.
4. 약점 분석에서는 데이터에 없는 특정 단원을 언급하지 않도록 하세요.
5. 강점과 약점 분석 모두에서 VARK 학습 스타일과 관련된 구체적인 조언을 포함하세요.

아래 JSON 형식으로만 응답해주세요:
{
  "strengths": [{"subject": "과목명", "reason": "강점 이유 (구체적 근거 포함)", "score": 평균점수}],
  "weaknesses": [{"subject": "과목명", "reason": "약점 이유 (구체적 근거 포함)", "score": 평균점수, "improvementTip": "실행 가능한 구체적 향상 팁"}],
  "summary": "종합 분석 3~5문장 (학습 패턴, 주요 개선점, 권장 학습 방향 포함)"
}`,
  },
  {
    analysisType: 'grade_gap' as AnalysisType,
    promptKey: 'grade_gap_default',
    name: '목표 격차 분석 (기본)',
    shortDescription: '현재 성적과 목표 간의 격차를 분석합니다.',
    target: '중·고등학생',
    levels: '★★★☆☆',
    purpose: '목표 달성을 위한 과목별 전략을 제시합니다.',
    recommendedTiming: '목표 설정 후 또는 시험 성적 입력 후',
    tags: ['성적', '목표', '격차', '달성가능성'],
    sortOrder: 2,
    promptTemplate: `이 학생의 과목별 현재 성적과 목표를 분석하여 목표 격차(Goal Gap) 분석을 JSON으로 작성해주세요.

{{DATA}}

분석 시 다음 사항을 반드시 지켜주세요:
1. 달성 전략은 구체적이고 실행 가능해야 합니다 (기간, 방법, 분량 포함)
2. 추세(상승/하락)를 고려하여 달성 가능성을 현실적으로 평가하세요
3. 종합 조언은 우선순위가 명확해야 합니다 (어떤 과목부터 집중할지)

아래 JSON 형식으로만 응답해주세요:
{
  "gaps": [
    {
      "subject": "과목명",
      "currentScore": 현재평균점수,
      "targetScore": 목표점수,
      "gap": 격차(targetScore - currentScore),
      "achievability": "HIGH" | "MEDIUM" | "LOW",
      "strategy": "구체적인 달성 전략 1~2문장 (기간, 방법, 분량 포함)"
    }
  ],
  "overallAchievability": 0~100 사이의 전체 달성 가능성 퍼센트,
  "advice": "종합 조언 3~5문장 (우선순위 과목, 시간 배분, 핵심 전략)"
}

achievability 기준:
- HIGH: 격차 10점 이하 또는 상승 추세
- MEDIUM: 격차 10~20점
- LOW: 격차 20점 초과 또는 하락 추세`,
  },
  {
    analysisType: 'grade_plan' as AnalysisType,
    promptKey: 'grade_plan_default',
    name: '주간 학습 플랜 (기본)',
    shortDescription: '강점/약점과 학습스타일 기반 맞춤형 주간 학습 플랜을 생성합니다.',
    target: '중·고등학생',
    levels: '★★★☆☆',
    purpose: '실행 가능한 주간 학습 계획을 제공합니다.',
    recommendedTiming: '강점/약점 분석 후',
    tags: ['학습플랜', '주간계획', 'VARK', 'MBTI'],
    sortOrder: 3,
    promptTemplate: `이 학생의 강점/약점 분석과 학습스타일을 바탕으로 맞춤형 주간 학습 플랜을 JSON으로 작성해주세요.

{{DATA}}

학습 플랜 작성 규칙:
1. 강점 과목은 유지/심화 수준으로, 약점 과목에 더 많은 시간을 배정하세요.
2. VARK 학습스타일을 반영한 구체적 학습 방법을 focus에 포함하세요.
3. 월~일(7일) 플랜을 작성하세요.
4. 하루 총 학습 시간은 4~5시간 내외로 설정하세요.
5. focus에는 "교과서 3단원 복습" 같은 구체적 학습 포인트 (교재/단원/방법 명시)를 적으세요 ("공부하기" 같은 모호한 표현 금지).
6. 약점 과목에는 VARK 학습 스타일에 적합한 구체적 활동을 포함하세요 (시각적→도표/마인드맵, 청각적→강의/녹음, 체험적→문제풀이/실습).

아래 JSON 형식으로만 응답해주세요:
{
  "weeklyPlan": [
    {
      "day": "월요일",
      "subjects": [
        { "name": "과목명", "hours": 학습시간, "focus": "구체적 학습 포인트 (교재/단원/방법 명시)" }
      ]
    }
  ],
  "prioritySubjects": ["우선순위 과목1", "우선순위 과목2"],
  "rationale": "이 학습 플랜의 근거와 기대 효과 3~5문장"
}`,
  },
  {
    analysisType: 'grade_coaching' as AnalysisType,
    promptKey: 'grade_coaching_default',
    name: '종합 코칭 리포트 (기본)',
    shortDescription: '강점/약점, 목표격차, 학습플랜을 종합한 코칭 리포트를 생성합니다.',
    target: '중·고등학생',
    levels: '★★★★☆',
    purpose: '학생 맞춤형 종합 동기부여 및 학습 전략을 제공합니다.',
    recommendedTiming: '전체 분석 완료 후',
    tags: ['코칭', '동기부여', '종합분석', '학습전략'],
    sortOrder: 4,
    promptTemplate: `아래 3가지 분석 결과를 종합하여 코칭 리포트를 작성해주세요.

{{DATA}}

작성 규칙:
1. 동기부여 메시지는 학생의 MBTI/VARK 특성을 반영하여 개인화하세요. VARK 유형의 특성을 약점 과목 학습 전략에서 구체적으로 활용하세요.
2. 학생의 구체적인 성적 데이터를 인용하며 격려하세요 (예: "수학이 45점에서 72점으로 올랐어요!")
3. 종합 추천은 실행 가능한 구체적 행동 계획을 포함하세요. 강점 과목 성적도 종합 분석에서 반영하세요.
4. 부정적이거나 비난하는 톤은 절대 사용하지 마세요.
5. 하락 추세가 있는 과목은 경각심을 주되 격려와 함께 제시하세요. 상위권 학생에게는 심화 전략을, 하위권 학생에게는 단계적 목표를 제시하세요.
6. 문과/이과 과목 성적을 구분하여 분석하세요.

위 분석을 종합하여 아래 JSON 형식으로만 응답해주세요:
{
  "motivationMessage": "학생의 MBTI/VARK 특성을 반영한 개인화 동기부여 메시지 (3~5문장, 따뜻하고 격려하는 톤, 구체적 성적 변화 인용)",
  "overallRecommendation": "3가지 분석을 종합한 학습 전략 추천 (5~8문장, 구체적인 실행 방안 포함)"
}`,
  },
];
