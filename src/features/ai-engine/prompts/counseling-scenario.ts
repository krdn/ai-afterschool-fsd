/**
 * 상담 시나리오 생성 프롬프트 빌더 4종
 *
 * 1. buildAnalysisReportPrompt — 학생 분석 보고서
 * 2. buildScenarioPrompt — 상담 시나리오
 * 3. buildParentSummaryPrompt — 학부모 공유용
 * 4. buildCounselingReportPrompt — 상담 종합 보고서 (교사용)
 *
 * DB에 활성 프리셋이 있으면 템플릿 변수 치환, 없으면 기본 하드코딩 프롬프트 사용
 */

import type { UnifiedPersonalityData } from './counseling'
import { replaceTemplateVars } from './template-utils'

// DB 리포지토리는 서버 전용 — Client Component 번들 오염 방지를 위해 dynamic import 사용
async function getActiveCounselingPreset(type: string) {
  const { getActiveCounselingPreset: fn } = await import('@/features/counseling/repositories/prompt-preset')
  return fn(type as Parameters<typeof fn>[0])
}

// ---------------------------------------------------------------------------
// 타입 정의
// ---------------------------------------------------------------------------

export interface AnalysisReportPromptParams {
  studentName: string
  school: string
  grade: number
  topic: string
  personality: UnifiedPersonalityData | null
  previousSessions: Array<{ summary: string; sessionDate: Date; type: string }>
  gradeHistory: Array<{ subject: string; score: number; testDate: Date }>
}

export interface ScenarioPromptParams {
  studentName: string
  topic: string
  approvedReport: string
  personalitySummary: string | null
}

export interface ParentSummaryPromptParams {
  studentName: string
  topic: string
  scheduledAt: string
  approvedScenario: string
}

/** DB 프리셋의 추가 설정 반환용 */
export type PromptBuildResult = {
  prompt: string
  systemPrompt?: string | null
  maxOutputTokens?: number
  temperature?: number
}

// ---------------------------------------------------------------------------
// 공통 섹션 빌더 (분석 보고서용 데이터 전처리)
// ---------------------------------------------------------------------------

const typeMap: Record<string, string> = {
  ACADEMIC: '학업', CAREER: '진로', PSYCHOLOGICAL: '심리', BEHAVIORAL: '행동'
}

function buildPersonalitySection(personality: UnifiedPersonalityData | null): string {
  if (!personality) return '성향 분석 데이터가 없습니다.'
  const parts: string[] = []
  if (personality.mbti?.result?.mbtiType) parts.push(`- MBTI: ${personality.mbti.result.mbtiType}`)
  if (personality.saju?.interpretation) parts.push(`- 사주 해석: ${personality.saju.interpretation.slice(0, 200)}`)
  if (personality.name?.interpretation) parts.push(`- 성명학: ${personality.name.interpretation.slice(0, 200)}`)
  if (personality.face?.result) {
    const faceResult = personality.face.result as { personalityTraits?: string[] }
    if (faceResult.personalityTraits && faceResult.personalityTraits.length > 0) {
      parts.push(`- 관상 특성: ${faceResult.personalityTraits.slice(0, 3).join(', ')}`)
    }
  }
  if (personality.palm?.result) {
    const palmResult = personality.palm.result as { personalityTraits?: string[] }
    if (palmResult.personalityTraits && palmResult.personalityTraits.length > 0) {
      parts.push(`- 손금 특성: ${palmResult.personalityTraits.slice(0, 3).join(', ')}`)
    }
  }
  return parts.length > 0 ? parts.join('\n') : '성향 분석 데이터가 없습니다.'
}

function buildPreviousSessionsSection(
  previousSessions: Array<{ summary: string; sessionDate: Date; type: string }>,
): string {
  if (previousSessions.length === 0) return '이전 상담 이력이 없습니다. (첫 상담)'
  return previousSessions.map((s, i) => {
    const dateStr = new Date(s.sessionDate).toLocaleDateString('ko-KR')
    return `${i + 1}. [${dateStr}] ${typeMap[s.type] || s.type} - ${s.summary.slice(0, 100)}`
  }).join('\n')
}

function buildGradeHistorySection(
  gradeHistory: Array<{ subject: string; score: number; testDate: Date }>,
): string {
  if (gradeHistory.length === 0) return '성적 데이터가 없습니다.'
  return gradeHistory.slice(-10).map(g => {
    const dateStr = new Date(g.testDate).toLocaleDateString('ko-KR')
    return `- ${g.subject}: ${g.score}점 (${dateStr})`
  }).join('\n')
}

