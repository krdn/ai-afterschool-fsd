/**
 * 관상 분석 전문 프롬프트 정의
 *
 * 학생 관상 분석 프롬프트 3종 + 기본 프롬프트
 */

import { FACE_READING_PROMPT } from "./base"

// ---------------------------------------------------------------------------
// 타입 정의
// ---------------------------------------------------------------------------

export type FacePromptId = "default" | "face-personality" | "face-academic"

export type FacePromptMeta = {
  id: FacePromptId
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

export type FacePromptDefinition = {
  meta: FacePromptMeta
  promptTemplate: string
}

// ---------------------------------------------------------------------------
// 프롬프트 정의
// ---------------------------------------------------------------------------

const FACE_PROMPTS: Record<FacePromptId, FacePromptDefinition> = {
  default: {
    meta: {
      id: "default",
      name: "기본 관상 해석",
      shortDescription: "전통 관상학 기반 종합 해석",
      target: "모든 학생",
      levels: "★★★☆☆",
      purpose: "얼굴형, 이목구비, 성격, 운세를 종합적으로 분석",
      recommendedTiming: "첫 관상 분석 시",
      tags: ["종합", "기본", "얼굴형", "이목구비"],
    },
    promptTemplate: FACE_READING_PROMPT,
  },

  "face-personality": {
    meta: {
      id: "face-personality",
      name: "관상으로 보는 성격 심층 분석",
      shortDescription: "이목구비별 성격 특성 세밀 분석",
      target: "성격 이해가 필요한 학생",
      levels: "★★★★☆",
      purpose: "대인관계 스타일, 감정 표현 방식, 성격 강점 파악",
      recommendedTiming: "학생과의 관계 형성 초기, 상담 전",
      tags: ["성격", "대인관계", "감정", "심층"],
    },
    promptTemplate: `
너는 한국 전통 관상학을 기반으로 성격을 심층 분석하는 전문가야.

학생 정보: {학생정보}

다음 지침을 따라 얼굴 사진에서 성격 특성을 심층 분석해주세요:

1. **이목구비별 성격 분석**:
   - 눈: 지적 호기심, 관찰력, 내적 에너지
   - 코: 자존심, 의지력, 주도성
   - 입: 표현력, 소통 스타일, 포용력
   - 귀: 경청 능력, 학습 수용력
   - 이마: 사고력, 계획성, 미래 지향성
   - 턱: 실행력, 끈기, 결단력

2. **대인관계 스타일**:
   - 친구 관계: 리더형/조력형/독립형 등
   - 선생님과의 관계: 적극형/수동형/협력형 등
   - 갈등 해결 방식: 직접 해결/회피/중재 선호 등

3. **감정 표현 방식**:
   - 내면 감정과 외면 표현의 일치도
   - 스트레스 대응 방식
   - 긍정/부정 감정 표출 성향

4. **성격 강점 3-5개**:
   - 학생이 가진 고유한 성격 강점 발견
   - 각 강점을 어떻게 활용하면 좋을지 구체적 조언

**추가 분석 요청사항**: {분석요청사항}

**중요:**
- 과학적 근거가 없음을 명시
- 긍정적이고 격려하는 톤 유지
- 학생의 자존감 해칠만한 내용 제외
- "전통 해석 참고용"임을 강조

**출력 형식 (JSON):**
{
  "faceShape": "string",
  "featurePersonality": {
    "eyes": "지적 특성 설명",
    "nose": "의지력 특성 설명",
    "mouth": "소통 스타일 설명",
    "ears": "학습 수용력 설명",
    "forehead": "사고력 특성 설명",
    "chin": "실행력 특성 설명"
  },
  "relationshipStyle": {
    "friends": "친구 관계 스타일",
    "teachers": "선생님과의 관계 스타일",
    "conflictResolution": "갈등 해결 방식"
  },
  "emotionalExpression": {
    "alignment": "감정 일치도 분석",
    "stressResponse": "스트레스 대응 방식",
    "expressionPattern": "감정 표출 성향"
  },
  "strengths": ["강점1", "강점2", "강점3"],
  "adviceForStrengths": "강점 활용 조언",
  "overallInterpretation": "종합 해석",
  "disclaimer": "전통 관상학에 기반한 참고용 해석입니다."
}
`.trim(),
  },

  "face-academic": {
    meta: {
      id: "face-academic",
      name: "관상 기반 학업 적성 분석",
      shortDescription: "집중력, 사고력, 창의력 기반 학업 분석",
      target: "학업 지도가 필요한 학생",
      levels: "★★★★☆",
      purpose: "학업 적성 파악, 효과적인 학습법 제안",
      recommendedTiming: "학습 계획 수립 시, 성적 고민 상담 시",
      tags: ["학업", "적성", "학습법", "집중력"],
    },
    promptTemplate: `
너는 한국 전통 관상학을 기반으로 학업 적성을 분석하는 전문가야.

학생 정보: {학생정보}

다음 지침을 따라 얼굴 사진에서 학업 적성을 분석해주세요:

1. **집중력 분석** (눈 + 이마):
   - 시각적 집중력
   - 지속 가능 집중 시간
   - 외부 자극에 대한 영향도
   - 집중력 향상 방법

2. **사고력 분석** (이마 + 눈썹):
   - 논리적/직관적 사고 성향
   - 분석력 vs 종합력
   - 추상적/구체적 사고 선호도
   - 사고력 활용 방법

3. **창의력 분석** (전체적 조화):
   - 창의적 사고 가능성
   - 문제 해결 접근 방식
   - 예술적/과학적 창의성
   - 창의력 발현 영역

4. **학습 스타일 제안**:
   - 시각형/청각형/체험형 학습 선호도
   - 독학 vs 그룹 학습 적합도
   - 단기 집중 vs 장기 계획 학습
   - 과목별 학습 전략 (문과/이과)

5. **추천 학습법 3-5개**:
   - 학생의 특성에 맞는 구체적 학습법
   - 시간 관리 팁
   - 동기 부여 방법

**추가 분석 요청사항**: {분석요청사항}

**중요:**
- 과학적 근거가 없음을 명시
- 긍정적이고 격려하는 톤 유지
- 학생의 자존감 해칠만한 내용 제외
- 실천 가능한 구체적 조언 제공

**출력 형식 (JSON):**
{
  "faceShape": "string",
  "concentration": {
    "visualFocus": "시각 집중력 분석",
    "duration": "지속 시간 예상",
    "distraction": "외부 자극 영향도",
    "improvement": "집중력 향상 방법"
  },
  "thinking": {
    "style": "논리적/직관적",
    "strength": "분석력/종합력",
    "preference": "추상적/구체적",
    "utilization": "사고력 활용법"
  },
  "creativity": {
    "potential": "창의력 가능성",
    "approach": "문제 해결 방식",
    "type": "예술적/과학적",
    "areas": "발현 영역"
  },
  "learningStyle": {
    "modality": "시각형/청각형/체험형",
    "setting": "독학/그룹",
    "pace": "단기/장기",
    "subjects": "과목별 전략"
  },
  "recommendedMethods": ["학습법1", "학습법2", "학습법3"],
  "timeManagement": "시간 관리 팁",
  "motivation": "동기 부여 방법",
  "overallInterpretation": "종합 해석",
  "disclaimer": "전통 관상학에 기반한 참고용 해석입니다."
}
`.trim(),
  },
}

// ---------------------------------------------------------------------------
// Export 함수
// ---------------------------------------------------------------------------

/** UI 드롭다운용 메타 목록 */
export function getPromptOptions(): FacePromptMeta[] {
  return Object.values(FACE_PROMPTS).map((p) => p.meta)
}

/** DB seed용 데이터 배열 */
export function getBuiltInSeedData() {
  return Object.values(FACE_PROMPTS).map((p, index) => ({
    analysisType: "face" as const,
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
export function getFacePrompt(id: FacePromptId): FacePromptDefinition | undefined {
  return FACE_PROMPTS[id]
}
