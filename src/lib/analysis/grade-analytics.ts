// Types for grade analytics

export type GradeHistoryRecord = {
  subject?: string
  score: number
  testDate: Date
}

export type ControlVariable = {
  initialLevel: "HIGH" | "MID" | "LOW"
}

export type ImprovementResult = {
  improvementRate: number
  trend: "UP" | "STABLE" | "DOWN"
  confidence: number
}

export type TrendDataPoint = {
  date: Date
  avgScore: number
  subjectScores: Record<string, number>
}

export type TeacherStat = {
  teacherId: string
  studentImprovements: number[]
}

export type TeacherRanking = {
  teacherId: string
  avgImprovement: number
  medianImprovement: number
  rank: number
}

// Calculate improvement rate with control variable consideration
export function calculateImprovementRate(
  gradeHistory: GradeHistoryRecord[],
  options?: { baselineDate?: Date; controlVariable?: ControlVariable }
): ImprovementResult {
  if (gradeHistory.length < 2) {
    throw new Error("Need at least 2 grade records")
  }

  // Sort by date
  const sorted = [...gradeHistory].sort((a, b) => a.testDate.getTime() - b.testDate.getTime())

  // Find baseline (first record or before baselineDate)
  let baselineIndex = 0
  if (options?.baselineDate) {
    baselineIndex = sorted.findIndex((r) => r.testDate > options.baselineDate!)
    if (baselineIndex <= 0) baselineIndex = 0
    else baselineIndex--
  }

  const baseline = sorted[baselineIndex].score
  const current = sorted[sorted.length - 1].score

  // Calculate raw improvement rate
  let improvementRate = ((current - baseline) / baseline) * 100

  // Apply control variable adjustment
  if (options?.controlVariable) {
    const { initialLevel } = options.controlVariable
    if (initialLevel === "HIGH") {
      // HIGH initial: +10% improvement = excellent (adjust upward)
      improvementRate += 10
    } else if (initialLevel === "LOW") {
      // LOW initial: +30% improvement = excellent (adjust downward)
      improvementRate -= 10
    }
    // MID: no adjustment
  }

  // Determine trend
  let trend: "UP" | "STABLE" | "DOWN"
  if (improvementRate > 10) {
    trend = "UP"
  } else if (improvementRate < -10) {
    trend = "DOWN"
  } else {
    trend = "STABLE"
  }

  // Calculate confidence based on data points (more points = higher confidence)
  const confidence = Math.min(1, (gradeHistory.length - 1) / 3)

  return {
    improvementRate: Math.round(improvementRate * 10) / 10,
    trend,
    confidence
  }
}

// Calculate grade trend over time with monthly/weekly granularity
export function calculateGradeTrend(
  gradeHistory: GradeHistoryRecord[],
  granularity: "MONTHLY" | "WEEKLY"
): TrendDataPoint[] {
  if (gradeHistory.length === 0) {
    return []
  }

  // Sort by date
  const sorted = [...gradeHistory].sort((a, b) => a.testDate.getTime() - b.testDate.getTime())

  const groupMap = new Map<string, GradeHistoryRecord[]>()

  sorted.forEach((record) => {
    let key: string
    if (granularity === "MONTHLY") {
      const year = record.testDate.getFullYear()
      const month = record.testDate.getMonth() + 1
      key = `${year}-${month.toString().padStart(2, "0")}`
    } else {
      const startOfWeek = new Date(record.testDate)
      startOfWeek.setDate(record.testDate.getDate() - record.testDate.getDay())
      key = startOfWeek.toISOString().split("T")[0]
    }

    if (!groupMap.has(key)) {
      groupMap.set(key, [])
    }
    groupMap.get(key)!.push(record)
  })

  const dataPoints: TrendDataPoint[] = []

  Array.from(groupMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([key, records]) => {
      const avgScore =
        records.reduce((sum, r) => sum + r.score, 0) / records.length

      const subjectScores: Record<string, number> = {}
      records.forEach((record) => {
        if (record.subject) {
          if (!subjectScores[record.subject]) {
            subjectScores[record.subject] = 0
          }
          subjectScores[record.subject] += record.score
        }
      })

      Object.keys(subjectScores).forEach((subject) => {
        const count = records.filter((r) => r.subject === subject).length
        subjectScores[subject] = Math.round((subjectScores[subject] / count) * 10) / 10
      })

      const date = new Date(records[0].testDate)

      dataPoints.push({
        date,
        avgScore: Math.round(avgScore * 10) / 10,
        subjectScores
      })
    })

  // Linear interpolation for missing periods
  const interpolated: TrendDataPoint[] = []
  if (dataPoints.length > 0) {
    interpolated.push(dataPoints[0])

    for (let i = 1; i < dataPoints.length; i++) {
      const prev = dataPoints[i - 1]
      const curr = dataPoints[i]

      interpolated.push(curr)

      const daysBetween =
        (curr.date.getTime() - prev.date.getTime()) / (1000 * 60 * 60 * 24)

      if (daysBetween > 30 && granularity === "MONTHLY") {
        const monthsBetween = Math.floor(daysBetween / 30)
        for (let m = 1; m < monthsBetween; m++) {
          const ratio = m / monthsBetween
          const interpDate = new Date(prev.date.getTime() + daysBetween * ratio * (1000 * 60 * 60 * 24))
          interpolated.push({
            date: interpDate,
            avgScore: Math.round((prev.avgScore + (curr.avgScore - prev.avgScore) * ratio) * 10) / 10,
            subjectScores: {}
          })
        }
      }
    }

    interpolated.sort((a, b) => a.date.getTime() - b.date.getTime())
  }

  return interpolated
}

// Compare teachers by grade improvement with rankings
export function compareTeachersByGradeImprovement(
  teacherStats: TeacherStat[]
): TeacherRanking[] {
  if (teacherStats.length === 0) {
    return []
  }

  const rankings = teacherStats.map((stat) => {
    const improvements = stat.studentImprovements
    const avgImprovement =
      improvements.reduce((sum, val) => sum + val, 0) / improvements.length

    const sorted = [...improvements].sort((a, b) => a - b)
    const medianImprovement =
      sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)]

    return {
      teacherId: stat.teacherId,
      avgImprovement: Math.round(avgImprovement * 10) / 10,
      medianImprovement: Math.round(medianImprovement * 10) / 10,
      rank: 0
    }
  })

  // Sort by average improvement and assign ranks
  rankings.sort((a, b) => b.avgImprovement - a.avgImprovement)
  rankings.forEach((r, i) => {
    r.rank = i + 1
  })

  return rankings
}
