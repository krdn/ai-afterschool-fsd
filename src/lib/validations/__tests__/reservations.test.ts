import { describe, it, expect } from "vitest"
import { completeWithRecordSchema } from "../reservations"

const validData = {
  reservationId: "res-001",
  type: "ACADEMIC" as const,
  duration: 30,
  summary: "학생의 학업 성취도에 대해 상담을 진행했습니다.",
  followUpRequired: false,
}

describe("completeWithRecordSchema", () => {
  it("유효한 데이터를 통과시킨다", () => {
    const result = completeWithRecordSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it("선택 필드 포함 데이터를 통과시킨다", () => {
    const result = completeWithRecordSchema.safeParse({
      ...validData,
      aiSummary: "AI 생성 요약",
      followUpRequired: true,
      followUpDate: "2026-04-01",
      satisfactionScore: 4,
    })
    expect(result.success).toBe(true)
  })

  it("reservationId가 비어있으면 실패한다", () => {
    const result = completeWithRecordSchema.safeParse({ ...validData, reservationId: "" })
    expect(result.success).toBe(false)
  })

  it("잘못된 상담 유형을 거부한다", () => {
    const result = completeWithRecordSchema.safeParse({ ...validData, type: "INVALID" })
    expect(result.success).toBe(false)
  })

  it("duration이 5분 미만이면 실패한다", () => {
    const result = completeWithRecordSchema.safeParse({ ...validData, duration: 4 })
    expect(result.success).toBe(false)
  })

  it("duration이 180분 초과면 실패한다", () => {
    const result = completeWithRecordSchema.safeParse({ ...validData, duration: 181 })
    expect(result.success).toBe(false)
  })

  it("summary가 10자 미만이면 실패한다", () => {
    const result = completeWithRecordSchema.safeParse({ ...validData, summary: "짧음" })
    expect(result.success).toBe(false)
  })

  it("summary가 1000자 초과면 실패한다", () => {
    const result = completeWithRecordSchema.safeParse({ ...validData, summary: "가".repeat(1001) })
    expect(result.success).toBe(false)
  })

  it("followUpRequired=true인데 followUpDate가 없으면 실패한다", () => {
    const result = completeWithRecordSchema.safeParse({ ...validData, followUpRequired: true })
    expect(result.success).toBe(false)
  })

  it("satisfactionScore가 0이면 실패한다", () => {
    const result = completeWithRecordSchema.safeParse({ ...validData, satisfactionScore: 0 })
    expect(result.success).toBe(false)
  })

  it("satisfactionScore가 6이면 실패한다", () => {
    const result = completeWithRecordSchema.safeParse({ ...validData, satisfactionScore: 6 })
    expect(result.success).toBe(false)
  })

  it.each([1, 2, 3, 4, 5])("satisfactionScore %d를 허용한다", (score) => {
    const result = completeWithRecordSchema.safeParse({ ...validData, satisfactionScore: score })
    expect(result.success).toBe(true)
  })
})
