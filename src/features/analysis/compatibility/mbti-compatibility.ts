import type { MbtiPercentages } from "../mbti/mbti-scoring"

export function calculateMbtiCompatibility(
  teacherMbti: MbtiPercentages | null | undefined,
  studentMbti: MbtiPercentages | null | undefined
): number {
  if (!teacherMbti || !studentMbti) return 0.5

  const eiDiff = Math.abs(teacherMbti.E - studentMbti.E)
  const snDiff = Math.abs(teacherMbti.S - studentMbti.S)
  const tfDiff = Math.abs(teacherMbti.T - studentMbti.T)
  const jpDiff = Math.abs(teacherMbti.J - studentMbti.J)

  const avgDiff = (eiDiff + snDiff + tfDiff + jpDiff) / 4
  const similarity = 1 - avgDiff / 100
  return Math.max(0, Math.min(1, similarity))
}
