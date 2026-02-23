import type { NameNumerologyResult } from "../name/name-numerology"

export function calculateNameCompatibility(
  teacherName: NameNumerologyResult | null | undefined,
  studentName: NameNumerologyResult | null | undefined
): number {
  if (!teacherName || !studentName) return 0

  const teacherGrids = teacherName.grids
  const studentGrids = studentName.grids
  if (!teacherGrids || !studentGrids) return 0

  const wonDiff = Math.abs(teacherGrids.won - studentGrids.won)
  const hyungDiff = Math.abs(teacherGrids.hyung - studentGrids.hyung)
  const yiDiff = Math.abs(teacherGrids.yi - studentGrids.yi)
  const jeongDiff = Math.abs(teacherGrids.jeong - studentGrids.jeong)

  const normalizedDiff = (wonDiff + hyungDiff + yiDiff + jeongDiff) / (80 * 4)
  const similarity = 1 - normalizedDiff
  return Math.max(0, Math.min(1, similarity))
}
