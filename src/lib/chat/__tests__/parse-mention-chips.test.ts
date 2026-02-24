import { describe, it, expect } from "vitest"
import { parseMentionChips } from "../parse-mention-chips"
import type { MentionedEntity } from "../mention-types"

const student: MentionedEntity = {
  id: "s1",
  type: "student",
  displayName: "홍길동",
}

const teacher: MentionedEntity = {
  id: "t1",
  type: "teacher",
  displayName: "김선생",
}

describe("parseMentionChips", () => {
  it("entities가 없으면 전체를 text 세그먼트로 반환한다", () => {
    const result = parseMentionChips("안녕하세요", null)
    expect(result).toEqual([{ kind: "text", text: "안녕하세요" }])
  })

  it("빈 entities 배열도 text로 처리한다", () => {
    const result = parseMentionChips("텍스트", [])
    expect(result).toEqual([{ kind: "text", text: "텍스트" }])
  })

  it("@멘션을 mention 세그먼트로 변환한다", () => {
    const result = parseMentionChips("@홍길동 학생의 성적", [student])
    expect(result).toEqual([
      { kind: "mention", entity: student },
      { kind: "text", text: " 학생의 성적" },
    ])
  })

  it("여러 멘션을 처리한다", () => {
    const result = parseMentionChips(
      "@홍길동과 @김선생의 궁합",
      [student, teacher]
    )
    expect(result).toHaveLength(4)
    expect(result[0]).toEqual({ kind: "mention", entity: student })
    expect(result[1]).toEqual({ kind: "text", text: "과 " })
    expect(result[2]).toEqual({ kind: "mention", entity: teacher })
    expect(result[3]).toEqual({ kind: "text", text: "의 궁합" })
  })

  it("멘션이 텍스트 끝에 있는 경우", () => {
    const result = parseMentionChips("분석 대상: @홍길동", [student])
    expect(result).toEqual([
      { kind: "text", text: "분석 대상: " },
      { kind: "mention", entity: student },
    ])
  })

  it("@가 없는 이름은 매칭하지 않는다", () => {
    const result = parseMentionChips("홍길동 학생", [student])
    expect(result).toEqual([{ kind: "text", text: "홍길동 학생" }])
  })
})
