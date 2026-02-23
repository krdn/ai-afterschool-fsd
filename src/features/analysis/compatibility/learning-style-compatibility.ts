import type { MbtiPercentages } from "../mbti/mbti-scoring"

export type LearningStyleScores = {
  visual: number
  auditory: number
  readWrite: number
  kinesthetic: number
}

export function deriveLearningStyle(
  mbti: MbtiPercentages | null | undefined
): LearningStyleScores | null {
  if (!mbti) return null
  return {
    visual: (mbti.S * 0.6 + mbti.J * 0.4),
    auditory: mbti.E,
    readWrite: mbti.I,
    kinesthetic: (mbti.N * 0.6 + mbti.P * 0.4),
  }
}

export function calculateLearningStyleCompatibility(
  teacherMbti: MbtiPercentages | null | undefined,
  studentMbti: MbtiPercentages | null | undefined
): number {
  if (!teacherMbti || !studentMbti) return 0.5

  const teacherStyle = deriveLearningStyle(teacherMbti)
  const studentStyle = deriveLearningStyle(studentMbti)
  if (!teacherStyle || !studentStyle) return 0.5

  const dotProduct =
    teacherStyle.visual * studentStyle.visual +
    teacherStyle.auditory * studentStyle.auditory +
    teacherStyle.readWrite * studentStyle.readWrite +
    teacherStyle.kinesthetic * studentStyle.kinesthetic

  const teacherMagnitude = Math.sqrt(
    teacherStyle.visual ** 2 + teacherStyle.auditory ** 2 +
    teacherStyle.readWrite ** 2 + teacherStyle.kinesthetic ** 2
  )
  const studentMagnitude = Math.sqrt(
    studentStyle.visual ** 2 + studentStyle.auditory ** 2 +
    studentStyle.readWrite ** 2 + studentStyle.kinesthetic ** 2
  )

  if (teacherMagnitude === 0 || studentMagnitude === 0) return 0.5

  const similarity = dotProduct / (teacherMagnitude * studentMagnitude)
  return Math.max(0, Math.min(1, similarity))
}
