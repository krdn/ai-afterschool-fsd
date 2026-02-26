import { describe, it, expect } from "vitest"
import {
  buildAnalysisReportPrompt,
  buildScenarioPrompt,
  buildParentSummaryPrompt,
  type AnalysisReportPromptParams,
  type ScenarioPromptParams,
  type ParentSummaryPromptParams,
} from "../counseling-scenario"

// ---------------------------------------------------------------------------
// 테스트 데이터
// ---------------------------------------------------------------------------

const baseAnalysisParams: AnalysisReportPromptParams = {
  studentName: "김철수",
  school: "강남중학교",
  grade: 2,
  topic: "수학 성적 부진",
  personality: null,
  previousSessions: [],
  gradeHistory: [],
}

const fullPersonality = {
  saju: { result: {}, calculatedAt: new Date(), interpretation: "사주 해석 텍스트" },
  name: { result: {}, calculatedAt: new Date(), interpretation: "성명학 해석 텍스트" },
  mbti: {
    result: { mbtiType: "INFJ", percentages: { I: 70, N: 65, F: 80, J: 75 } },
    calculatedAt: new Date(),
  },
  face: { result: { personalityTraits: ["리더십", "창의성", "공감력"] }, analyzedAt: new Date() },
  palm: { result: { personalityTraits: ["끈기", "분석력"] }, analyzedAt: new Date() },
}

// ---------------------------------------------------------------------------
// buildAnalysisReportPrompt
// ---------------------------------------------------------------------------

describe("buildAnalysisReportPrompt", () => {
  it("학생 기본 정보를 포함한다", () => {
    const result = buildAnalysisReportPrompt(baseAnalysisParams)
    expect(result).toContain("김철수")
    expect(result).toContain("강남중학교")
    expect(result).toContain("2학년")
    expect(result).toContain("수학 성적 부진")
  })

  it("성향 데이터가 없으면 기본 메시지를 출력한다", () => {
    const result = buildAnalysisReportPrompt(baseAnalysisParams)
    expect(result).toContain("성향 분석 데이터가 없습니다")
  })

  it("성향 데이터가 있으면 MBTI, 사주, 성명학, 관상, 손금을 포함한다", () => {
    const result = buildAnalysisReportPrompt({
      ...baseAnalysisParams,
      personality: fullPersonality,
    })
    expect(result).toContain("MBTI: INFJ")
    expect(result).toContain("사주 해석")
    expect(result).toContain("성명학")
    expect(result).toContain("관상 특성: 리더십, 창의성, 공감력")
    expect(result).toContain("손금 특성: 끈기, 분석력")
  })

  it("이전 상담이 없으면 첫 상담 메시지를 출력한다", () => {
    const result = buildAnalysisReportPrompt(baseAnalysisParams)
    expect(result).toContain("첫 상담")
  })

  it("이전 상담 이력을 날짜, 유형, 요약과 함께 포함한다", () => {
    const result = buildAnalysisReportPrompt({
      ...baseAnalysisParams,
      previousSessions: [
        { summary: "수학 기초 학력 부족 논의", sessionDate: new Date("2026-01-15"), type: "ACADEMIC" },
        { summary: "진로 고민 상담", sessionDate: new Date("2026-02-01"), type: "CAREER" },
      ],
    })
    expect(result).toContain("학업")
    expect(result).toContain("수학 기초 학력 부족 논의")
    expect(result).toContain("진로")
    expect(result).toContain("진로 고민 상담")
  })

  it("성적 데이터를 과목, 점수, 날짜와 함께 포함한다", () => {
    const result = buildAnalysisReportPrompt({
      ...baseAnalysisParams,
      gradeHistory: [
        { subject: "수학", score: 65, testDate: new Date("2026-01-20") },
        { subject: "영어", score: 88, testDate: new Date("2026-01-20") },
      ],
    })
    expect(result).toContain("수학: 65점")
    expect(result).toContain("영어: 88점")
  })

  it("성적이 없으면 기본 메시지를 출력한다", () => {
    const result = buildAnalysisReportPrompt(baseAnalysisParams)
    expect(result).toContain("성적 데이터가 없습니다")
  })

  it("최근 10건의 성적만 포함한다", () => {
    const gradeHistory = Array.from({ length: 15 }, (_, i) => ({
      subject: `과목${i + 1}`,
      score: 70 + i,
      testDate: new Date(`2026-01-${String(i + 1).padStart(2, "0")}`),
    }))
    const result = buildAnalysisReportPrompt({ ...baseAnalysisParams, gradeHistory })
    // 최근 10건만 포함 (인덱스 5~14)
    expect(result).not.toContain("과목1:")
    expect(result).toContain("과목15")
  })

  it("마크다운 형식 지시사항을 포함한다", () => {
    const result = buildAnalysisReportPrompt(baseAnalysisParams)
    expect(result).toContain("### 학생 성향 종합")
    expect(result).toContain("### 학업 현황")
    expect(result).toContain("### 상담 이력 패턴")
    expect(result).toContain("### 이번 상담 연관성")
  })
})

