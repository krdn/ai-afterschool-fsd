// 사주 분석 패널에서 공유하는 유틸리티 (학생/교사 공용)

export const HANJA_MAP: Record<string, string> = {
  갑: "甲", 을: "乙", 병: "丙", 정: "丁", 무: "戊",
  기: "己", 경: "庚", 신: "辛", 임: "壬", 계: "癸",
  자: "子", 축: "丑", 인: "寅", 묘: "卯", 진: "辰", 사: "巳",
  오: "午", 미: "未", 유: "酉", 술: "戌", 해: "亥",
}

export const BRANCH_HANJA: Record<string, string> = {
  자: "子", 축: "丑", 인: "寅", 묘: "卯", 진: "辰", 사: "巳",
  오: "午", 미: "未", 신: "申", 유: "酉", 술: "戌", 해: "亥",
}

export function hanjaLabel(stem: string, branch: string) {
  const stemHanja = HANJA_MAP[stem] ?? stem
  const branchHanja = BRANCH_HANJA[branch] ?? branch
  return `${stemHanja}${branchHanja}(${stem}${branch})`
}

export function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value)
}

export function formatBirthTime(hour: number | null | undefined, minute: number | null | undefined) {
  if (hour === null || hour === undefined) return "미상"
  const safeMinute = minute ?? 0
  return `${String(hour).padStart(2, "0")}:${String(safeMinute).padStart(2, "0")}`
}