// ---------------------------------------------------------------------------
// 1. 분석 보고서 프롬프트 빌더
// ---------------------------------------------------------------------------

export async function buildAnalysisReportPrompt(
  params: AnalysisReportPromptParams,
): Promise<PromptBuildResult> {
  const { studentName, school, grade, topic, personality, previousSessions, gradeHistory } = params

  const personalitySection = buildPersonalitySection(personality)
  const previousSessionsSection = buildPreviousSessionsSection(previousSessions)
  const gradeHistorySection = buildGradeHistorySection(gradeHistory)

  // DB 프리셋 조회
  const preset = await getActiveCounselingPreset('analysis_report')
  if (preset) {
    return {
      prompt: replaceTemplateVars(preset.promptTemplate, {
        studentName, school, grade, topic,
        personalitySection, previousSessionsSection, gradeHistorySection,
      }),
      systemPrompt: preset.systemPrompt,
      maxOutputTokens: preset.maxOutputTokens,
      temperature: preset.temperature,
    }
  }

  // 폴백: 기본 하드코딩 프롬프트
  return { prompt: buildDefaultAnalysisReportPrompt(studentName, school, grade, topic, personalitySection, previousSessionsSection, gradeHistorySection) }
}

function buildDefaultAnalysisReportPrompt(
  studentName: string, school: string, grade: number, topic: string,
  personalitySection: string, historySection: string, gradeSection: string,
): string {
  return `너는 학생 상담 전문 교육 컨설턴트야. 아래 학생 정보를 분석하여 상담 준비 보고서를 작성해줘.

## 학생 기본 정보
- 이름: ${studentName}
- 학교: ${school} ${grade}학년
- 이번 상담 주제: ${topic}

## 학생 성향 분석 데이터
${personalitySection}

## 이전 상담 이력
${historySection}

## 최근 성적
${gradeSection}

다음 형식으로 마크다운 보고서를 작성해줘. 반드시 아래 마크다운 문법 규칙을 지켜:
- 각 섹션은 ### 제목으로 구분
- 핵심 키워드는 **굵은 글씨**로 강조
- 나열 항목은 - 또는 1. 목록 사용
- 중요한 주의사항은 > 인용구로 표시
- 수치 비교가 있으면 | 표 | 형식 | 사용

### 학생 성향 종합

- **MBTI/성격 유형**: [유형명과 핵심 특성]
- **강점**: [학습/대인관계 측면 강점]
- **유의점**: [상담 시 고려할 점]

> 종합 요약: [3-4줄로 핵심 특성 종합]

### 학업 현황

| 과목 | 최근 성적 | 추이 |
|------|----------|------|
| [과목] | [점수] | [상승/하락/유지] |

- **강점 과목**: [과목과 이유]
- **약점 과목**: [과목과 원인 분석]

### 상담 이력 패턴

- **반복 주제**: [이전 상담에서 반복되는 주제]
- **진전 사항**: [개선된 점]
- **미해결 과제**: [아직 남은 이슈]

### 이번 상담 연관성

- **주제 연결**: 상담 주제 "${topic}"와 학생 특성의 접점
- **예상 반응**: [학생의 예상 태도/반응]

> **주의 포인트**: [이번 상담에서 특별히 주의할 점]`.trim()
}

// ---------------------------------------------------------------------------
// 2. 상담 시나리오 프롬프트 빌더
// ---------------------------------------------------------------------------

export async function buildScenarioPrompt(
  params: ScenarioPromptParams,
): Promise<PromptBuildResult> {
  const { studentName, topic, approvedReport, personalitySummary } = params

  const preset = await getActiveCounselingPreset('scenario')
  if (preset) {
    return {
      prompt: replaceTemplateVars(preset.promptTemplate, {
        studentName, topic, approvedReport,
        personalitySummary: personalitySummary ?? '',
      }),
      systemPrompt: preset.systemPrompt,
      maxOutputTokens: preset.maxOutputTokens,
      temperature: preset.temperature,
    }
  }

  return { prompt: buildDefaultScenarioPrompt(params) }
}

