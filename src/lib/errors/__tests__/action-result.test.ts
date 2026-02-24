import { describe, it, expect } from "vitest"
import { ok, okVoid, fail, fieldError, isOk, isFieldError } from "../action-result"

describe("ActionResult 헬퍼", () => {
  describe("ok", () => {
    it("데이터 포함 성공 결과를 생성한다", () => {
      const result = ok({ id: "1", name: "테스트" })
      expect(result).toEqual({ success: true, data: { id: "1", name: "테스트" } })
    })
  })

  describe("okVoid", () => {
    it("데이터 없는 성공 결과를 생성한다", () => {
      expect(okVoid()).toEqual({ success: true })
    })

    it("data 프로퍼티가 없다", () => {
      expect(okVoid()).not.toHaveProperty("data")
    })
  })

  describe("fail", () => {
    it("에러 메시지를 포함한 실패 결과를 생성한다", () => {
      expect(fail("에러 발생")).toEqual({ success: false, error: "에러 발생" })
    })

    it("에러 코드를 선택적으로 포함한다", () => {
      expect(fail("인증 실패", "UNAUTHORIZED")).toEqual({
        success: false,
        error: "인증 실패",
        code: "UNAUTHORIZED",
      })
    })

    it("코드 없이 호출하면 code 프로퍼티가 없다", () => {
      expect(fail("에러")).not.toHaveProperty("code")
    })
  })

  describe("fieldError", () => {
    it("필드 에러를 생성한다", () => {
      const result = fieldError({ email: ["올바른 이메일을 입력하세요"] })
      expect(result).toEqual({
        success: false,
        fieldErrors: { email: ["올바른 이메일을 입력하세요"] },
      })
    })

    it("전체 에러 메시지를 선택적으로 포함한다", () => {
      const result = fieldError(
        { name: ["필수 입력입니다"] },
        "입력값이 잘못되었습니다"
      )
      expect(result.error).toBe("입력값이 잘못되었습니다")
      expect(result.fieldErrors).toEqual({ name: ["필수 입력입니다"] })
    })
  })
})

describe("타입 가드", () => {
  describe("isOk", () => {
    it("성공 결과에 true를 반환한다", () => {
      expect(isOk(ok("데이터"))).toBe(true)
      expect(isOk(okVoid())).toBe(true)
    })

    it("실패 결과에 false를 반환한다", () => {
      expect(isOk(fail("에러"))).toBe(false)
      expect(isOk(fieldError({ a: ["에러"] }))).toBe(false)
    })
  })

  describe("isFieldError", () => {
    it("필드 에러에 true를 반환한다", () => {
      expect(isFieldError(fieldError({ a: ["에러"] }))).toBe(true)
    })

    it("일반 실패에 false를 반환한다", () => {
      expect(isFieldError(fail("에러"))).toBe(false)
    })

    it("성공 결과에 false를 반환한다", () => {
      expect(isFieldError(ok("데이터"))).toBe(false)
    })
  })
})
