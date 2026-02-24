import { describe, it, expect } from "vitest"
import { extractJsonFromLLM } from "../extract-json"

describe("extractJsonFromLLM", () => {
  // 1단계: 순수 JSON 직접 파싱
  it("순수 JSON 문자열을 파싱한다", () => {
    const json = '{"name":"홍길동","score":95}'
    expect(extractJsonFromLLM(json)).toEqual({ name: "홍길동", score: 95 })
  })

  it("앞뒤 공백이 있어도 파싱한다", () => {
    expect(extractJsonFromLLM("  { \"a\": 1 }  ")).toEqual({ a: 1 })
  })

  // 2단계: 마크다운 코드블록
  it("```json 코드블록에서 JSON을 추출한다", () => {
    const text = '분석 결과:\n```json\n{"result": "success"}\n```\n위와 같습니다.'
    expect(extractJsonFromLLM(text)).toEqual({ result: "success" })
  })

  it("``` 코드블록(언어 미지정)에서도 추출한다", () => {
    const text = '```\n{"key": "value"}\n```'
    expect(extractJsonFromLLM(text)).toEqual({ key: "value" })
  })

  // 3단계: 텍스트 속 JSON 객체 추출
  it("설명 텍스트 사이에 있는 JSON 객체를 추출한다", () => {
    const text = '결과는 다음과 같습니다: {"score": 42, "level": "high"} 위 점수를 참고하세요.'
    expect(extractJsonFromLLM(text)).toEqual({ score: 42, level: "high" })
  })

  it("중첩된 JSON 객체도 올바르게 추출한다", () => {
    const text = '응답: {"outer": {"inner": 123}, "list": [1,2,3]}'
    expect(extractJsonFromLLM(text)).toEqual({ outer: { inner: 123 }, list: [1, 2, 3] })
  })

  it("문자열 안의 중괄호를 올바르게 처리한다", () => {
    const text = '분석: {"text": "값은 {x}입니다", "count": 1}'
    expect(extractJsonFromLLM(text)).toEqual({ text: "값은 {x}입니다", count: 1 })
  })

  it("이스케이프된 따옴표를 처리한다", () => {
    const text = '{"msg": "He said \\"hello\\"", "ok": true}'
    expect(extractJsonFromLLM(text)).toEqual({ msg: 'He said "hello"', ok: true })
  })

  // 실패 케이스
  it("JSON이 없으면 에러를 던진다", () => {
    expect(() => extractJsonFromLLM("그냥 텍스트입니다.")).toThrow(
      "LLM 응답에서 유효한 JSON을 추출할 수 없습니다"
    )
  })

  it("빈 문자열에서 에러를 던진다", () => {
    expect(() => extractJsonFromLLM("")).toThrow()
  })
})
