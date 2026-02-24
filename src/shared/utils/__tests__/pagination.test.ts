import { describe, it, expect } from "vitest"
import {
  normalizePaginationParams,
  getPrismaSkipTake,
  buildPaginatedResult,
} from "../pagination"

describe("normalizePaginationParams", () => {
  it("기본값을 반환한다 (파라미터 없음)", () => {
    expect(normalizePaginationParams()).toEqual({ page: 1, pageSize: 20 })
  })

  it("전달된 값을 그대로 사용한다", () => {
    expect(normalizePaginationParams({ page: 3, pageSize: 10 })).toEqual({
      page: 3,
      pageSize: 10,
    })
  })

  it("page가 0 이하이면 1로 보정한다", () => {
    expect(normalizePaginationParams({ page: 0 })).toEqual({ page: 1, pageSize: 20 })
    expect(normalizePaginationParams({ page: -5 })).toEqual({ page: 1, pageSize: 20 })
  })

  it("pageSize가 MAX(100)를 초과하면 100으로 제한한다", () => {
    expect(normalizePaginationParams({ pageSize: 200 })).toEqual({
      page: 1,
      pageSize: 100,
    })
  })

  it("소수점을 버린다 (floor)", () => {
    expect(normalizePaginationParams({ page: 2.7, pageSize: 15.9 })).toEqual({
      page: 2,
      pageSize: 15,
    })
  })
})

describe("getPrismaSkipTake", () => {
  it("1페이지의 skip/take를 계산한다", () => {
    expect(getPrismaSkipTake({ page: 1, pageSize: 20 })).toEqual({
      skip: 0,
      take: 20,
    })
  })

  it("3페이지의 skip/take를 계산한다", () => {
    expect(getPrismaSkipTake({ page: 3, pageSize: 10 })).toEqual({
      skip: 20,
      take: 10,
    })
  })
})

describe("buildPaginatedResult", () => {
  it("페이지네이션 결과를 올바르게 생성한다", () => {
    const result = buildPaginatedResult(["a", "b", "c"], 25, {
      page: 1,
      pageSize: 10,
    })
    expect(result).toEqual({
      data: ["a", "b", "c"],
      total: 25,
      page: 1,
      pageSize: 10,
      totalPages: 3,
    })
  })

  it("total이 0이면 totalPages도 0이다", () => {
    const result = buildPaginatedResult([], 0, { page: 1, pageSize: 10 })
    expect(result.totalPages).toBe(0)
  })

  it("나머지가 있으면 totalPages를 올림한다", () => {
    const result = buildPaginatedResult([], 21, { page: 1, pageSize: 10 })
    expect(result.totalPages).toBe(3)
  })
})
