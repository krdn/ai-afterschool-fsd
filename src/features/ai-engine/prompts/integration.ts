/**
 * 통합 분석 프롬프트 (학습 전략 + 진로 가이드)
 *
 * 통합 성향 분석 데이터를 기반으로 맞춤형 학습 전략/진로 가이드 프롬프트
 */

import type { UnifiedPersonalityData } from "./counseling"

/**
 * 학습 전략 생성 프롬프트 빌더
 * 통합 성향 분석 데이터를 기반으로 맞춤형 학습 전략 생성 프롬프트 반환
 *
 * @param data - 통합 성향 데이터
 * @param studentInfo - 학생 기본 정보
 * @returns Claude AI용 학습 전략 생성 프롬프트
 */
export function buildLearningStrategyPrompt(
  data: UnifiedPersonalityData,
  studentInfo: { name: string; grade: number; targetMajor?: string | null }
): string {
  // 사용 가능한 분석 타입 동적 감지
  const availableAnalyses: string[] = []
  if (data.saju.result) availableAnalyses.push('사주')
  if (data.name.result) availableAnalyses.push('성명학')
  if (data.mbti.result) availableAnalyses.push('MBTI')
  if (data.face.result) availableAnalyses.push('관상')
  if (data.palm.result) availableAnalyses.push('손금')

  // 각 분석의 해석/결과를 포맷팅
  let analysisDetails = ''

  if (data.saju.interpretation) {
    analysisDetails += `## 사주 해석\n${data.saju.interpretation}\n\n`
  }

  if (data.name.interpretation) {
    analysisDetails += `## 성명학 해석\n${data.name.interpretation}\n\n`
  }

  if (data.mbti.result) {
    analysisDetails += `## MBTI 유형\n${data.mbti.result.mbtiType}\n`
    analysisDetails += `비율: ${Object.entries(data.mbti.result.percentages)
      .map(([key, value]) => `${key}: ${value}%`)
      .join(', ')}\n\n`
  }

  if (data.face.result) {
    const faceResult = data.face.result as { personalityTraits?: string[] }
    if (faceResult.personalityTraits && faceResult.personalityTraits.length > 0) {
      analysisDetails += `## 관상 성격 특성\n${faceResult.personalityTraits.join(', ')}\n\n`
    }
  }

  if (data.palm.result) {
    const palmResult = data.palm.result as { personalityTraits?: string[] }
    if (palmResult.personalityTraits && palmResult.personalityTraits.length > 0) {
      analysisDetails += `## 손금 성격 특성\n${palmResult.personalityTraits.join(', ')}\n\n`
    }
  }

  return `
너는 한국 학생들을 위한 맞춤형 학습 전략 전문가야.

학생 정보:
- 이름: ${studentInfo.name}
- 학년: ${studentInfo.grade}학년
- 목표 학과: ${studentInfo.targetMajor || '미정'}

분석 가능한 데이터 (${availableAnalyses.join(', ')}):

${analysisDetails}

위 정보를 바탕으로 다음을 제공해주세요:

1. **핵심 성향 요약** (3-5문장)
   - 학생의 주요 성격 특성과 학습 스타일 경향

2. **학습 스타일**
   - type: 시각|청각|운동|혼합 (가장 선호하는 학습 방식)
   - description: 학습 스타일에 대한 설명 (2-3문장)
   - focusMethod: 집력 방법 제안 (2-3문장)

3. **과목별 접근법** (각 2-3문장)
   - korean: 국어 공부 방법
   - math: 수학 공부 방법
   - english: 영어 공부 방법
   - science: 과학 공부 방법
   - social: 사회 공부 방법

4. **학습 효율화 팁** (3-5개 구체적인 제안)
   - 학생의 성향에 맞는 효율화 전략

5. **동기 부여 방법** (3-5문장)
   - 학생의 성향에 맞는 동기화 전략

**중요:**
- 데이터가 부족한 분석은 무시하고 사용 가능한 데이터만 활용해주세요
- 긍정적이고 격려하는 톤을 유지해주세요
- 구체적이고 실행 가능한 조언을 제공해주세요
- 학생의 자존감을 높이는 방향으로 작성해주세요
- 과학적 근거가 제한적임을 감안하여 "참고용"임을 명시해주세요

**출력 형식 (JSON):**
{
  "coreTraits": "string (3-5문장)",
  "learningStyle": {
    "type": "시각|청각|운동|혼합",
    "description": "string (2-3문장)",
    "focusMethod": "string (2-3문장)"
  },
  "subjectStrategies": {
    "korean": "string (2-3문장)",
    "math": "string (2-3문장)",
    "english": "string (2-3문장)",
    "science": "string (2-3문장)",
    "social": "string (2-3문장)"
  },
  "efficiencyTips": ["string", ...],
  "motivationApproach": "string (3-5문장)"
}
`.trim()
}

