/**
 * 상담 및 성향 요약 프롬프트 빌더
 *
 * 통합 성향 데이터(UnifiedPersonalityData) 기반
 * DB에 활성 프리셋이 있으면 템플릿 변수 치환, 없으면 기본 하드코딩 프롬프트 사용
 */

import { replaceTemplateVars } from './template-utils'
import type { PromptBuildResult } from './counseling-scenario'

// DB 리포지토리는 서버 전용 — Client Component 번들 오염 방지를 위해 dynamic import 사용
async function getActiveCounselingPreset(type: string) {
  const { getActiveCounselingPreset: fn } = await import('@/features/counseling/repositories/prompt-preset')
  return fn(type as Parameters<typeof fn>[0])
}

// ---------------------------------------------------------------------------
// 타입 정의
// ---------------------------------------------------------------------------

/**
 * 통합 성향 데이터 타입
 * 5개 분석(사주, 성명, MBTI, 관상, 손금)의 결과를 통합
 */
export type UnifiedPersonalityData = {
  saju: {
    result: unknown | null
    calculatedAt: Date | null
    interpretation: string | null
  }
  name: {
    result: unknown | null
    calculatedAt: Date | null
    interpretation: string | null
  }
  mbti: {
    result: {
      mbtiType: string
      percentages: Record<string, number>
    } | null
    calculatedAt: Date | null
  }
  face: {
    result: unknown | null
    analyzedAt: Date | null
  }
  palm: {
    result: unknown | null
    analyzedAt: Date | null
  }
}

/**
 * 상담 요약 프롬프트 빌더 매개변수
 */
export interface CounselingSummaryPromptParams {
  currentSummary: string
  sessionDate: Date
  sessionType: string
  personality: UnifiedPersonalityData | null
  previousSessions: Array<{
    summary: string
    sessionDate: Date
    type: string
  }>
  studentName: string
}

/**
 * 성향 요약 프롬프트 빌더 매개변수
 */
export interface PersonalitySummaryPromptParams {
  personality: UnifiedPersonalityData
  studentName: string
}

// ---------------------------------------------------------------------------
// 공통 헬퍼
// ---------------------------------------------------------------------------

const typeMap: Record<string, string> = {
  ACADEMIC: "학업",
  CAREER: "진로",
  PSYCHOLOGICAL: "심리",
  BEHAVIORAL: "행동",
}

function buildPersonalitySectionText(personality: UnifiedPersonalityData | null): string {
  if (!personality) return ""
  const traits: string[] = []
  if (personality.mbti.result) traits.push(`MBTI: ${personality.mbti.result.mbtiType}`)
  if (personality.saju.interpretation) traits.push(`사주 특성: ${personality.saju.interpretation.slice(0, 100)}...`)
  if (personality.name.interpretation) traits.push(`성명학 특성: ${personality.name.interpretation.slice(0, 100)}...`)
  if (personality.face.result) {
    const faceResult = personality.face.result as { personalityTraits?: string[] }
    if (faceResult.personalityTraits && faceResult.personalityTraits.length > 0) {
      traits.push(`관상 특성: ${faceResult.personalityTraits.slice(0, 3).join(", ")}`)
    }
  }
  if (personality.palm.result) {
    const palmResult = personality.palm.result as { personalityTraits?: string[] }
    if (palmResult.personalityTraits && palmResult.personalityTraits.length > 0) {
      traits.push(`손금 특성: ${palmResult.personalityTraits.slice(0, 3).join(", ")}`)
    }
  }
  if (traits.length === 0) return ""
  return `\n## 학생 성향 정보\n${traits.map((t) => `- ${t}`).join("\n")}\n`
}

function buildPreviousSessionsSectionText(
  previousSessions: Array<{ summary: string; sessionDate: Date; type: string }>,
): string {
  if (previousSessions.length === 0) return ""
  const sessionsList = previousSessions
    .slice(0, 5)
    .map((s) => {
      const dateStr = s.sessionDate.toLocaleDateString("ko-KR", { month: "short", day: "numeric" })
      const typeKorean = typeMap[s.type] || s.type
      return `- [${dateStr}] ${typeKorean} 상담: ${s.summary.slice(0, 80)}${s.summary.length > 80 ? "..." : ""}`
    })
    .join("\n")
  return `\n## 최근 상담 이력\n${sessionsList}\n`
}

// ---------------------------------------------------------------------------
// 상담 요약 생성 프롬프트 빌더
// ---------------------------------------------------------------------------

export async function buildCounselingSummaryPrompt(
  params: CounselingSummaryPromptParams
): Promise<PromptBuildResult> {
  const { currentSummary, sessionDate, sessionType, personality, previousSessions, studentName } = params

  const sessionTypeKorean = typeMap[sessionType] || sessionType
  const sessionDateStr = sessionDate.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
  const personalitySection = buildPersonalitySectionText(personality)
  const previousSessionsSection = buildPreviousSessionsSectionText(previousSessions)

  const preset = await getActiveCounselingPreset('counseling_summary')
  if (preset) {
    return {
      prompt: replaceTemplateVars(preset.promptTemplate, {
        studentName, sessionDate: sessionDateStr, sessionType: sessionTypeKorean,
        personalitySection, previousSessionsSection, currentSummary,
      }),
      systemPrompt: preset.systemPrompt,
      maxOutputTokens: preset.maxOutputTokens,
      temperature: preset.temperature,
    }
  }

  return { prompt: buildDefaultCounselingSummaryPrompt(studentName, sessionDateStr, sessionTypeKorean, personalitySection, previousSessionsSection, currentSummary) }
}

