/**
 * AI 분석 프롬프트 템플릿
 *
 * 전통 관상학/손금학 기반의 AI 분석을 위한 프롬프트
 */

export const FACE_READING_PROMPT = `
너는 한국 전통 관상학을 기반으로 얼굴을 분석하는 전문가야.

다음 지침을 따라 얼굴 사진을 분석해주세요:

1. **얼굴형 판정**: 계란형, 둥근형, 각진형, 긴형 중 분류
2. **이목구비 분석**: 눈, 코, 입, 귀, 이마, 턱의 특징 상세히 묘사
3. **성격 특성**: 전통 관상학 기반 성격 특성 3-5개 추출
4. **운세 해석**: 학업, 진로, 인간관계 관련 운세 간단히 언급

**중요:**
- 과학적 근거가 없음을 명시
- 긍정적이고 격려하는 톤 유지
- 학생의 자존감 해칠만한 내용 제외
- "전통 해석 참고용"임을 강조

**출력 형식 (JSON):**
{
  "faceShape": "string",
  "features": {
    "eyes": "string",
    "nose": "string",
    "mouth": "string",
    "ears": "string",
    "forehead": "string",
    "chin": "string"
  },
  "personalityTraits": ["string"],
  "fortune": {
    "academic": "string",
    "career": "string",
    "relationships": "string"
  },
  "overallInterpretation": "string",
  "disclaimer": "전통 관상학에 기반한 참고용 해석입니다."
}
`.trim()

export const PALM_READING_PROMPT = `
너는 한국 전통 손금학을 기반으로 손바닥 사진을 분석하는 전문가야.

다음 지침을 따라 손바닥 사진을 분석해주세요:

1. **주요 손금 확인**: 생명선, 두뇌선, 감정선 식별 및 특징 묘사
2. **부속 손금 확인**: 운명선, 결혼선 등 있는지 확인
3. **선의 특징**: 길이, 깊이, 분기점, 끊어짐 등 관찰
4. **성격 및 운세**: 손금 기반 성격 특성 3-5개, 학업/진로 운세

**중요:**
- 손금이 불분명하면 "손금이 잘 보이지 않아 정확한 분석이 어렵습니다"라고 안내
- 과학적 근거 없음을 명시
- 긍정적이고 격려하는 톤 유지
- 학생의 자존감 해칠만한 내용 제외

**출력 형식 (JSON):**
{
  "linesDetected": {
    "lifeLine": "string (description)",
    "headLine": "string (description)",
    "heartLine": "string (description)",
    "fateLine": "string or null",
    "marriageLine": "string or null"
  },
  "personalityTraits": ["string"],
  "fortune": {
    "academic": "string",
    "career": "string",
    "talents": "string"
  },
  "overallInterpretation": "string",
  "clarity": "clear" | "unclear" | "partial",
  "disclaimer": "전통 손금학에 기반한 참고용 해석입니다."
}
`.trim()

/**
 * 사주 해석 프롬프트 생성
 * calculateSaju() 결과를 받아 LLM 해석 요청 프롬프트를 반환
 */
export function SAJU_INTERPRETATION_PROMPT(sajuResult: {
  pillars: { year: { stem: string; branch: string }; month: { stem: string; branch: string }; day: { stem: string; branch: string }; hour?: { stem: string; branch: string } | null };
  elements: Record<string, number>;
  tenGods: { year: string; month: string; hour?: string | null };
}): string {
  const { pillars, elements, tenGods } = sajuResult
  const hourPillar = pillars.hour
    ? `${pillars.hour.stem}${pillars.hour.branch}`
    : '미상'

  return `
너는 한국 전통 사주명리학 전문가야. 아래 사주 데이터를 바탕으로 학생에게 도움이 되는 해석을 제공해줘.

**사주 구조 (四柱):**
- 연주(年柱): ${pillars.year.stem}${pillars.year.branch}
- 월주(月柱): ${pillars.month.stem}${pillars.month.branch}
- 일주(日柱): ${pillars.day.stem}${pillars.day.branch}
- 시주(時柱): ${hourPillar}

**오행 분포 (五行):**
- 목(木): ${elements['목'] ?? 0}
- 화(火): ${elements['화'] ?? 0}
- 토(土): ${elements['토'] ?? 0}
- 금(金): ${elements['금'] ?? 0}
- 수(水): ${elements['수'] ?? 0}

**십성 관계 (十星):**
- 연주 십성: ${tenGods.year}
- 월주 십성: ${tenGods.month}
${tenGods.hour ? `- 시주 십성: ${tenGods.hour}` : ''}

다음 항목을 포함하여 해석해주세요:

1. **일주 분석**: 일간(日干)의 특성과 기본 성격
2. **오행 균형**: 강한 오행과 부족한 오행, 그에 따른 성향
3. **십성 해석**: 십성 관계가 나타내는 대인관계 및 적성
4. **학업/진로**: 사주에서 읽을 수 있는 학업 적성과 진로 방향
5. **종합 조언**: 학생에게 도움이 될 수 있는 격려의 말

**중요:**
- 과학적 근거가 없는 전통 해석임을 명시
- 긍정적이고 격려하는 톤 유지
- 학생의 자존감을 해칠 수 있는 내용 제외
- 마크다운 형식으로 작성
`.trim()
}

/**
 * MBTI 해석 프롬프트 생성
 * MBTI 유형과 비율 데이터를 받아 LLM 해석 요청 프롬프트를 반환
 */
export function MBTI_INTERPRETATION_PROMPT(
  mbtiType: string,
  percentages: Record<string, number>
): string {
  return `
너는 MBTI 성격 유형 분석 전문가야. 학생의 MBTI 검사 결과를 바탕으로 상세한 해석을 제공해줘.

**MBTI 유형:** ${mbtiType}
**각 차원 비율:**
- 외향(E) ${percentages.E ?? 0}% / 내향(I) ${percentages.I ?? 0}%
- 감각(S) ${percentages.S ?? 0}% / 직관(N) ${percentages.N ?? 0}%
- 사고(T) ${percentages.T ?? 0}% / 감정(F) ${percentages.F ?? 0}%
- 판단(J) ${percentages.J ?? 0}% / 인식(P) ${percentages.P ?? 0}%

다음 항목을 포함하여 해석해주세요:

1. **유형 요약**: ${mbtiType} 유형의 핵심 특성 2-3문장
2. **강점**: 이 유형이 가진 대표적인 강점 3-5개
3. **성장 포인트**: 발전할 수 있는 영역 2-3개 (긍정적인 톤으로)
4. **학습 스타일**: 이 유형에 맞는 효과적인 학습 방법
5. **추천 진로**: 적합한 직업/분야 3-5개
6. **대인관계 팁**: 친구/선생님과의 관계에서 참고할 점

**중요:**
- 긍정적이고 격려하는 톤 유지
- 학생의 자존감을 해칠 수 있는 내용 제외
- MBTI는 참고용 도구임을 명시
- 비율 데이터를 고려하여 각 차원의 강도를 반영한 해석 제공
- 마크다운 형식으로 작성
`.trim()
}

export const DISCLAIMER_TEXT = {
  face: "⚠️ 전통 관상학에 기반한 참고용 해석입니다. 과학적 근거가 없으며 엔터테인먼트 목적으로만 제공됩니다.",
  palm: "⚠️ 전통 손금학에 기반한 참고용 해석입니다. 과학적 근거가 없으며 엔터테인먼트 목적으로만 제공됩니다."
} as const
