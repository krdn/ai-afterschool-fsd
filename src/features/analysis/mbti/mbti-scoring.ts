export type Question = {
  id: number
  dimension: string
  pole: string
  text: string
  description: string
}

export type MbtiScores = {
  e: number
  i: number
  s: number
  n: number
  t: number
  f: number
  j: number
  p: number
}

export type MbtiPercentages = {
  E: number
  I: number
  S: number
  N: number
  T: number
  F: number
  J: number
  P: number
}

export type MbtiResult = {
  scores: MbtiScores
  mbtiType: string
  percentages: MbtiPercentages
}

export function calculateProgress(
  responses: Record<string, number>,
  totalQuestions: number
) {
  const answeredCount = Object.keys(responses).length
  const percentage = Math.round((answeredCount / totalQuestions) * 100)
  return { answeredCount, totalQuestions, percentage }
}

export function scoreMbti(
  responses: Record<string, number>,
  questions: Question[]
): MbtiResult {
  const scores: MbtiScores = { e: 0, i: 0, s: 0, n: 0, t: 0, f: 0, j: 0, p: 0 }

  for (const question of questions) {
    const response = responses[question.id.toString()]
    if (response !== undefined) {
      const pole = question.pole.toLowerCase() as keyof MbtiScores
      scores[pole] += response
    }
  }

  const percentages: MbtiPercentages = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 }
  let mbtiType = ""

  const totalEI = scores.e + scores.i
  if (totalEI > 0) {
    percentages.E = Math.round((scores.e / totalEI) * 100)
    percentages.I = 100 - percentages.E
    mbtiType += scores.e >= scores.i ? "E" : "I"
  }

  const totalSN = scores.s + scores.n
  if (totalSN > 0) {
    percentages.S = Math.round((scores.s / totalSN) * 100)
    percentages.N = 100 - percentages.S
    mbtiType += scores.s >= scores.n ? "S" : "N"
  }

  const totalTF = scores.t + scores.f
  if (totalTF > 0) {
    percentages.T = Math.round((scores.t / totalTF) * 100)
    percentages.F = 100 - percentages.T
    mbtiType += scores.t >= scores.f ? "T" : "F"
  }

  const totalJP = scores.j + scores.p
  if (totalJP > 0) {
    percentages.J = Math.round((scores.j / totalJP) * 100)
    percentages.P = 100 - percentages.J
    mbtiType += scores.j >= scores.p ? "J" : "P"
  }

  return { scores, mbtiType, percentages }
}
