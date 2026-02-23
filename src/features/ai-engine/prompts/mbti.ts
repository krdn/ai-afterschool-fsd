/**
 * MBTI 분석 전문 프롬프트 정의
 *
 * 학생 MBTI 분석 프롬프트 4종 + 기본 프롬프트
 */

import { MBTI_INTERPRETATION_PROMPT } from "./base"

// ---------------------------------------------------------------------------
// 타입 정의
// ---------------------------------------------------------------------------

export type MbtiPromptId = "default" | "mbti-learning" | "mbti-career" | "mbti-relationship"

export type MbtiPromptMeta = {
  id: MbtiPromptId
  name: string
  shortDescription: string
  target: string
  levels: string
  purpose: string
  recommendedTiming: string
  tags: string[]
}

export type StudentInfo = {
  name?: string
  grade?: number
  school?: string
}

export type MbtiPromptDefinition = {
  meta: MbtiPromptMeta
  buildPrompt: (mbtiType: string, percentages: Record<string, number>, studentInfo?: StudentInfo, additionalRequest?: string) => string
}

// ---------------------------------------------------------------------------
// 프롬프트 정의
// ---------------------------------------------------------------------------

const MBTI_PROMPTS: Record<MbtiPromptId, MbtiPromptDefinition> = {
  default: {
    meta: {
      id: "default",
      name: "기본 MBTI 해석",
      shortDescription: "MBTI 유형별 기본 성격/강점/약점 해석",
      target: "모든 학생",
      levels: "★★★☆☆",
      purpose: "유형 특성, 강점, 성장 포인트, 학습 스타일 종합",
      recommendedTiming: "MBTI 검사 직후",
      tags: ["종합", "기본", "성격", "강점"],
    },
    buildPrompt: (mbtiType, percentages, studentInfo) => {
      const studentInfoText = studentInfo
        ? `${studentInfo.name ?? "학생"} (${studentInfo.school ?? ""} ${studentInfo.grade ?? ""}학년)`
        : "학생"
      return MBTI_INTERPRETATION_PROMPT(mbtiType, percentages).replace(
        "학생의 MBTI",
        `${studentInfoText}의 MBTI`,
      )
    },
  },

  "mbti-learning": {
    meta: {
      id: "mbti-learning",
      name: "MBTI별 학습 전략",
      shortDescription: "유형별 최적 공부법/시간 관리 제안",
      target: "학습 방법 고민 학생",
      levels: "★★★★☆",
      purpose: "효과적인 학습법, 시간 관리, 그룹스터디 적합도 제시",
      recommendedTiming: "새 학기 시작, 시험 준비 시",
      tags: ["학습", "공부법", "시간관리", "그룹"],
    },
    buildPrompt: (mbtiType, percentages, studentInfo, additionalRequest) => {
      const studentInfoText = studentInfo
        ? `${studentInfo.name ?? "학생"} (${studentInfo.school ?? ""} ${studentInfo.grade ?? ""}학년)`
        : "학생"

      return `
너는 MBTI 기반 학습 전략 전문가야. ${studentInfoText}의 MBTI 유형에 맞는 최적의 학습법을 제안해줘.

**MBTI 유형:** ${mbtiType}
**각 차원 비율:**
- 외향(E) ${percentages.E ?? 0}% / 내향(I) ${percentages.I ?? 0}%
- 감각(S) ${percentages.S ?? 0}% / 직관(N) ${percentages.N ?? 0}%
- 사고(T) ${percentages.T ?? 0}% / 감정(F) ${percentages.F ?? 0}%
- 판단(J) ${percentages.J ?? 0}% / 인식(P) ${percentages.P ?? 0}%

다음 항목을 포함하여 학습 전략을 제안해주세요:

1. **유형별 학습 스타일**:
   - E/I: 그룹 vs 독학 선호도, 토론 활용법
   - S/N: 구체적 vs 개념적 학습, 암기 vs 이해
   - T/F: 논리적 vs 스토리텔링, 동기 부여 방식
   - J/P: 계획적 vs 유연한 학습, 마감 관리

2. **최적 공부법 5-7가지**:
   - 과목별 학습법 (문과/이과)
   - 노트 정리 방법
   - 복습 주기 및 방법
   - 암기 전략
   - 문제 풀이 접근법

3. **시간 관리 전략**:
   - 하루 학습 스케줄 예시
   - 집중 시간대 활용법
   - 휴식 타이밍 및 방법
   - 계획 수립 vs 유연성 균형

4. **그룹 학습 vs 독학**:
   - 그룹스터디 적합도 (상/중/하)
   - 그룹 학습 시 역할 (리더/중재자/발표자 등)
   - 독학이 더 효과적인 과목/시기
   - 온라인 vs 오프라인 학습 환경

5. **동기 부여 방법**:
   - 내재적 동기 vs 외재적 동기
   - 슬럼프 극복 전략
   - 목표 설정 방법 (단기/장기)

6. **실천 가능한 액션 플랜**:
   - 오늘부터 실천할 3가지
   - 1주일 후 점검 사항
   - 1개월 후 기대 효과

**추가 분석 요청사항**: ${additionalRequest ?? "없음"}

**중요:**
- 비율 데이터를 고려하여 경계 유형(55% vs 45% 등)은 양쪽 특성 반영
- 긍정적이고 격려하는 톤 유지
- 실천 가능한 구체적 방법 제시
- MBTI는 참고용 도구임을 명시
- 마크다운 형식으로 작성
`.trim()
    },
  },

  "mbti-career": {
    meta: {
      id: "mbti-career",
      name: "MBTI 기반 진로 탐색",
      shortDescription: "유형별 적합 직업군/학과/활동 추천",
      target: "진로 고민 학생",
      levels: "★★★★★",
      purpose: "적합 직업, 대학 학과, 경험 활동 구체적 제안",
      recommendedTiming: "진로 상담 시, 입시 준비 시",
      tags: ["진로", "직업", "학과", "적성"],
    },
    buildPrompt: (mbtiType, percentages, studentInfo, additionalRequest) => {
      const studentInfoText = studentInfo
        ? `${studentInfo.name ?? "학생"} (${studentInfo.school ?? ""} ${studentInfo.grade ?? ""}학년)`
        : "학생"

      return `
너는 MBTI 기반 진로 설계 전문가야. ${studentInfoText}의 MBTI 유형에 맞는 진로를 탐색하고 구체적으로 제안해줘.

**MBTI 유형:** ${mbtiType}
**각 차원 비율:**
- 외향(E) ${percentages.E ?? 0}% / 내향(I) ${percentages.I ?? 0}%
- 감각(S) ${percentages.S ?? 0}% / 직관(N) ${percentages.N ?? 0}%
- 사고(T) ${percentages.T ?? 0}% / 감정(F) ${percentages.F ?? 0}%
- 판단(J) ${percentages.J ?? 0}% / 인식(P) ${percentages.P ?? 0}%

다음 항목을 포함하여 진로를 제안해주세요:

1. **유형별 직업 적성**:
   - ${mbtiType} 유형의 강점이 발휘되는 직업 환경
   - 선호하는 업무 스타일 (혼자/팀, 루틴/변화, 이론/실무)
   - 리더십 스타일 및 적합 역할

2. **추천 직업군 8-10개** (카테고리별):
   - 전문직: (예: 변호사, 의사, 교수 등)
   - 비즈니스: (예: 마케터, 컨설턴트 등)
   - 창작/예술: (예: 디자이너, 작가 등)
   - 기술/과학: (예: 개발자, 연구원 등)
   - 교육/상담: (예: 교사, 상담사 등)
   - 각 직업을 선택한 이유 간단히 설명

3. **추천 대학 학과 5-7개**:
   - 계열별 학과 (인문/사회/자연/공학/예체능)
   - 각 학과의 적합 이유
   - 학과 선택 시 고려사항

4. **진로 탐색 활동**:
   - 고등학교 때 해보면 좋은 활동 3-5개
   - 독서 추천 (진로 관련 책 3권)
   - 체험 활동 (직업 체험, 멘토링, 동아리 등)
   - 온라인 강의/자격증

5. **장기 진로 로드맵**:
   - 고등학교: 준비할 활동
   - 대학교: 전공 선택 및 준비
   - 졸업 후: 진로 방향성
   - 예상 경력 경로 (초기 → 중기 → 고급)

6. **진로 결정 가이드**:
   - 선택의 기준 (적성/흥미/가치관)
   - 여러 선택지 중 우선순위 정하는 법
   - 진로 변경 시 고려사항

**추가 분석 요청사항**: ${additionalRequest ?? "없음"}

**중요:**
- 현실적이고 구체적인 직업/학과 제시
- 긍정적이고 격려하는 톤 유지
- 비율 데이터를 고려하여 경계 유형은 다양한 선택지 제공
- MBTI는 참고용 도구이며 최종 결정은 본인의 흥미와 가치관임을 강조
- 마크다운 형식으로 작성
`.trim()
    },
  },

  "mbti-relationship": {
    meta: {
      id: "mbti-relationship",
      name: "MBTI 대인관계 가이드",
      shortDescription: "교사-학생 소통법/또래 관계/갈등 해결",
      target: "대인관계 고민 학생",
      levels: "★★★★☆",
      purpose: "소통 스타일 이해, 관계 개선, 갈등 해결법 제시",
      recommendedTiming: "학기 초, 관계 고민 상담 시",
      tags: ["대인관계", "소통", "갈등", "친구"],
    },
    buildPrompt: (mbtiType, percentages, studentInfo, additionalRequest) => {
      const studentInfoText = studentInfo
        ? `${studentInfo.name ?? "학생"} (${studentInfo.school ?? ""} ${studentInfo.grade ?? ""}학년)`
        : "학생"

      return `
너는 MBTI 기반 대인관계 코칭 전문가야. ${studentInfoText}의 MBTI 유형에 맞는 대인관계 가이드를 제공해줘.

**MBTI 유형:** ${mbtiType}
**각 차원 비율:**
- 외향(E) ${percentages.E ?? 0}% / 내향(I) ${percentages.I ?? 0}%
- 감각(S) ${percentages.S ?? 0}% / 직관(N) ${percentages.N ?? 0}%
- 사고(T) ${percentages.T ?? 0}% / 감정(F) ${percentages.F ?? 0}%
- 판단(J) ${percentages.J ?? 0}% / 인식(P) ${percentages.P ?? 0}%

다음 항목을 포함하여 대인관계 가이드를 제공해주세요:

1. **${mbtiType} 유형의 소통 스타일**:
   - 선호하는 의사소통 방식 (직접적/간접적, 논리적/감정적)
   - 대화할 때 중요하게 생각하는 것
   - 경청 vs 표현의 균형
   - 비언어적 소통 특성

2. **선생님과의 관계**:
   - 선생님께 질문하는 방법
   - 피드백 받을 때 태도
   - 도움 요청하는 타이밍
   - 선생님이 이해하기 쉬운 표현법
   - 상담 시 효과적인 소통법

3. **또래 친구 관계**:
   - 친구 사귀는 스타일 (많은 친구 vs 깊은 친구)
   - 그룹 내 역할 (리더/중재자/지지자 등)
   - 친구에게 공감하는 방법
   - 거절하는 방법 (부담스러운 부탁 등)
   - 우정 유지하는 팁

4. **다른 유형과의 관계**:
   - 잘 맞는 유형 (시너지 발휘)
   - 조심할 유형 (오해 생기기 쉬운)
   - 각 유형별 소통 팁 간략히
   - 유형 차이로 인한 갈등 예방법

5. **갈등 해결 전략**:
   - ${mbtiType} 유형의 갈등 대응 패턴
   - 건강한 갈등 해결 5단계
   - 감정 조절 방법
   - 사과하는 법 / 용서하는 법
   - 갈등 후 관계 회복

6. **팀 프로젝트/협업**:
   - 팀에서 발휘할 수 있는 강점
   - 조심해야 할 행동
   - 역할 분담 시 선호
   - 의견 충돌 시 대처법

7. **실천 가능한 관계 개선 팁**:
   - 오늘부터 실천할 3가지
   - 한 달 후 기대 효과
   - 관계 점검 체크리스트

**추가 분석 요청사항**: ${additionalRequest ?? "없음"}

**중요:**
- 비율 데이터를 고려하여 경계 유형은 유연한 접근 제시
- 긍정적이고 격려하는 톤 유지
- 실천 가능한 구체적 행동 제시
- 자신의 유형을 이해하고 다른 유형을 존중하는 자세 강조
- MBTI는 참고용 도구임을 명시
- 마크다운 형식으로 작성
`.trim()
    },
  },
}

