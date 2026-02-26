/**
 * 상담 시나리오 생성 프롬프트 빌더 3종
 *
 * 1. buildAnalysisReportPrompt — 학생 분석 보고서
 * 2. buildScenarioPrompt — 상담 시나리오
 * 3. buildParentSummaryPrompt — 학부모 공유용
 */

import type { UnifiedPersonalityData } from './counseling'

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

// ---------------------------------------------------------------------------
// 1. 분석 보고서 프롬프트 빌더
// ---------------------------------------------------------------------------

export function buildAnalysisReportPrompt(params: AnalysisReportPromptParams): string {
  const { studentName, school, grade, topic, personality, previousSessions, gradeHistory } = params

  const typeMap: Record<string, string> = {
    ACADEMIC: '학업', CAREER: '진로', PSYCHOLOGICAL: '심리', BEHAVIORAL: '행동'
  }

  // 성향 섹션 조립
  let personalitySection = '성향 분석 데이터가 없습니다.'
  if (personality) {
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
    if (parts.length > 0) personalitySection = parts.join('\n')
  }

  // 이전 상담 섹션
  let historySection = '이전 상담 이력이 없습니다. (첫 상담)'
  if (previousSessions.length > 0) {
    historySection = previousSessions.map((s, i) => {
      const dateStr = new Date(s.sessionDate).toLocaleDateString('ko-KR')
      return `${i + 1}. [${dateStr}] ${typeMap[s.type] || s.type} - ${s.summary.slice(0, 100)}`
    }).join('\n')
  }

  // 성적 섹션
  let gradeSection = '성적 데이터가 없습니다.'
  if (gradeHistory.length > 0) {
    gradeSection = gradeHistory.slice(-10).map(g => {
      const dateStr = new Date(g.testDate).toLocaleDateString('ko-KR')
      return `- ${g.subject}: ${g.score}점 (${dateStr})`
    }).join('\n')
  }

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

export function buildScenarioPrompt(params: ScenarioPromptParams): string {
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

export function buildParentSummaryPrompt(params: ParentSummaryPromptParams): string {
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