/**
 * 진로 가이드 생성 프롬프트 빌더
 * 통합 성향 분석 데이터를 기반으로 맞춤형 진로 가이드 생성 프롬프트 반환
 *
 * @param data - 통합 성향 데이터
 * @param studentInfo - 학생 기본 정보
 * @returns Claude AI용 진로 가이드 생성 프롬프트
 */
export function buildCareerGuidancePrompt(
  data: UnifiedPersonalityData,
  studentInfo: { name: string; grade: number; targetMajor?: string | null }
): string {
  // 사용 가능한 분석 타입 동적 감지
  const availableAnalyses: string[] = []
  if (data.saju.result) availableAnalyses.push('사주')
  if (data.name.result) availableAnalyses.push('성명학')
  if (data.mbti.result) availableAnalyses.push('MBTI')
  if (data.face.result) availableAnalyses.push('관상')
  if (data.palm.result) availableAnalyses.push('손금')

  // 각 분석의 해석/결과를 포맷팅
  let analysisDetails = ''

  if (data.saju.interpretation) {
    analysisDetails += `## 사주 해석\n${data.saju.interpretation}\n\n`
  }

  if (data.name.interpretation) {
    analysisDetails += `## 성명학 해석\n${data.name.interpretation}\n\n`
  }

  if (data.mbti.result) {
    analysisDetails += `## MBTI 유형\n${data.mbti.result.mbtiType}\n`
    analysisDetails += `비율: ${Object.entries(data.mbti.result.percentages)
      .map(([key, value]) => `${key}: ${value}%`)
      .join(', ')}\n\n`
  }

  if (data.face.result) {
    const faceResult = data.face.result as { personalityTraits?: string[]; fortune?: { career?: string } }
    if (faceResult.personalityTraits && faceResult.personalityTraits.length > 0) {
      analysisDetails += `## 관상 성격 특성\n${faceResult.personalityTraits.join(', ')}\n\n`
    }
    if (faceResult.fortune?.career) {
      analysisDetails += `## 관상 진로 운세\n${faceResult.fortune.career}\n\n`
    }
  }

  if (data.palm.result) {
    const palmResult = data.palm.result as { personalityTraits?: string[]; fortune?: { career?: string; talents?: string } }
    if (palmResult.personalityTraits && palmResult.personalityTraits.length > 0) {
      analysisDetails += `## 손금 성격 특성\n${palmResult.personalityTraits.join(', ')}\n\n`
    }
    if (palmResult.fortune?.career) {
      analysisDetails += `## 손금 진로 운세\n${palmResult.fortune.career}\n\n`
    }
    if (palmResult.fortune?.talents) {
      analysisDetails += `## 손금 재능\n${palmResult.fortune.talents}\n\n`
    }
  }

  return `
너는 한국 학생들을 위한 맞춤형 진로 가이드 전문가야.

학생 정보:
- 이름: ${studentInfo.name}
- 학년: ${studentInfo.grade}학년
- 목표 학과: ${studentInfo.targetMajor || '미정'}

분석 가능한 데이터 (${availableAnalyses.join(', ')}):

${analysisDetails}

위 정보를 바탕으로 다음을 제공해주세요:

1. **핵심 성향 요약** (3-5문장)
   - 학생의 주요 성격 특성과 진로 적성

2. **적성 학과 추천** (3-10개)
   - name: 학과명
   - reason: 추천 이유 (2-3문장)
   - matchScore: 적합도 점수 (1-100)

3. **진로 경로 추천** (3-7개)
   - field: 분야 (예: 기술, 의료, 교육, 예술 등)
   - roles: 구체직종 리스트 (3-5개)
   - reasoning: 추천 이유 (2-3문장)

4. **개발 제안** (3-7개 구체적인 제안)
   - 해당 진로를 위한 준비 방안

**중요:**
- 데이터가 부족한 분석은 무시하고 사용 가능한 데이터만 활용해주세요
- 긍정적이고 격려하는 톤을 유지해주세요
- 구체적이고 실행 가능한 조언을 제공해주세요
- 학생의 목표 학과가 있다면 이를 고려해주세요
- 과학적 근거가 제한적임을 감안하여 "참고용"임을 명시해주세요

**출력 형식 (JSON):**
{
  "coreTraits": "string (3-5문장)",
  "suitableMajors": [
    {
      "name": "string (학과명)",
      "reason": "string (2-3문장)",
      "matchScore": number (1-100)
    }
  ],
  "careerPaths": [
    {
      "field": "string (분야)",
      "roles": ["string", ...],
      "reasoning": "string (2-3문장)"
    }
  ],
  "developmentSuggestions": ["string", ...]
}
`.trim()
}