// ---------------------------------------------------------------------------
// Export 함수
// ---------------------------------------------------------------------------

/** UI 드롭다운용 메타 목록 */
export function getPromptOptions(): MbtiPromptMeta[] {
  return Object.values(MBTI_PROMPTS).map((p) => p.meta)
}

/** DB seed용 데이터 배열 */
export function getBuiltInSeedData() {
  return Object.values(MBTI_PROMPTS).map((p, index) => ({
    analysisType: "mbti" as const,
    promptKey: p.meta.id,
    name: p.meta.name,
    shortDescription: p.meta.shortDescription,
    target: p.meta.target,
    levels: p.meta.levels,
    purpose: p.meta.purpose,
    recommendedTiming: p.meta.recommendedTiming,
    tags: p.meta.tags,
    promptTemplate:
      p.meta.id === "default"
        ? "MBTI_INTERPRETATION_PROMPT 함수 사용 (동적 생성)"
        : p.buildPrompt("INFP", { E: 50, I: 50, S: 50, N: 50, T: 50, F: 50, J: 50, P: 50 }),
    sortOrder: index,
  }))
}

/** 특정 프롬프트 조회 */
export function getMbtiPrompt(id: MbtiPromptId): MbtiPromptDefinition | undefined {
  return MBTI_PROMPTS[id]
}