// ---------------------------------------------------------------------------
// buildScenarioPrompt
// ---------------------------------------------------------------------------

describe("buildScenarioPrompt", () => {
  const baseScenarioParams: ScenarioPromptParams = {
    studentName: "김철수",
    topic: "수학 성적 부진",
    approvedReport: "## 분석 보고서 내용",
    personalitySummary: null,
  }

  it("학생 이름과 상담 주제를 포함한다", () => {
    const result = buildScenarioPrompt(baseScenarioParams)
    expect(result).toContain("김철수")
    expect(result).toContain("수학 성적 부진")
  })

  it("승인된 보고서를 포함한다", () => {
    const result = buildScenarioPrompt(baseScenarioParams)
    expect(result).toContain("## 분석 보고서 내용")
  })

  it("성향 요약이 없으면 해당 섹션이 비어있다", () => {
    const result = buildScenarioPrompt(baseScenarioParams)
    expect(result).not.toContain("## 학생 핵심 성향")
  })

  it("성향 요약이 있으면 포함한다", () => {
    const result = buildScenarioPrompt({
      ...baseScenarioParams,
      personalitySummary: "INFJ 유형으로 내향적이고 직관적인 성향",
    })
    expect(result).toContain("## 학생 핵심 성향")
    expect(result).toContain("INFJ 유형으로 내향적이고 직관적인 성향")
  })

  it("30분 시나리오 구조(도입/본론/마무리)를 포함한다", () => {
    const result = buildScenarioPrompt(baseScenarioParams)
    expect(result).toContain("### 도입 (5분)")
    expect(result).toContain("### 본론 (20분)")
    expect(result).toContain("### 마무리 (5분)")
  })
})

// ---------------------------------------------------------------------------
// buildParentSummaryPrompt
// ---------------------------------------------------------------------------

describe("buildParentSummaryPrompt", () => {
  const baseParentParams: ParentSummaryPromptParams = {
    studentName: "김철수",
    topic: "수학 성적 부진",
    scheduledAt: "2026년 2월 28일 14:00",
    approvedScenario: "## 상담 시나리오 내용",
  }

  it("학부모 호칭을 포함한다", () => {
    const result = buildParentSummaryPrompt(baseParentParams)
    expect(result).toContain("김철수 학부모님")
  })

  it("상담 일시와 주제를 포함한다", () => {
    const result = buildParentSummaryPrompt(baseParentParams)
    expect(result).toContain("2026년 2월 28일 14:00")
    expect(result).toContain("수학 성적 부진")
  })

  it("민감 정보 제외 지시사항을 포함한다", () => {
    const result = buildParentSummaryPrompt(baseParentParams)
    expect(result).toContain("민감 정보는 절대 포함하지 마")
  })

  it("승인된 시나리오를 참고 자료로 포함한다", () => {
    const result = buildParentSummaryPrompt(baseParentParams)
    expect(result).toContain("## 상담 시나리오 내용")
  })

  it("준비 요청사항 섹션을 포함한다", () => {
    const result = buildParentSummaryPrompt(baseParentParams)
    expect(result).toContain("준비 요청사항")
  })
})
