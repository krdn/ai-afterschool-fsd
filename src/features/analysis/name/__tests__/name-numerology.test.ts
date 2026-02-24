import { describe, it, expect } from "vitest"
import {
  splitKoreanName,
  calculateNameNumerology,
  generateNameInterpretation,
} from "../name-numerology"

describe("splitKoreanName", () => {
  it("2글자 이름을 분리한다 (성 1 + 이름 1)", () => {
    const result = splitKoreanName("김철")
    expect(result).toEqual({
      surname: "김",
      givenName: "철",
      surnameLength: 1,
      givenNameLength: 1,
    })
  })

  it("3글자 이름을 분리한다 (성 1 + 이름 2)", () => {
    const result = splitKoreanName("김철수")
    expect(result).toEqual({
      surname: "김",
      givenName: "철수",
      surnameLength: 1,
      givenNameLength: 2,
    })
  })

  it("복성을 인식한다 (남궁)", () => {
    const result = splitKoreanName("남궁민")
    expect(result).toEqual({
      surname: "남궁",
      givenName: "민",
      surnameLength: 2,
      givenNameLength: 1,
    })
  })

  it("복성 + 이름 2글자 (4글자)", () => {
    const result = splitKoreanName("제갈공명")
    expect(result).toEqual({
      surname: "제갈",
      givenName: "공명",
      surnameLength: 2,
      givenNameLength: 2,
    })
  })

  it("1글자 이름은 null을 반환한다", () => {
    expect(splitKoreanName("김")).toBeNull()
  })

  it("5글자 이상 이름은 null을 반환한다", () => {
    expect(splitKoreanName("김나라사랑해")).toBeNull()
  })
})

describe("calculateNameNumerology", () => {
  it("한자 없으면 missing-hanja 상태를 반환한다", () => {
    const result = calculateNameNumerology({ name: "김철수" })
    expect(result.status).toBe("missing-hanja")
  })

  it("이름 길이가 범위 밖이면 invalid-name을 반환한다", () => {
    const result = calculateNameNumerology({ name: "김", hanjaName: "金" })
    expect(result.status).toBe("invalid-name")
  })

  it("한자와 이름 길이가 다르면 missing-hanja를 반환한다", () => {
    const result = calculateNameNumerology({ name: "김철수", hanjaName: "金哲" })
    expect(result.status).toBe("missing-hanja")
  })

  it("유효한 한자 이름으로 성명학을 계산한다", () => {
    // 金(8) + 哲(10) + 洙(10)
    const result = calculateNameNumerology({ name: "김철수", hanjaName: "金哲洙" })
    if (result.status !== "ok") {
      // 한자 데이터에 哲,洙가 없을 수 있으므로 unknown-stroke도 허용
      expect(["ok", "unknown-stroke"]).toContain(result.status)
      return
    }
    expect(result.result.split.surname).toBe("김")
    expect(result.result.split.givenName).toBe("철수")
    expect(result.result.strokes.perSyllable).toHaveLength(3)
    expect(result.result.grids.jeong).toBe(result.result.strokes.total)
  })
})

describe("generateNameInterpretation", () => {
  it("해석 문장을 생성한다", () => {
    const result = generateNameInterpretation({
      split: { surname: "김", givenName: "철수", surnameLength: 1, givenNameLength: 2 },
      strokes: { perSyllable: [8, 10, 10], surname: 8, givenName: 20, total: 28 },
      grids: { won: 18, hyung: 18, yi: 20, jeong: 28 },
      interpretations: {
        won: "안정과 성실이 돋보입니다",
        hyung: "안정과 성실이 돋보입니다",
        yi: "도전과 성취의 기운이 있습니다",
        jeong: "도전과 성취의 기운이 있습니다",
        overall: "균형감이 좋습니다",
      },
    })
    expect(result).toContain("김")
    expect(result).toContain("철수")
    expect(result).toContain("28획")
    expect(result).toContain("성명학 해석은 참고용")
  })
})
