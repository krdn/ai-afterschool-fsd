import { describe, it, expect } from "vitest"
import { calculateProgress, scoreMbti } from "../mbti-scoring"
import type { Question } from "../mbti-scoring"

describe("calculateProgress", () => {
  it("진행률을 계산한다", () => {
    const responses = { "1": 3, "2": 4, "3": 2 }
    expect(calculateProgress(responses, 10)).toEqual({
      answeredCount: 3,
      totalQuestions: 10,
      percentage: 30,
    })
  })

  it("전부 응답하면 100%이다", () => {
    const responses = { "1": 3, "2": 4 }
    expect(calculateProgress(responses, 2).percentage).toBe(100)
  })

  it("응답이 없으면 0%이다", () => {
    expect(calculateProgress({}, 10).percentage).toBe(0)
  })
})

describe("scoreMbti", () => {
  const questions: Question[] = [
    { id: 1, dimension: "EI", pole: "E", text: "Q1", description: "" },
    { id: 2, dimension: "EI", pole: "I", text: "Q2", description: "" },
    { id: 3, dimension: "SN", pole: "S", text: "Q3", description: "" },
    { id: 4, dimension: "SN", pole: "N", text: "Q4", description: "" },
    { id: 5, dimension: "TF", pole: "T", text: "Q5", description: "" },
    { id: 6, dimension: "TF", pole: "F", text: "Q6", description: "" },
    { id: 7, dimension: "JP", pole: "J", text: "Q7", description: "" },
    { id: 8, dimension: "JP", pole: "P", text: "Q8", description: "" },
  ]

  it("E > I → E타입으로 판정한다", () => {
    const responses = {
      "1": 5, "2": 2, // E=5, I=2
      "3": 4, "4": 3, // S=4, N=3
      "5": 1, "6": 5, // T=1, F=5
      "7": 4, "8": 3, // J=4, P=3
    }
    const result = scoreMbti(responses, questions)
    expect(result.mbtiType).toBe("ESFJ")
    expect(result.scores.e).toBe(5)
    expect(result.scores.i).toBe(2)
  })

  it("I > E → I타입으로 판정한다", () => {
    const responses = {
      "1": 2, "2": 5, // I
      "3": 2, "4": 5, // N
      "5": 5, "6": 2, // T
      "7": 2, "8": 5, // P
    }
    expect(scoreMbti(responses, questions).mbtiType).toBe("INTP")
  })

  it("동점이면 첫 번째 극(E,S,T,J)으로 판정한다", () => {
    const responses = {
      "1": 3, "2": 3, // E=I → E
      "3": 3, "4": 3, // S=N → S
      "5": 3, "6": 3, // T=F → T
      "7": 3, "8": 3, // J=P → J
    }
    expect(scoreMbti(responses, questions).mbtiType).toBe("ESTJ")
  })

  it("퍼센티지 합이 100이다", () => {
    const responses = { "1": 5, "2": 2, "3": 4, "4": 3, "5": 1, "6": 5, "7": 4, "8": 3 }
    const result = scoreMbti(responses, questions)
    expect(result.percentages.E + result.percentages.I).toBe(100)
    expect(result.percentages.S + result.percentages.N).toBe(100)
    expect(result.percentages.T + result.percentages.F).toBe(100)
    expect(result.percentages.J + result.percentages.P).toBe(100)
  })

  it("응답하지 않은 질문은 무시한다", () => {
    const responses = { "1": 5, "3": 4, "5": 3, "7": 2 }
    const result = scoreMbti(responses, questions)
    expect(result.scores.e).toBe(5)
    expect(result.scores.i).toBe(0)
  })
})
