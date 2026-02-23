/**
 * 별자리 운세 분석 프롬프트 정의
 */

export type ZodiacPromptId = "default" | "zodiac-learning" | "zodiac-relationship"

export type ZodiacPromptDefinition = {
  meta: {
    id: ZodiacPromptId
    name: string
    shortDescription: string
    target: string
    levels: string
    purpose: string
    recommendedTiming: string
    tags: string[]
  }
  buildPrompt: (zodiacName: string, element: string, traits: string[], studentName?: string) => string
}

const ZODIAC_PROMPTS: Record<ZodiacPromptId, ZodiacPromptDefinition> = {
  default: {
    meta: {
      id: "default",
      name: "기본 별자리 해석",
      shortDescription: "별자리 성격/강점/학습 스타일 종합 해석",
      target: "모든 학생",
      levels: "★★★☆☆",
      purpose: "별자리 기반 성격 특성과 학습 스타일 종합 분석",
      recommendedTiming: "학기 초, 첫 상담 시",
      tags: ["종합", "기본", "성격", "학습"],
    },
    buildPrompt: (zodiacName, element, traits, studentName) => `
너는 별자리 성향 분석 전문가야. ${studentName ?? "학생"}의 별자리 특성을 기반으로 학업과 성장에 도움이 되는 해석을 제공해줘.

**별자리:** ${zodiacName}
**원소:** ${element}
**주요 성격 특성:** ${traits.join(", ")}

다음 항목을 포함하여 해석해주세요:

1. **성격 특성 분석**: 별자리가 나타내는 기본 성격과 행동 패턴
2. **강점과 잠재력**: 학업/사회 활동에서 빛나는 장점들
3. **성장 포인트**: 보완하면 좋을 부분과 개선 방법
4. **학습 스타일**: 별자리 특성에 맞는 효과적인 학습법
5. **대인관계**: 친구/선생님과의 관계에서 강점과 주의점
6. **종합 조언**: 학생에게 보내는 격려와 실천 팁

**중요:**
- 별자리 분석은 재미와 참고를 위한 것이며 과학적 근거는 아님을 명시
- 긍정적이고 격려하는 톤 유지
- 마크다운 형식으로 작성
`.trim(),
  },

  "zodiac-learning": {
    meta: {
      id: "zodiac-learning",
      name: "별자리별 학습 전략",
      shortDescription: "원소/별자리 특성에 맞는 최적 학습법 제안",
      target: "학습 방법 고민 학생",
      levels: "★★★★☆",
      purpose: "별자리 원소와 특성에 맞춘 과목별 학습 전략 제시",
      recommendedTiming: "새 학기 시작, 시험 준비 시",
      tags: ["학습", "공부법", "전략"],
    },
    buildPrompt: (zodiacName, element, traits, studentName) => `
너는 별자리 기반 학습 코칭 전문가야. ${studentName ?? "학생"}의 별자리 특성에 맞는 학습 전략을 제안해줘.

**별자리:** ${zodiacName}
**원소:** ${element}
**주요 성격 특성:** ${traits.join(", ")}

다음 항목을 포함하여 학습 전략을 제안해주세요:

1. **원소별 학습 DNA**: ${element} 원소의 학습 에너지 특성
2. **최적 공부법 5가지**: 별자리에 맞는 구체적 학습 방법
3. **과목별 접근법**: 국어/영어/수학/사회/과학 각 과목별 팁
4. **시간 관리**: 별자리 에너지 리듬에 맞는 시간표 제안
5. **집중력 유지법**: 별자리 특성에 맞는 집중 전략
6. **동기 부여**: 슬럼프 탈출을 위한 맞춤 방법
7. **실천 플랜**: 이번 주부터 시작할 3가지

**중요:**
- 실천 가능한 구체적 방법 제시
- 긍정적 톤 유지, 별자리 분석은 참고용
- 마크다운 형식으로 작성
`.trim(),
  },

  "zodiac-relationship": {
    meta: {
      id: "zodiac-relationship",
      name: "별자리 대인관계 가이드",
      shortDescription: "별자리 호환성 및 소통 전략",
      target: "대인관계 고민 학생",
      levels: "★★★☆☆",
      purpose: "별자리 간 호환성과 소통 전략 제시",
      recommendedTiming: "학기 초, 관계 고민 시",
      tags: ["대인관계", "소통", "호환성"],
    },
    buildPrompt: (zodiacName, element, traits, studentName) => `
너는 별자리 기반 대인관계 코칭 전문가야. ${studentName ?? "학생"}의 별자리 특성에 맞는 대인관계 가이드를 제공해줘.

**별자리:** ${zodiacName}
**원소:** ${element}
**주요 성격 특성:** ${traits.join(", ")}

다음 항목을 포함하여 대인관계 가이드를 제공해주세요:

1. **소통 스타일**: ${zodiacName}의 의사소통 특성
2. **친구 관계**: 잘 맞는 별자리와 주의할 별자리
3. **원소별 호환성**: 불/흙/바람/물 원소 간 관계
4. **갈등 해결**: 별자리 특성에 맞는 갈등 대처법
5. **팀워크**: 그룹 활동에서의 역할과 강점
6. **실천 팁**: 관계 개선을 위한 구체적 행동 3가지

**중요:**
- 긍정적 톤 유지, 별자리 분석은 참고용
- 마크다운 형식으로 작성
`.trim(),
  },
}

/** UI 드롭다운용 메타 목록 */
export function getPromptOptions() {
  return Object.values(ZODIAC_PROMPTS).map((p) => p.meta)
}

/** DB seed용 데이터 */
export function getBuiltInSeedData() {
  return Object.values(ZODIAC_PROMPTS).map((p, index) => ({
    analysisType: "zodiac" as const,
    promptKey: p.meta.id,
    name: p.meta.name,
    shortDescription: p.meta.shortDescription,
    target: p.meta.target,
    levels: p.meta.levels,
    purpose: p.meta.purpose,
    recommendedTiming: p.meta.recommendedTiming,
    tags: p.meta.tags,
    promptTemplate: p.buildPrompt("양자리", "fire", ["리더십", "용기", "열정"]),
    sortOrder: index,
  }))
}

/** 특정 프롬프트 조회 */
export function getZodiacPrompt(id: ZodiacPromptId): ZodiacPromptDefinition | undefined {
  return ZODIAC_PROMPTS[id]
}
