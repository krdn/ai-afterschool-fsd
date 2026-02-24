import { describe, it, expect } from "vitest"
import { hanjaLabel, toDate, formatBirthTime } from "../saju-utils"

describe("hanjaLabel", () => {
  it("천간/지지 한자를 조합한다", () => {
    expect(hanjaLabel("갑", "자")).toBe("甲子(갑자)")
    expect(hanjaLabel("을", "축")).toBe("乙丑(을축)")
  })

  it("맵에 없는 글자는 원본을 사용한다", () => {
    expect(hanjaLabel("X", "Y")).toBe("XY(XY)")
  })

  it("천간만 맵에 있는 경우", () => {
    expect(hanjaLabel("병", "Z")).toBe("丙Z(병Z)")
  })
})

describe("toDate", () => {
  it("Date 객체를 그대로 반환한다", () => {
    const d = new Date("2024-01-15")
    expect(toDate(d)).toBe(d)
  })

  it("문자열을 Date 객체로 변환한다", () => {
    const result = toDate("2024-01-15T00:00:00.000Z")
    expect(result).toBeInstanceOf(Date)
    expect(result.toISOString()).toBe("2024-01-15T00:00:00.000Z")
  })
})

describe("formatBirthTime", () => {
  it("시간과 분을 포맷한다", () => {
    expect(formatBirthTime(9, 30)).toBe("09:30")
    expect(formatBirthTime(14, 5)).toBe("14:05")
  })

  it("시간이 null이면 '미상'을 반환한다", () => {
    expect(formatBirthTime(null, 30)).toBe("미상")
    expect(formatBirthTime(undefined, 0)).toBe("미상")
  })

  it("분이 null이면 0으로 처리한다", () => {
    expect(formatBirthTime(8, null)).toBe("08:00")
    expect(formatBirthTime(0, undefined)).toBe("00:00")
  })

  it("자정(0시)도 올바르게 처리한다", () => {
    expect(formatBirthTime(0, 0)).toBe("00:00")
  })
})