function buildDefaultScenarioPrompt(params: ScenarioPromptParams): string {
  const { studentName, topic, approvedReport, personalitySummary } = params

  const summarySection = personalitySummary
    ? `## 학생 핵심 성향\n${personalitySummary}`
    : ''

  return `너는 학생 상담 시나리오 설계 전문가야. 아래 분석 보고서를 기반으로 상담 시나리오를 작성해줘.

## 학생: ${studentName}
## 상담 주제: ${topic}

${summarySection}

## 분석 보고서 (교사 승인)
${approvedReport}

다음 형식으로 30분 상담 시나리오를 마크다운으로 작성해줘. 반드시 아래 마크다운 문법 규칙을 지켜:
- 각 단계는 ### 제목으로 구분
- 질문 예시는 > 인용구로 표시
- 핵심 키워드는 **굵은 글씨**로 강조
- 예상 반응과 대응은 표 형식 사용
- 나열 항목은 - 또는 1. 목록 사용

### 도입 (5분) — 라포 형성

- **분위기**: [어떤 분위기로 시작할지]
- **접근 방식**: [학생 성향을 고려한 접근법]

**첫 질문 예시:**
> "질문 1"

> "질문 2"

### 본론 (20분) — 핵심 탐색

**핵심 질문과 예상 반응:**

| 질문 | 긍정 반응 | 부정/회피 반응 | 대응 전략 |
|------|----------|--------------|----------|
| > "질문 1" | [반응] | [반응] | [전략] |
| > "질문 2" | [반응] | [반응] | [전략] |
| > "질문 3" | [반응] | [반응] | [전략] |

> **전환 포인트**: [본론에서 학생 반응에 따라 유연하게 전환할 지점]

### 마무리 (5분) — 정리 및 후속

- **합의사항 정리**: [이번 상담에서 합의할 내용]
- **후속 조치**: [상담 후 해야 할 일]
- **다음 상담 연결**: [다음 상담 주제/시기 제안]

> **한 줄 요약**: [이번 시나리오의 핵심 목표]`.trim()
}

// ---------------------------------------------------------------------------
// 3. 학부모 공유용 프롬프트 빌더
// ---------------------------------------------------------------------------

export async function buildParentSummaryPrompt(
  params: ParentSummaryPromptParams,
): Promise<PromptBuildResult> {
  const { studentName, topic, scheduledAt, approvedScenario } = params

  const preset = await getActiveCounselingPreset('parent_summary')
  if (preset) {
    return {
      prompt: replaceTemplateVars(preset.promptTemplate, {
        studentName, topic, scheduledAt, approvedScenario,
      }),
      systemPrompt: preset.systemPrompt,
      maxOutputTokens: preset.maxOutputTokens,
      temperature: preset.temperature,
    }
  }

  return { prompt: buildDefaultParentSummaryPrompt(params) }
}

function buildDefaultParentSummaryPrompt(params: ParentSummaryPromptParams): string {
  const { studentName, topic, scheduledAt, approvedScenario } = params

  return `너는 학부모 커뮤니케이션 전문가야. 아래 상담 시나리오를 참고하여 학부모에게 보낼 상담 안내 메시지를 작성해줘.

## 학생: ${studentName}
## 상담 주제: ${topic}
## 상담 일시: ${scheduledAt}

## 참고 시나리오 (교사 승인)
${approvedScenario}

다음 형식으로 작성해줘. 반드시 아래 규칙을 지켜:
- 학부모 존칭 필수 사용
- 학생의 심리 분석/성격 진단/사주/관상 등 민감 정보 절대 포함 금지
- 마크다운 문법 사용: **굵은 글씨**, 목록, 인용구 등
- 따뜻하고 전문적인 어조 유지

안녕하세요, **${studentName}** 학부모님.

[상담 목적을 따뜻한 어조로 안내 — 2-3문장]

---

### 상담 안내

| 항목 | 내용 |
|------|------|
| **상담 일시** | ${scheduledAt} |
| **상담 주제** | ${topic} |

### 사전 준비 요청

학부모님께서 아래 사항을 미리 준비해 주시면 더 효과적인 상담이 가능합니다.

- [ ] 가정에서 관찰된 점이 있다면 메모해 주세요
- [ ] 학부모님의 의견이나 희망사항을 정리해 주세요
- [ ] [시나리오 기반 추가 준비사항]

---

> 상담과 관련하여 궁금하신 점이 있으시면 편하게 연락 주세요.

[따뜻한 마무리 인사]`.trim()
}

// ---------------------------------------------------------------------------
// 4. 상담 종합 보고서 프롬프트 빌더 (교사용)
// ---------------------------------------------------------------------------

