import { describe, it, expect } from "vitest"
import { counselingSchema } from "../counseling"

// ---------------------------------------------------------------------------
// 유효한 기본 데이터
// ---------------------------------------------------------------------------

const validData = {
  studentId: "student-001",
  sessionDate: "2026-03-01",
  duration: 30,
  type: "ACADEMIC" as const,
  summary: "수학 기초 학력 부족에 대한 상담을 진행했습니다.",
}

describe("counselingSchema", () => {
  // ---------------------------------------------------------------------------
  // 정상 케이스
  // ---------------------------------------------------------------------------

  it("유효한 데이터를 통과시킨다", () => {
    const result = counselingSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it("선택 필드 포함 데이터를 통과시킨다", () => {
    const result = counselingSchema.safeParse({
      ...validData,
      followUpRequired: true,
      followUpDate: "2026-04-01",
      satisfactionScore: 4,
    })
    expect(result.success).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // studentId 검증
  // ---------------------------------------------------------------------------

  it("studentId가 비어있으면 실패한다", () => {
    const result = counselingSchema.safeParse({ ...validData, studentId: "" })
    expect(result.success).toBe(false)
    if (!result.success) {
      const studentIdErrors = result.error.issues.filter(i => i.path.includes("studentId"))
      expect(studentIdErrors.length).toBeGreaterThan(0)
    }
  })

  // ---------------------------------------------------------------------------
  // duration 경계값 검증
  // ---------------------------------------------------------------------------

  it("duration이 5분 미만이면 실패한다", () => {
    const result = counselingSchema.safeParse({ ...validData, duration: 4 })
    expect(result.success).toBe(false)
  })

  it("duration이 5분이면 통과한다", () => {
    const result = counselingSchema.safeParse({ ...validData, duration: 5 })
    expect(result.success).toBe(true)
  })

  it("duration이 180분이면 통과한다", () => {
    const result = counselingSchema.safeParse({ ...validData, duration: 180 })
    expect(result.success).toBe(true)
  })

  it("duration이 181분이면 실패한다", () => {
    const result = counselingSchema.safeParse({ ...validData, duration: 181 })
    expect(result.success).toBe(false)
  })

  // ---------------------------------------------------------------------------
  // type enum 검증
  // ---------------------------------------------------------------------------

  it.each(["ACADEMIC", "CAREER", "PSYCHOLOGICAL", "BEHAVIORAL"] as const)(
    "상담 유형 '%s'을 허용한다",
    (type) => {
      const result = counselingSchema.safeParse({ ...validData, type })
      expect(result.success).toBe(true)
    }
  )

  it("잘못된 상담 유형을 거부한다", () => {
    const result = counselingSchema.safeParse({ ...validData, type: "INVALID" })
    expect(result.success).toBe(false)
  })

  // ---------------------------------------------------------------------------
  // summary 길이 검증
  // ---------------------------------------------------------------------------

  it("summary가 10자 미만이면 실패한다", () => {
    const result = counselingSchema.safeParse({ ...validData, summary: "짧은요약" })
    expect(result.success).toBe(false)
  })

  it("summary가 1000자를 초과하면 실패한다", () => {
    const result = counselingSchema.safeParse({
      ...validData,
      summary: "가".repeat(1001),
    })
    expect(result.success).toBe(false)
  })

  // ---------------------------------------------------------------------------
  // followUp superRefine 검증
  // ---------------------------------------------------------------------------

  it("followUpRequired=true인데 followUpDate가 없으면 실패한다", () => {
    const result = counselingSchema.safeParse({
      ...validData,
      followUpRequired: true,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const followUpErrors = result.error.issues.filter(i => i.path.includes("followUpDate"))
      expect(followUpErrors[0].message).toContain("후속 조치 날짜")
    }
  })

  it("followUpRequired=false이면 followUpDate 없어도 통과한다", () => {
    const result = counselingSchema.safeParse({
      ...validData,
      followUpRequired: false,
    })
    expect(result.success).toBe(true)
  })

  it("followUpDate가 잘못된 형식이면 실패한다", () => {
    const result = counselingSchema.safeParse({
      ...validData,
      followUpDate: "not-a-date",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const dateErrors = result.error.issues.filter(i => i.path.includes("followUpDate"))
      expect(dateErrors[0].message).toContain("올바른 날짜")
    }
  })

  // ---------------------------------------------------------------------------
  // satisfactionScore 경계값 검증
  // ---------------------------------------------------------------------------

  it("satisfactionScore가 0이면 실패한다", () => {
    const result = counselingSchema.safeParse({
      ...validData,
      satisfactionScore: 0,
    })
    expect(result.success).toBe(false)
  })

  it("satisfactionScore가 6이면 실패한다", () => {
    const result = counselingSchema.safeParse({
      ...validData,
      satisfactionScore: 6,
    })
    expect(result.success).toBe(false)
  })

  it.each([1, 2, 3, 4, 5])("satisfactionScore %d를 허용한다", (score) => {
    const result = counselingSchema.safeParse({
      ...validData,
      satisfactionScore: score,
    })
    expect(result.success).toBe(true)
  })
})
