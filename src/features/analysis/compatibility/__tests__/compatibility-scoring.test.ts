import { describe, it, expect } from "vitest"
import { calculateCompatibilityScore } from "../compatibility-scoring"
import type { TeacherAnalysisData, StudentAnalysisData } from "../compatibility-scoring"

describe("calculateCompatibilityScore", () => {
  it("분석 데이터가 전혀 없어도 에러 없이 점수를 반환한다", () => {
    const teacher: TeacherAnalysisData = {}
    const student: StudentAnalysisData = {}
    const result = calculateCompatibilityScore(teacher, student)

    expect(result.overall).toBeGreaterThanOrEqual(0)
    expect(result.overall).toBeLessThanOrEqual(100)
    expect(result.breakdown).toBeDefined()
    expect(result.reasons.length).toBeGreaterThan(0)
  })

  it("담당 학생 수가 적으면 loadBalance 점수가 높다", () => {
    const result = calculateCompatibilityScore(
      { currentLoad: 5 },
      {}
    )
    expect(result.breakdown.loadBalance).toBe(15)
  })

  it("담당 학생 수가 많으면 loadBalance 점수가 낮다", () => {
    const result = calculateCompatibilityScore(
      { currentLoad: 35 },
      {}
    )
    expect(result.breakdown.loadBalance).toBe(0)
  })

  it("overall은 breakdown 합산과 일치한다", () => {
    const result = calculateCompatibilityScore({}, {})
    const sum =
      result.breakdown.mbti +
      result.breakdown.learningStyle +
      result.breakdown.saju +
      result.breakdown.name +
      result.breakdown.loadBalance
    expect(result.overall).toBe(sum)
  })

  it("MBTI 데이터가 있으면 mbti breakdown이 0보다 크다", () => {
    const teacher: TeacherAnalysisData = {
      mbti: { E: 70, I: 30, S: 60, N: 40, T: 55, F: 45, J: 65, P: 35 },
    }
    const student: StudentAnalysisData = {
      mbti: { E: 65, I: 35, S: 50, N: 50, T: 40, F: 60, J: 70, P: 30 },
    }
    const result = calculateCompatibilityScore(teacher, student)
    expect(result.breakdown.mbti).toBeGreaterThan(0)
    expect(result.breakdown.learningStyle).toBeGreaterThan(0)
  })
})