export interface CounselingReportPromptParams {
  studentName: string
  topic: string
  counselingType: string   // 'ACADEMIC'|'CAREER'|'PSYCHOLOGICAL'|'BEHAVIORAL'
  duration: number         // 분 단위
  teacherSummary: string   // 교사가 작성한 요약
  checklist: Array<{ content: string; checked: boolean; memo: string | null }>
  aiReference: string | null  // Wizard에서 생성한 기존 aiSummary
}

function buildChecklistSection(
  checklist: Array<{ content: string; checked: boolean; memo: string | null }>,
): string {
  if (checklist.length === 0) return '체크리스트 항목이 없습니다.'
  return checklist.map(item => {
    const prefix = item.checked ? '✓' : '✗'
    const memo = item.memo ? ` (메모: ${item.memo})` : ''
    return `${prefix} ${item.content}${memo}`
  }).join('\n')
}

export async function buildCounselingReportPrompt(
  params: CounselingReportPromptParams,
): Promise<PromptBuildResult> {
  const { studentName, topic, counselingType, duration, teacherSummary, checklist, aiReference } = params

  const checklistSection = buildChecklistSection(checklist)
  const counselingTypeLabel = typeMap[counselingType] || counselingType

  // DB 프리셋 조회
  const preset = await getActiveCounselingPreset('counseling_summary')
  if (preset) {
    return {
      prompt: replaceTemplateVars(preset.promptTemplate, {
        studentName, topic, counselingType, counselingTypeLabel,
        duration, teacherSummary, checklistSection,
        aiReference: aiReference ?? '',
      }),
      systemPrompt: preset.systemPrompt,
      maxOutputTokens: preset.maxOutputTokens,
      temperature: preset.temperature,
    }
  }

  // 폴백: 기본 하드코딩 프롬프트
  return { prompt: buildDefaultCounselingReportPrompt(params, counselingTypeLabel, checklistSection) }
}

function buildDefaultCounselingReportPrompt(
  params: CounselingReportPromptParams,
  counselingTypeLabel: string,
  checklistSection: string,
): string {
  const { studentName, topic, duration, teacherSummary, aiReference } = params

  const aiReferenceSection = aiReference
    ? `## AI 사전 분석 참고자료\n${aiReference}`
    : ''

  return `너는 학교 상담 보고서 작성 전문가야. 아래 상담 결과 데이터를 기반으로 교사용 상담 종합 보고서를 작성해줘.

## 상담 기본 정보
- 학생: ${studentName}
- 상담 주제: ${topic}
- 상담 유형: ${counselingTypeLabel}
- 상담 시간: ${duration}분

## 교사 작성 상담 요약
${teacherSummary}

## 체크리스트 수행 결과
${checklistSection}

${aiReferenceSection}

다음 형식으로 마크다운 보고서를 작성해줘. 반드시 아래 마크다운 문법 규칙을 지켜:
- 각 섹션은 ### 제목으로 구분
- 핵심 키워드는 **굵은 글씨**로 강조
- 나열 항목은 - 또는 1. 목록 사용
- 중요한 주의사항은 > 인용구로 표시
- 수치 비교가 있으면 | 표 | 형식 | 사용

### 상담 개요

| 항목 | 내용 |
|------|------|
| **학생명** | ${studentName} |
| **상담 유형** | ${counselingTypeLabel} |
| **상담 주제** | ${topic} |
| **소요 시간** | ${duration}분 |

### 상담 내용 요약

- **주요 논의 사항**: [교사 요약과 체크리스트를 기반으로 핵심 논의 내용 정리]
- **학생 반응/태도**: [상담 중 학생의 전반적인 반응과 태도 분석]
- **달성 항목**: [체크리스트에서 달성된 항목 요약]
- **미달성 항목**: [체크리스트에서 미달성된 항목과 사유 분석]

### 주요 발견사항

1. [상담을 통해 발견된 핵심 사항 1]
2. [상담을 통해 발견된 핵심 사항 2]
3. [상담을 통해 발견된 핵심 사항 3]

> **핵심 인사이트**: [가장 중요한 발견사항 한 줄 요약]

### 후속 조치 권고

- **단기 조치** (1-2주): [즉시 실행할 조치사항]
- **중기 조치** (1개월): [중기적으로 추진할 조치사항]
- **장기 조치** (학기 내): [장기적으로 관찰/추진할 사항]
- **다음 상담 제안**: [다음 상담 주제 및 시기 권고]

> **종합 평가**: [이번 상담의 전반적 성과와 향후 방향 2-3문장 요약]`.trim()
}
