import type { SajuResult, SajuElement } from "../saju/saju"

export function calculateSajuCompatibility(
  teacherSaju: SajuResult | null | undefined,
  studentSaju: SajuResult | null | undefined
): number {
  if (!teacherSaju || !studentSaju) return 0

  const teacherElements = teacherSaju.elements
  const studentElements = studentSaju.elements
  const elementOrder: SajuElement[] = ["목", "화", "토", "금", "수"]

  const teacherVector = elementOrder.map((e) => teacherElements[e] ?? 0)
  const studentVector = elementOrder.map((e) => studentElements[e] ?? 0)

  const dotProduct = teacherVector.reduce((sum, val, i) => sum + val * studentVector[i], 0)
  const teacherMagnitude = Math.sqrt(teacherVector.reduce((sum, val) => sum + val ** 2, 0))
  const studentMagnitude = Math.sqrt(studentVector.reduce((sum, val) => sum + val ** 2, 0))

  if (teacherMagnitude === 0 || studentMagnitude === 0) return 0

  const similarity = dotProduct / (teacherMagnitude * studentMagnitude)
  return Math.max(0, Math.min(1, similarity))
}
