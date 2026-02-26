import { describe, it, expect } from "vitest"
import {
  updateNoteSchema,
  addNoteSchema,
  deleteNoteSchema,
  reorderNotesSchema,
  completeSessionSchema,
} from "../session-notes"

describe("updateNoteSchema", () => {
  it("유효한 체크 업데이트를 통과시킨다", () => {
    const result = updateNoteSchema.safeParse({ noteId: "note-001", checked: true })
    expect(result.success).toBe(true)
  })

  it("유효한 메모 업데이트를 통과시킨다", () => {
    const result = updateNoteSchema.safeParse({ noteId: "note-001", memo: "메모 내용" })
    expect(result.success).toBe(true)
  })

  it("빈 noteId를 거부한다", () => {
    const result = updateNoteSchema.safeParse({ noteId: "", checked: true })
    expect(result.success).toBe(false)
  })

  it("메모 500자 초과를 거부한다", () => {
    const result = updateNoteSchema.safeParse({ noteId: "note-001", memo: "가".repeat(501) })
    expect(result.success).toBe(false)
  })
})

describe("addNoteSchema", () => {
  it("유효한 노트 추가를 통과시킨다", () => {
    const result = addNoteSchema.safeParse({ sessionId: "session-001", content: "새 항목" })
    expect(result.success).toBe(true)
  })

  it("빈 content를 거부한다", () => {
    const result = addNoteSchema.safeParse({ sessionId: "session-001", content: "" })
    expect(result.success).toBe(false)
  })

  it("200자 초과 content를 거부한다", () => {
    const result = addNoteSchema.safeParse({ sessionId: "session-001", content: "가".repeat(201) })
    expect(result.success).toBe(false)
  })
})

describe("deleteNoteSchema", () => {
  it("유효한 삭제 요청을 통과시킨다", () => {
    const result = deleteNoteSchema.safeParse({ noteId: "note-001" })
    expect(result.success).toBe(true)
  })
})

describe("reorderNotesSchema", () => {
  it("유효한 정렬 요청을 통과시킨다", () => {
    const result = reorderNotesSchema.safeParse({
      sessionId: "session-001",
      noteIds: ["note-001", "note-002", "note-003"],
    })
    expect(result.success).toBe(true)
  })

  it("빈 noteIds 배열을 거부한다", () => {
    const result = reorderNotesSchema.safeParse({
      sessionId: "session-001",
      noteIds: [],
    })
    expect(result.success).toBe(false)
  })
})

const validCompleteData = {
  sessionId: "session-001",
  reservationId: "res-001",
  type: "ACADEMIC" as const,
  duration: 30,
  summary: "학생의 학업 성취도에 대해 상담을 진행했습니다.",
  followUpRequired: false,
}

describe("completeSessionSchema", () => {
  it("유효한 데이터를 통과시킨다", () => {
    const result = completeSessionSchema.safeParse(validCompleteData)
    expect(result.success).toBe(true)
  })

  it("선택 필드 포함 데이터를 통과시킨다", () => {
    const result = completeSessionSchema.safeParse({
      ...validCompleteData,
      aiSummary: "AI 생성 요약",
      followUpRequired: true,
      followUpDate: "2026-04-01",
      satisfactionScore: 4,
    })
    expect(result.success).toBe(true)
  })

  it("followUpRequired=true인데 followUpDate가 없으면 실패한다", () => {
    const result = completeSessionSchema.safeParse({
      ...validCompleteData,
      followUpRequired: true,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const followUpError = result.error.issues.find((i) => i.path.includes("followUpDate"))
      expect(followUpError).toBeDefined()
    }
  })

  it("summary가 10자 미만이면 실패한다", () => {
    const result = completeSessionSchema.safeParse({ ...validCompleteData, summary: "짧음" })
    expect(result.success).toBe(false)
  })

  it("summary가 2000자 초과면 실패한다", () => {
    const result = completeSessionSchema.safeParse({ ...validCompleteData, summary: "가".repeat(2001) })
    expect(result.success).toBe(false)
  })

  it("satisfactionScore가 0이면 실패한다", () => {
    const result = completeSessionSchema.safeParse({ ...validCompleteData, satisfactionScore: 0 })
    expect(result.success).toBe(false)
  })

  it("satisfactionScore가 6이면 실패한다", () => {
    const result = completeSessionSchema.safeParse({ ...validCompleteData, satisfactionScore: 6 })
    expect(result.success).toBe(false)
  })

  it.each([1, 2, 3, 4, 5])("satisfactionScore %d를 허용한다", (score) => {
    const result = completeSessionSchema.safeParse({ ...validCompleteData, satisfactionScore: score })
    expect(result.success).toBe(true)
  })
})
