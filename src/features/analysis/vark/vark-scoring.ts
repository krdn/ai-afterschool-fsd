export type VarkQuestion = {
  id: number
  type: string
  text: string
  description: string
}

export type VarkScores = {
  v: number
  a: number
  r: number
  k: number
}

export type VarkPercentages = {
  V: number
  A: number
  R: number
  K: number
}

export type VarkResult = {
  scores: VarkScores
  varkType: string
  percentages: VarkPercentages
}

export function calculateProgress(
  responses: Record<string, number>,
  totalQuestions: number
) {
  const answeredCount = Object.keys(responses).length
  const percentage = Math.round((answeredCount / totalQuestions) * 100)
  return { answeredCount, totalQuestions, percentage }
}

export function scoreVark(
  responses: Record<string, number>,
  questions: VarkQuestion[]
): VarkResult {
  const scores: VarkScores = { v: 0, a: 0, r: 0, k: 0 }

  for (const question of questions) {
    const response = responses[question.id.toString()]
    if (response !== undefined) {
      const type = question.type.toLowerCase() as keyof VarkScores
      scores[type] += response
    }
  }

  const total = scores.v + scores.a + scores.r + scores.k
  const percentages: VarkPercentages = {
    V: total > 0 ? Math.round((scores.v / total) * 100) : 25,
    A: total > 0 ? Math.round((scores.a / total) * 100) : 25,
    R: total > 0 ? Math.round((scores.r / total) * 100) : 25,
    K: total > 0 ? Math.round((scores.k / total) * 100) : 25,
  }

  const pSum = percentages.V + percentages.A + percentages.R + percentages.K
  if (pSum !== 100 && total > 0) {
    const maxKey = (Object.keys(percentages) as (keyof VarkPercentages)[])
      .reduce((a, b) => percentages[a] >= percentages[b] ? a : b)
    percentages[maxKey] += (100 - pSum)
  }

  const varkType = determineVarkType(percentages)
  return { scores, varkType, percentages }
}

export function determineVarkType(percentages: VarkPercentages): string {
  const threshold = 25
  const margin = 3

  const types: Array<{ key: string; value: number }> = [
    { key: "V", value: percentages.V },
    { key: "A", value: percentages.A },
    { key: "R", value: percentages.R },
    { key: "K", value: percentages.K },
  ]

  const dominant = types.filter(t => t.value >= threshold + margin)

  if (dominant.length === 0 || dominant.length === 4) {
    return "VARK"
  }

  return dominant
    .sort((a, b) => b.value - a.value)
    .map(t => t.key)
    .join("")
}
