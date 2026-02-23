/**
 * 손금 분석 전문 프롬프트 정의
 *
 * 학생 손금 분석 프롬프트 3종 + 기본 프롬프트
 */

import { PALM_READING_PROMPT } from "./base"

// ---------------------------------------------------------------------------
// 타입 정의
// ---------------------------------------------------------------------------

export type PalmPromptId = "default" | "palm-talent" | "palm-future"

export type PalmPromptMeta = {
  id: PalmPromptId
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

export type PalmPromptDefinition = {
  meta: PalmPromptMeta
  promptTemplate: string
}

// ---------------------------------------------------------------------------
// 프롬프트 정의
// ---------------------------------------------------------------------------

const PALM_PROMPTS: Record<PalmPromptId, PalmPromptDefinition> = {
  default: {
    meta: {
      id: "default",
      name: "기본 손금 해석",
      shortDescription: "전통 손금학 기반 종합 해석",
      target: "모든 학생",
      levels: "★★★☆☆",
      purpose: "주요 손금 식별, 성격, 운세 종합 분석",
      recommendedTiming: "첫 손금 분석 시",
      tags: ["종합", "기본", "생명선", "두뇌선"],
    },
    promptTemplate: PALM_READING_PROMPT,
  },

  "palm-talent": {
    meta: {
      id: "palm-talent",
      name: "손금으로 보는 재능 발견",
      shortDescription: "두뇌선/감정선 중심 재능 분석",
      target: "진로 고민 학생",
      levels: "★★★★☆",
      purpose: "타고난 재능과 잠재력 발견",
      recommendedTiming: "진로 상담 시, 재능 탐색 시",
      tags: ["재능", "잠재력", "두뇌선", "감정선"],
    },
    promptTemplate: `
너는 한국 전통 손금학을 기반으로 재능을 발견하는 전문가야.

학생 정보: {학생정보}
손 종류: {손종류} (왼손: 선천적 재능 / 오른손: 후천적 발전)

다음 지침을 따라 손바닥 사진에서 재능을 분석해주세요:

1. **두뇌선(Head Line) 분석**:
   - 길이: 사고의 깊이와 범위
   - 깊이: 집중력과 사고 명확도
   - 기울기: 현실적/이상적 사고 성향
   - 분기점: 다양한 재능 가능성
   - 재능 해석: 어떤 분야에 두뇌를 활용하면 좋을지

2. **감정선(Heart Line) 분석**:
   - 시작점: 감정 표현 스타일
   - 길이: 감정의 깊이와 지속성
   - 곡선도: 감정적/이성적 균형
   - 감수성 재능: 예술, 대인관계, 공감 능력

3. **생명선(Life Line) 분석**:
   - 활력도: 에너지 레벨과 체력
   - 곡선: 적극성과 활동 범위
   - 체력 기반 재능: 스포츠, 야외 활동, 지구력

4. **부속 손금**:
   - 운명선(Fate Line): 진로 방향성
   - 태양선(Sun Line): 성공 가능성이 높은 분야
   - 수성선(Mercury Line): 소통/비즈니스 재능

5. **종합 재능 도출**:
   - 3-5개의 구체적 재능 영역
   - 각 재능을 발전시키는 방법
   - 추천 활동 및 진로 분야

**추가 분석 요청사항**: {분석요청사항}

**중요:**
- 손금이 불분명하면 명확히 안내
- 과학적 근거가 없음을 명시
- 긍정적이고 격려하는 톤 유지
- 실천 가능한 구체적 재능 발전 방법 제시

**출력 형식 (JSON):**
{
  "handType": "왼손/오른손",
  "headLine": {
    "length": "길이 분석",
    "depth": "깊이 분석",
    "slope": "기울기 분석",
    "branches": "분기점 분석",
    "talentInterpretation": "두뇌 재능 해석"
  },
  "heartLine": {
    "start": "시작점 분석",
    "length": "길이 분석",
    "curve": "곡선도 분석",
    "talentInterpretation": "감성 재능 해석"
  },
  "lifeLine": {
    "vitality": "활력도 분석",
    "curve": "곡선 분석",
    "talentInterpretation": "체력 재능 해석"
  },
  "auxiliaryLines": {
    "fateLine": "운명선 분석 or null",
    "sunLine": "태양선 분석 or null",
    "mercuryLine": "수성선 분석 or null"
  },
  "discoveredTalents": [
    {
      "talent": "재능명",
      "description": "재능 설명",
      "development": "발전 방법",
      "activities": "추천 활동"
    }
  ],
  "careerSuggestions": ["진로1", "진로2", "진로3"],
  "overallInterpretation": "종합 해석",
  "clarity": "clear" | "unclear" | "partial",
  "disclaimer": "전통 손금학에 기반한 참고용 해석입니다."
}
`.trim(),
  },

  "palm-future": {
    meta: {
      id: "palm-future",
      name: "손금으로 보는 미래 운세",
      shortDescription: "운명선/생명선 중심 미래 예측",
      target: "진로 방향 고민 학생",
      levels: "★★★☆☆",
      purpose: "학업/진로 방향성 제시",
      recommendedTiming: "학년 전환기, 입시 준비 시",
      tags: ["운세", "미래", "운명선", "진로"],
    },
    promptTemplate: `
너는 한국 전통 손금학을 기반으로 미래 운세를 해석하는 전문가야.

학생 정보: {학생정보}
손 종류: {손종류} (왼손: 선천적 운 / 오른손: 후천적 노력)

다음 지침을 따라 손바닥 사진에서 미래 운세를 분석해주세요:

1. **운명선(Fate Line) 분석**:
   - 존재 여부: 운명선이 뚜렷한지 흐릿한지
   - 시작점: 진로 결정 시기 (일찍/늦게)
   - 방향성: 목표 지향적/유연한 진로
   - 분기/단절: 진로 전환 가능성
   - 학업/진로 운세: 앞으로 3-5년 예측

2. **생명선(Life Line) 분석**:
   - 길이와 깊이: 건강과 에너지
   - 곡선 형태: 활동 범위와 도전 의지
   - 변화 지점: 중요한 전환기 예상 시기
   - 생활 운세: 학창 시절 전반적 흐름

3. **두뇌선(Head Line) 미래 해석**:
   - 끝부분 방향: 진로 선택 성향 (현실적/창의적)
   - 학업 운세: 공부에서의 성과 예상
   - 시험/성적: 집중력 발휘 시기

4. **감정선(Heart Line) 미래 해석**:
   - 대인관계 운세: 친구/선생님과의 관계
   - 정서적 안정: 스트레스 관리 시기
   - 팀워크: 협력 프로젝트 적합 시기

5. **시기별 조언**:
   - 가까운 미래(1년): 집중할 영역
   - 중기(2-3년): 준비할 사항
   - 장기(4-5년): 목표 설정 방향

**추가 분석 요청사항**: {분석요청사항}

**중요:**
- 손금이 불분명하면 명확히 안내
- 과학적 근거가 없음을 명시
- 긍정적이고 격려하는 톤 유지
- 미래는 노력으로 바꿀 수 있음을 강조
- 구체적 시기보다 "가까운 미래/중기/장기" 방식으로 안내

**출력 형식 (JSON):**
{
  "handType": "왼손/오른손",
  "fateLine": {
    "clarity": "뚜렷함/흐릿함/없음",
    "start": "시작점 해석",
    "direction": "방향성 해석",
    "changes": "변화 지점 분석",
    "careerFortune": "학업/진로 운세"
  },
  "lifeLine": {
    "lengthDepth": "길이와 깊이",
    "curve": "곡선 형태",
    "turningPoints": "전환기 예상",
    "lifeFortune": "생활 운세"
  },
  "headLineFuture": {
    "endDirection": "끝부분 방향",
    "academicFortune": "학업 운세",
    "examPeriods": "시험 운세"
  },
  "heartLineFuture": {
    "relationshipFortune": "대인관계 운세",
    "emotionalStability": "정서 안정 시기",
    "teamwork": "협력 적합 시기"
  },
  "timelineAdvice": {
    "nearFuture": "1년 이내 조언",
    "midTerm": "2-3년 조언",
    "longTerm": "4-5년 조언"
  },
  "overallInterpretation": "종합 해석",
  "encouragement": "미래는 노력으로 바꿀 수 있다는 격려",
  "clarity": "clear" | "unclear" | "partial",
  "disclaimer": "전통 손금학에 기반한 참고용 해석입니다."
}
`.trim(),
  },
}

// ---------------------------------------------------------------------------
// Export 함수
// ---------------------------------------------------------------------------

/** UI 드롭다운용 메타 목록 */
export function getPromptOptions(): PalmPromptMeta[] {
  return Object.values(PALM_PROMPTS).map((p) => p.meta)
}

/** DB seed용 데이터 배열 */
export function getBuiltInSeedData() {
  return Object.values(PALM_PROMPTS).map((p, index) => ({
    analysisType: "palm" as const,
    promptKey: p.meta.id,
    name: p.meta.name,
    shortDescription: p.meta.shortDescription,
    target: p.meta.target,
    levels: p.meta.levels,
    purpose: p.meta.purpose,
    recommendedTiming: p.meta.recommendedTiming,
    tags: p.meta.tags,
    promptTemplate: p.promptTemplate,
    sortOrder: index,
  }))
}

/** 특정 프롬프트 조회 */
export function getPalmPrompt(id: PalmPromptId): PalmPromptDefinition | undefined {
  return PALM_PROMPTS[id]
}
