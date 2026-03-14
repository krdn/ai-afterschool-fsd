type CutoffRecord = {
  academicYear: number
  admissionType: string
  cutoffGrade?: number | null
  cutoffScore?: number | null
  competitionRate?: number | null
  enrollmentCount?: number | null
}

export type TrendResult = {
  admissionType: string
  trends: {
    academicYear: number
    cutoffGrade?: number | null
    cutoffScore?: number | null
    competitionRate?: number | null
    enrollmentCount?: number | null
  }[]
  direction: 'EASIER' | 'HARDER' | 'STABLE' | 'UNKNOWN'
}

export function analyzeTrend(cutoffs: CutoffRecord[], admissionType: string): TrendResult {
  const filtered = cutoffs
    .filter(c => c.admissionType === admissionType)
    .sort((a, b) => a.academicYear - b.academicYear)

  if (filtered.length < 2) {
    return {
      admissionType,
      trends: filtered.map(c => ({
        academicYear: c.academicYear,
        cutoffGrade: c.cutoffGrade,
        cutoffScore: c.cutoffScore,
        competitionRate: c.competitionRate,
        enrollmentCount: c.enrollmentCount,
      })),
      direction: 'UNKNOWN',
    }
  }

  const first = filtered[0]
  const last = filtered[filtered.length - 1]

  let direction: TrendResult['direction'] = 'STABLE'

  // 내신 등급: 낮을수록 좋음 → 등급이 내려가면 HARDER
  if (first.cutoffGrade != null && last.cutoffGrade != null) {
    const diff = last.cutoffGrade - first.cutoffGrade
    if (diff < -0.2) direction = 'HARDER'
    else if (diff > 0.2) direction = 'EASIER'
  } else if (first.cutoffScore != null && last.cutoffScore != null) {
    // 수능 점수: 높을수록 좋음 → 점수가 올라가면 HARDER
    const diff = last.cutoffScore - first.cutoffScore
    if (diff > 5) direction = 'HARDER'
    else if (diff < -5) direction = 'EASIER'
  }

  return {
    admissionType,
    trends: filtered.map(c => ({
      academicYear: c.academicYear,
      cutoffGrade: c.cutoffGrade,
      cutoffScore: c.cutoffScore,
      competitionRate: c.competitionRate,
      enrollmentCount: c.enrollmentCount,
    })),
    direction,
  }
}
