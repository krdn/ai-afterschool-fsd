/**
 * 이름풀이(작명학) 분석 프롬프트 정의
 */

export type NamePromptId = "default" | "name-meaning" | "name-fortune"

export type NamePromptDefinition = {
  meta: {
    id: NamePromptId
    name: string
    shortDescription: string
    target: string
    levels: string
    purpose: string
    recommendedTiming: string
    tags: string[]
  }
  buildPrompt: (name: string, context?: { birthDate?: string; hanjaName?: string; numerologyResult?: string }) => string
}

const NAME_PROMPTS: Record<NamePromptId, NamePromptDefinition> = {
  default: {
    meta: {
      id: "default",
      name: "기본 이름풀이",
      shortDescription: "이름의 뜻, 기운, 성격 특성 해석",
      target: "모든 학생",
      levels: "★★★☆☆",
      purpose: "이름에 담긴 의미와 에너지를 분석하여 성격/잠재력 해석",
      recommendedTiming: "첫 상담, 학기 초",
      tags: ["종합", "기본", "이름", "작명"],
    },
    buildPrompt: (name, context) => {
      const hanjaInfo = context?.hanjaName ? `\n**한자 이름:** ${context.hanjaName}` : ""
      const numerology = context?.numerologyResult ? `\n\n**성명학 수리 분석 결과:**\n${context.numerologyResult}` : ""

      return `
너는 한국 전통 작명학/이름풀이 전문가야. 학생의 이름에 담긴 의미와 기운을 분석하여 학업과 성장에 도움이 되는 해석을 제공해줘.

**학생 이름:** ${name}${hanjaInfo}${context?.birthDate ? `\n**생년월일:** ${context.birthDate}` : ""}${numerology}

다음 항목을 포함하여 이름풀이를 해주세요:

1. **이름 음운 분석**: 각 글자의 소리(음운)가 가진 에너지와 의미
2. **오행 연결**: 이름의 음운이 오행(목화토금수)과 어떻게 연결되는지${context?.hanjaName ? "\n3. **한자 의미 분석**: 각 한자의 뜻과 획수가 나타내는 특성" : "\n3. **한글 의미 탐색**: 한글 이름에서 읽을 수 있는 의미와 느낌"}
4. **성격 특성**: 이름에서 읽히는 성격적 강점과 잠재력
5. **학업 운**: 이름의 기운이 학업에 미치는 영향
6. **종합 메시지**: 이름에 담긴 부모의 바람과 학생에게 보내는 격려

**중요:**
- 작명학/이름풀이는 전통 문화적 해석이며 과학적 근거는 아님을 명시
- 긍정적이고 격려하는 톤 유지
- 마크다운 형식으로 작성
`.trim()
    },
  },

  "name-meaning": {
    meta: {
      id: "name-meaning",
      name: "이름 의미 깊이 분석",
      shortDescription: "음운학/한자학 기반 이름의 숨은 의미 탐구",
      target: "이름의 깊은 뜻이 궁금한 학생",
      levels: "★★★★☆",
      purpose: "한글 음운학 및 한자학 관점에서 이름의 다층적 의미 분석",
      recommendedTiming: "자아 탐색, 정체성 고민 시",
      tags: ["음운", "한자", "의미", "정체성"],
    },
    buildPrompt: (name, context) => {
      const hanjaInfo = context?.hanjaName ? `\n**한자 이름:** ${context.hanjaName}` : ""
      return `
너는 한글 음운학과 한자학에 정통한 이름 분석 전문가야. ${name} 학생의 이름을 다층적으로 분석해줘.

**학생 이름:** ${name}${hanjaInfo}

다음을 포함하여 깊이 있는 이름 분석을 해주세요:

1. **한글 음운 에너지**: 초성/중성/종성 각각의 음운 에너지 분석
2. **소리의 인상**: 이름을 불렀을 때 주는 음성학적 느낌과 이미지
3. **이름의 스토리**: 각 글자가 만들어내는 이야기${context?.hanjaName ? "\n4. **한자 심층 분석**: 각 한자의 부수, 획수, 역사적 의미" : "\n4. **순한글 이름의 가치**: 한글 이름만의 고유한 아름다움"}
5. **이름과 정체성**: 이름이 자아 형성에 미치는 심리적 영향
6. **이름의 잠재력**: 이 이름이 가진 최고의 가능성

**중요:** 긍정적 톤, 마크다운 형식
`.trim()
    },
  },

  "name-fortune": {
    meta: {
      id: "name-fortune",
      name: "이름 운세 & 성명학",
      shortDescription: "수리/오행 기반 이름 운세 해석",
      target: "이름의 운세가 궁금한 학생",
      levels: "★★★★★",
      purpose: "성명학 수리 기반으로 이름의 운세와 기운 흐름 해석",
      recommendedTiming: "진로 고민, 중요 결정 시",
      tags: ["운세", "수리", "오행", "성명학"],
    },
    buildPrompt: (name, context) => {
      const hanjaInfo = context?.hanjaName ? `\n**한자 이름:** ${context.hanjaName}` : ""
      const numerology = context?.numerologyResult ? `\n\n**성명학 수리 분석:**\n${context.numerologyResult}` : ""

      return `
너는 성명학(작명학) 수리 분석 전문가야. ${name} 학생의 이름에 담긴 운세와 기운을 분석해줘.

**학생 이름:** ${name}${hanjaInfo}${context?.birthDate ? `\n**생년월일:** ${context.birthDate}` : ""}${numerology}

다음을 포함하여 이름 운세를 분석해주세요:

1. **이름의 총운**: 이름이 가진 전반적인 운세 흐름
2. **학업운**: 이름의 기운이 학업 성취에 미치는 영향
3. **대인운**: 이름이 대인관계에 미치는 에너지
4. **진로운**: 이름에서 읽히는 적성과 진로 방향
5. **시기별 운세**: 현재 시기에 이름의 에너지가 어떻게 작용하는지
6. **이름 활용법**: 이름의 좋은 기운을 극대화하는 생활 팁

**중요:**
- 성명학은 전통 문화적 해석이며 참고용
- 긍정적이고 격려하는 톤
- 마크다운 형식으로 작성
`.trim()
    },
  },
}

/** UI 드롭다운용 메타 목록 */
export function getPromptOptions() {
  return Object.values(NAME_PROMPTS).map((p) => p.meta)
}

/** DB seed용 데이터 */
export function getBuiltInSeedData() {
  return Object.values(NAME_PROMPTS).map((p, index) => ({
    analysisType: "name" as const,
    promptKey: p.meta.id,
    name: p.meta.name,
    shortDescription: p.meta.shortDescription,
    target: p.meta.target,
    levels: p.meta.levels,
    purpose: p.meta.purpose,
    recommendedTiming: p.meta.recommendedTiming,
    tags: p.meta.tags,
    promptTemplate: p.buildPrompt("김예진", { hanjaName: "金禮眞" }),
    sortOrder: index,
  }))
}

/** 특정 프롬프트 조회 */
export function getNamePrompt(id: NamePromptId): NamePromptDefinition | undefined {
  return NAME_PROMPTS[id]
}