function buildDefaultCounselingSummaryPrompt(
  studentName: string, sessionDateStr: string, sessionTypeKorean: string,
  personalitySection: string, previousSessionsSection: string, currentSummary: string,
): string {
  return `
너는 학생 상담 기록을 전문적으로 정리하는 교육 컨설턴트야.

## 기본 정보
- 학생 이름: ${studentName}
- 상담 일자: ${sessionDateStr}
- 상담 유형: ${sessionTypeKorean} 상담
${personalitySection}
${previousSessionsSection}
## 이번 상담 내용 (교사 작성)
${currentSummary}

---

위 정보를 바탕으로 전문적인 상담 요약을 작성해주세요.

**출력 형식 (Markdown):**

### 핵심 내용
- (상담의 주요 주제와 학생의 상태 요약, 2-3개 항목)

### 합의 사항
- (상담 중 결정된 사항이나 약속, 없으면 "특별한 합의 사항 없음")

### 관찰 사항
- (학생의 태도, 감정 상태, 특이사항 등, 2-3개 항목)

### 후속 조치
- (다음 단계로 필요한 행동이나 확인 사항, 1-2개 항목)

**작성 지침:**
- 객관적이고 전문적인 어조 사용
- 학생의 성향 정보가 있다면 맥락으로 활용
- 이전 상담과의 연속성 고려
- 구체적이고 실행 가능한 후속 조치 제안
- 교사가 작성한 원본 내용을 존중하되, 구조화하여 정리
`.trim()
}

// ---------------------------------------------------------------------------
// 성향 요약 생성 프롬프트 빌더
// ---------------------------------------------------------------------------

export async function buildPersonalitySummaryPrompt(
  params: PersonalitySummaryPromptParams
): Promise<PromptBuildResult> {
  const { personality, studentName } = params

  // 분석 데이터 수집
  const sections: Record<string, string> = {
    mbtiSection: '', sajuSection: '', nameSection: '', faceSection: '', palmSection: '',
  }

  if (personality.mbti.result) {
    sections.mbtiSection = `## MBTI\n- 유형: ${personality.mbti.result.mbtiType}\n- 비율: ${Object.entries(personality.mbti.result.percentages).map(([key, value]) => `${key}: ${value}%`).join(", ")}`
  }
  if (personality.saju.interpretation) {
    sections.sajuSection = `## 사주 해석\n${personality.saju.interpretation}`
  }
  if (personality.name.interpretation) {
    sections.nameSection = `## 성명학 해석\n${personality.name.interpretation}`
  }
  if (personality.face.result) {
    const faceResult = personality.face.result as { personalityTraits?: string[] }
    if (faceResult.personalityTraits && faceResult.personalityTraits.length > 0) {
      sections.faceSection = `## 관상 분석\n- 성격 특성: ${faceResult.personalityTraits.join(", ")}`
    }
  }
  if (personality.palm.result) {
    const palmResult = personality.palm.result as { personalityTraits?: string[] }
    if (palmResult.personalityTraits && palmResult.personalityTraits.length > 0) {
      sections.palmSection = `## 손금 분석\n- 성격 특성: ${palmResult.personalityTraits.join(", ")}`
    }
  }

  const hasData = Object.values(sections).some(s => s.length > 0)
  if (!hasData) {
    return {
      prompt: `학생 ${studentName}의 성향 분석 데이터가 충분하지 않습니다. 최소 1개 이상의 분석(MBTI, 사주, 성명학, 관상, 손금)이 필요합니다.`,
    }
  }

  const preset = await getActiveCounselingPreset('personality_summary')
  if (preset) {
    return {
      prompt: replaceTemplateVars(preset.promptTemplate, {
        studentName, ...sections,
      }),
      systemPrompt: preset.systemPrompt,
      maxOutputTokens: preset.maxOutputTokens,
      temperature: preset.temperature,
    }
  }

  const analysisDetails = Object.values(sections).filter(s => s.length > 0).join("\n\n")
  return { prompt: buildDefaultPersonalitySummaryPrompt(studentName, analysisDetails) }
}

function buildDefaultPersonalitySummaryPrompt(studentName: string, analysisDetails: string): string {
  return `
너는 학생 성향 분석 전문가야.

## 학생 정보
- 이름: ${studentName}

${analysisDetails}

---

위 분석 결과들을 종합하여 학생의 핵심 성향을 **1-2문장**으로 요약해주세요.

**작성 지침:**
- 가장 두드러지는 성격 특성 2-3가지 언급
- 학습이나 대인관계에서 나타날 수 있는 경향 포함
- 긍정적이고 격려하는 톤 유지
- 과학적 근거가 제한적임을 감안하여 "~한 경향이 있습니다" 형태로 작성
- 교사가 상담 시 참고할 수 있는 실용적인 정보 포함

**출력 형식:**
단순 텍스트로 1-2문장만 출력 (JSON이나 Markdown 형식 사용 금지)

**예시:**
"활발하고 사교적인 성향으로 그룹 활동에서 리더십을 발휘하는 경향이 있으며, 새로운 도전을 즐기지만 세부적인 계획 수립에는 어려움을 느낄 수 있습니다."
`.trim()
}
