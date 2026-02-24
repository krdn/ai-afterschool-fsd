import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { getDateRangeFromPreset, PRESET_LABELS, DEFAULT_PRESETS } from "../date-range"

describe("getDateRangeFromPreset", () => {
  beforeEach(() => {
    // 2025-06-15 12:00:00 KST (03:00 UTC) 고정
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2025-06-15T03:00:00.000Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("TODAY: 오늘의 시작~끝을 반환한다", () => {
    const range = getDateRangeFromPreset("TODAY")
    expect(range.start.getDate()).toBe(range.end.getDate())
    expect(range.start.getHours()).toBe(0)
    expect(range.start.getMinutes()).toBe(0)
  })

  it("7D: 7일 전부터 오늘까지 범위를 반환한다", () => {
    const range = getDateRangeFromPreset("7D")
    const diffMs = range.end.getTime() - range.start.getTime()
    const diffDays = diffMs / (1000 * 60 * 60 * 24)
    // startOfDay(7일 전) ~ endOfDay(오늘)이므로 약 7일 + α
    expect(diffDays).toBeGreaterThanOrEqual(7)
    expect(diffDays).toBeLessThan(8.1)
  })

  it("30D: 30일 범위를 반환한다", () => {
    const range = getDateRangeFromPreset("30D")
    const diffMs = range.end.getTime() - range.start.getTime()
    const diffDays = diffMs / (1000 * 60 * 60 * 24)
    expect(diffDays).toBeGreaterThanOrEqual(30)
    expect(diffDays).toBeLessThan(31.1)
  })

  it("1M: 이번 달 시작~끝을 반환한다", () => {
    const range = getDateRangeFromPreset("1M")
    // 1M = 현재 달(subMonths(now, 0))의 startOfMonth ~ endOfMonth(now)
    expect(range.start.getMonth()).toBe(5) // June (0-indexed)
    expect(range.end.getMonth()).toBe(5)
  })

  it("3M: 3개월 범위를 반환한다", () => {
    const range = getDateRangeFromPreset("3M")
    // 2025-06에서 3M = subMonths(6, 2) = 4월부터
    expect(range.start.getMonth()).toBe(3) // April
    expect(range.end.getMonth()).toBe(5) // June
  })

  it("ALL: 2020-01-01부터 시작한다", () => {
    const range = getDateRangeFromPreset("ALL")
    expect(range.start.getFullYear()).toBe(2020)
    expect(range.start.getMonth()).toBe(0)
    expect(range.start.getDate()).toBe(1)
  })

  it("start가 항상 end보다 이전이다", () => {
    const presets = ["TODAY", "7D", "30D", "1M", "3M", "6M", "1Y", "ALL"] as const
    for (const preset of presets) {
      const range = getDateRangeFromPreset(preset)
      expect(range.start.getTime()).toBeLessThanOrEqual(range.end.getTime())
    }
  })
})

describe("PRESET_LABELS", () => {
  it("모든 프리셋에 한국어 레이블이 있다", () => {
    expect(PRESET_LABELS.TODAY).toBe("오늘")
    expect(PRESET_LABELS["7D"]).toBe("최근 7일")
    expect(PRESET_LABELS.ALL).toBe("전체")
  })
})

describe("DEFAULT_PRESETS", () => {
  it("기본 프리셋 목록이 올바르다", () => {
    expect(DEFAULT_PRESETS).toEqual(["TODAY", "7D", "30D", "3M", "ALL"])
  })
})
