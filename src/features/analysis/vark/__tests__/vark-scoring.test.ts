import { describe, it, expect } from "vitest"
import {
  calculateProgress,
  scoreVark,
  determineVarkType,
} from "../vark-scoring"
import type { VarkQuestion, VarkPercentages } from "../vark-scoring"

describe("calculateProgress", () => {
  it("응답 수 기반 진행률을 계산한다", () => {
    expect(calculateProgress({ "1": 3, "2": 4 }, 8)).toEqual({
      answeredCount: 2,
      totalQuestions: 8,
      percentage: 25,
    })
  })
})

describe("determineVarkType", () => {
  it("하나의 유형이 지배적이면 해당 유형을 반환한다", () => {
    const p: VarkPercentages = { V: 50, A: 20, R: 15, K: 15 }
    expect(determineVarkType(p)).toBe("V")
  })

  it("두 유형이 지배적이면 두 글자 조합을 반환한다", () => {
    const p: VarkPercentages = { V: 35, A: 35, R: 15, K: 15 }
    expect(determineVarkType(p)).toBe("VA")
  })

  it("모든 유형이 고르면 VARK를 반환한다", () => {
    const p: VarkPercentages = { V: 25, A: 25, R: 25, K: 25 }
    expect(determineVarkType(p)).toBe("VARK")
  })

  it("4개 모두 threshold+margin 이상이면 VARK를 반환한다", () => {
    const p: VarkPercentages = { V: 29, A: 29, R: 29, K: 13 }
    // V,A,R >= 28 (25+3), K < 28 → VRA 가 아닌 확인
    expect(determineVarkType(p)).toBe("VAR")
  })

  it("지배적인 유형 없이 모두 threshold 미만이면 VARK를 반환한다", () => {
    const p: VarkPercentages = { V: 27, A: 27, R: 27, K: 19 }
    // 27 < 28(25+3)이므로 모두 미달 → VARK
    expect(determineVarkType(p)).toBe("VARK")
  })
})

describe("scoreVark", () => {
  const questions: VarkQuestion[] = [
    { id: 1, type: "V", text: "Q1", description: "" },
    { id: 2, type: "A", text: "Q2", description: "" },
    { id: 3, type: "R", text: "Q3", description: "" },
    { id: 4, type: "K", text: "Q4", description: "" },
  ]

  it("점수를 올바르게 집계한다", () => {
    const responses = { "1": 5, "2": 3, "3": 4, "4": 2 }
    const result = scoreVark(responses, questions)
    expect(result.scores).toEqual({ v: 5, a: 3, r: 4, k: 2 })
  })

  it("퍼센티지 합이 100이다", () => {
    const responses = { "1": 5, "2": 3, "3": 4, "4": 2 }
    const result = scoreVark(responses, questions)
    const sum = result.percentages.V + result.percentages.A +
      result.percentages.R + result.percentages.K
    expect(sum).toBe(100)
  })

  it("응답이 없으면 균등 퍼센티지를 반환한다", () => {
    const result = scoreVark({}, questions)
    expect(result.percentages).toEqual({ V: 25, A: 25, R: 25, K: 25 })
    expect(result.varkType).toBe("VARK")
  })
})
