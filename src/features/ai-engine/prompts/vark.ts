/**
 * VARK 학습유형 분석 프롬프트 정의
 */

export type VarkPromptId = "default" | "vark-study-plan" | "vark-subject-strategy"

export type VarkPromptDefinition = {
  meta: {
    id: VarkPromptId
    name: string
    shortDescription: string
    target: string
    levels: string
    purpose: string
    recommendedTiming: string
    tags: string[]
  }
  buildPrompt: (varkType: string, percentages: Record<string, number>, studentName?: string) => string
}

const VARK_PROMPTS: Record<VarkPromptId, VarkPromptDefinition> = {
  default: {
    meta: {
      id: "default",
      name: "기본 VARK 해석",
      shortDescription: "VARK 유형별 학습 스타일 종합 해석",
      target: "모든 학생",
      levels: "★★★☆☆",
      purpose: "VARK 유형 특성, 강점, 학습 팁 종합 분석",
      recommendedTiming: "VARK 검사 직후",
      tags: ["종합", "기본", "학습유형"],
    },
    buildPrompt: (varkType, percentages, studentName) => `
너는 VARK 학습유형 분석 전문가야. ${studentName ?? "학생"}의 VARK 검사 결과를 기반으로 맞춤 학습 가이드를 제공해줘.

**VARK 유형:** ${varkType}
**각 유형 비율:**
- 시각형(V) ${percentages.V ?? 0}%
- 청각형(A) ${percentages.A ?? 0}%
- 읽기쓰기형(R) ${percentages.R ?? 0}%
- 체험형(K) ${percentages.K ?? 0}%

다음 항목을 포함하여 해석해주세요:

1. **유형 프로필**: 우세 유형의 핵심 특성과 학습 DNA
2. **강점 분석**: 이 유형이 학업에서 발휘하는 강점
3. **주의점**: 보완하면 좋을 학습 습관
4. **맞춤 학습법 5가지**: 유형에 최적화된 구체적 공부법
5. **과목별 접근**: 주요 과목(국/영/수/사/과)별 학습 팁
6. **환경 세팅**: 최적의 학습 환경 조건
7. **실천 플랜**: 이번 주부터 시작할 3가지 행동

**중요:**
- 복합 유형(VK, VAR 등)은 각 유형의 시너지 분석
- VARK는 교육학적 학습 선호도 도구임을 명시
- 긍정적이고 격려하는 톤 유지
- 마크다운 형식으로 작성
`.trim(),
  },

  "vark-study-plan": {
    meta: {
      id: "vark-study-plan",
      name: "VARK 기반 학습 계획표",
      shortDescription: "유형별 최적 시간표와 일일 학습 루틴 설계",
      target: "학습 계획 수립이 필요한 학생",
      levels: "★★★★☆",
      purpose: "VARK 유형에 맞는 일일/주간 학습 계획과 시간 관리 전략",
      recommendedTiming: "새 학기, 시험 기간",
      tags: ["학습계획", "시간표", "루틴"],
    },
    buildPrompt: (varkType, percentages, studentName) => `
너는 VARK 기반 학습 설계 전문가야. ${studentName ?? "학생"}의 VARK 유형에 맞는 최적의 학습 계획을 설계해줘.

**VARK 유형:** ${varkType}
**각 유형 비율:**
- 시각형(V) ${percentages.V ?? 0}%
- 청각형(A) ${percentages.A ?? 0}%
- 읽기쓰기형(R) ${percentages.R ?? 0}%
- 체험형(K) ${percentages.K ?? 0}%

다음을 포함하여 학습 계획을 제안해주세요:

1. **하루 학습 시간표**: 우세 유형에 맞는 시간 배분
2. **주간 학습 루틴**: 요일별 학습 활동 배치
3. **과목별 시간 배분**: 유형 특성에 따른 효율적 배분
4. **집중력 관리**: 유형별 최적 집중 시간과 휴식 패턴
5. **시험 대비 플랜**: 시험 2주 전부터의 단계별 전략
6. **실천 체크리스트**: 매일 점검할 항목 5가지

**중요:** 실천 가능한 구체적 시간 제시, 마크다운 형식
`.trim(),
  },

  "vark-subject-strategy": {
    meta: {
      id: "vark-subject-strategy",
      name: "VARK 과목별 공략법",
      shortDescription: "유형별 각 과목 최적 학습 전략",
      target: "특정 과목 성적 향상이 필요한 학생",
      levels: "★★★★★",
      purpose: "VARK 유형에 맞는 과목별 세부 학습 전략",
      recommendedTiming: "성적 분석 후, 내신 대비 시",
      tags: ["과목별", "전략", "성적향상"],
    },
    buildPrompt: (varkType, percentages, studentName) => `
너는 VARK 기반 교과 학습 전략 전문가야. ${studentName ?? "학생"}의 VARK 유형에 맞는 과목별 공략법을 제시해줘.

**VARK 유형:** ${varkType}
**각 유형 비율:**
- 시각형(V) ${percentages.V ?? 0}%
- 청각형(A) ${percentages.A ?? 0}%
- 읽기쓰기형(R) ${percentages.R ?? 0}%
- 체험형(K) ${percentages.K ?? 0}%

다음 과목별로 유형에 맞는 최적 학습법을 제시해주세요:

1. **국어/문학**: 읽기 이해, 문법, 작문 전략
2. **영어**: 듣기/말하기/읽기/쓰기 영역별 전략
3. **수학**: 개념 이해, 문제 풀이, 오답 분석법
4. **사회/역사**: 암기, 이해, 서술형 대비
5. **과학**: 개념 학습, 실험, 탐구 활동 연계
6. **예체능**: 유형 특성을 살린 활동 전략

각 과목마다:
- 유형에 맞는 학습법 3가지
- 시험 대비 핵심 전략
- 실력 향상 체크포인트

**중요:** 실제 학교 수업에 적용 가능한 전략, 마크다운 형식
`.trim(),
  },
}

/** UI 드롭다운용 메타 목록 */
export function getPromptOptions() {
  return Object.values(VARK_PROMPTS).map((p) => p.meta)
}

/** DB seed용 데이터 */
export function getBuiltInSeedData() {
  return Object.values(VARK_PROMPTS).map((p, index) => ({
    analysisType: "vark" as const,
    promptKey: p.meta.id,
    name: p.meta.name,
    shortDescription: p.meta.shortDescription,
    target: p.meta.target,
    levels: p.meta.levels,
    purpose: p.meta.purpose,
    recommendedTiming: p.meta.recommendedTiming,
    tags: p.meta.tags,
    promptTemplate: p.buildPrompt("VK", { V: 35, A: 20, R: 15, K: 30 }),
    sortOrder: index,
  }))
}

/** 특정 프롬프트 조회 */
export function getVarkPrompt(id: VarkPromptId): VarkPromptDefinition | undefined {
  return VARK_PROMPTS[id]
}
