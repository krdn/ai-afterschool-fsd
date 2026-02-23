import type { MbtiPercentages } from "@/features/analysis"
import type { SajuResult } from "@/features/analysis"
import type { NameNumerologyResult } from "@/features/analysis"

const MBTI_KEYS = ["E", "I", "S", "N", "T", "F", "J", "P"] as const

/**
 * DB에서 조회한 MBTI 퍼센티지를 안전하게 파싱
 *
 * Prisma의 Json 타입은 runtime에 unknown이므로,
 * 8개 키(E,I,S,N,T,F,J,P)가 모두 number인지 검증한다.
 */
export function parseMbtiPercentages(
  data: unknown
): MbtiPercentages | null {
  if (!data || typeof data !== "object") return null
  const obj = data as Record<string, unknown>

  for (const key of MBTI_KEYS) {
    if (typeof obj[key] !== "number") return null
  }

  return data as MbtiPercentages
}

/**
 * DB에서 조회한 사주 결과를 안전하게 파싱
 *
 * pillars와 elements 필드 존재 여부로 검증한다.
 */
export function parseSajuResult(
  data: unknown
): SajuResult | null {
  if (!data || typeof data !== "object") return null
  const obj = data as Record<string, unknown>

  if (!obj.pillars || typeof obj.pillars !== "object") return null
  if (!obj.elements || typeof obj.elements !== "object") return null

  return data as SajuResult
}

/**
 * DB에서 조회한 이름 분석 결과에서 NameNumerologyResult를 추출
 *
 * DB result 구조: { hasHanja: boolean, numerology?: NameNumerologyResult }
 * 한자 미등록 시 numerology가 없을 수 있음
 */
export function parseNameNumerology(
  dbResult: unknown
): NameNumerologyResult | null {
  if (!dbResult || typeof dbResult !== "object") return null
  const obj = dbResult as Record<string, unknown>
  if (!obj.numerology || typeof obj.numerology !== "object") return null
  return obj.numerology as NameNumerologyResult
}
