interface GradeRecord {
  subject: string;
  normalizedScore: number;
  testDate: Date;
  category?: string | null;
}

interface SubjectAnalysis {
  name: string;
  avgScore: number;
  trend: 'UP' | 'STABLE' | 'DOWN';
  strength: boolean;
  weakCategories: string[];
  strongCategories: string[];
}

/**
 * 과목별 강점/약점을 분석한다.
 * 전체 평균 이상이면 강점, 미만이면 약점으로 분류.
 */
export function analyzeSubjectStrengths(grades: GradeRecord[]): SubjectAnalysis[] {
  const subjectMap = new Map<string, number[]>();

  grades.forEach((g) => {
    if (!subjectMap.has(g.subject)) subjectMap.set(g.subject, []);
    subjectMap.get(g.subject)!.push(g.normalizedScore);
  });

  const subjectAvgs = Array.from(subjectMap.entries()).map(([name, scores]) => ({
    name,
    avgScore: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
    scores,
  }));

  const overallAvg = subjectAvgs.length > 0
    ? subjectAvgs.reduce((sum, s) => sum + s.avgScore, 0) / subjectAvgs.length
    : 0;

  return subjectAvgs.map((s) => {
    // 트렌드 계산 (최근 2개 vs 이전 평균)
    const sorted = [...s.scores];
    let trend: 'UP' | 'STABLE' | 'DOWN' = 'STABLE';
    if (sorted.length >= 3) {
      const recentAvg = (sorted[sorted.length - 1] + sorted[sorted.length - 2]) / 2;
      const olderAvg = sorted.slice(0, -2).reduce((a, b) => a + b, 0) / (sorted.length - 2);
      if (recentAvg - olderAvg > 5) trend = 'UP';
      else if (olderAvg - recentAvg > 5) trend = 'DOWN';
    }

    // 단원별 분석
    const categoryGrades = grades.filter(g => g.subject === s.name && g.category);
    const { weakCategories, strongCategories } = categoryGrades.length > 0
      ? analyzeCategoryWeakness(categoryGrades, s.name)
      : { weakCategories: [], strongCategories: [] };

    return {
      name: s.name,
      avgScore: s.avgScore,
      trend,
      strength: s.avgScore >= overallAvg,
      weakCategories,
      strongCategories,
    };
  });
}

/**
 * 과목 내 세부 단원별 강점/약점을 분석한다.
 */
export function analyzeCategoryWeakness(
  grades: { subject?: string; category?: string | null; normalizedScore: number }[],
  subject: string
): { weakCategories: string[]; strongCategories: string[] } {
  const filtered = grades.filter(g => (!g.subject || g.subject === subject) && g.category);
  const categoryMap = new Map<string, number[]>();

  filtered.forEach((g) => {
    const cat = g.category!;
    if (!categoryMap.has(cat)) categoryMap.set(cat, []);
    categoryMap.get(cat)!.push(g.normalizedScore);
  });

  const categoryAvgs = Array.from(categoryMap.entries()).map(([name, scores]) => ({
    name,
    avg: scores.reduce((a, b) => a + b, 0) / scores.length,
  }));

  if (categoryAvgs.length === 0) return { weakCategories: [], strongCategories: [] };

  const overallAvg = categoryAvgs.reduce((sum, c) => sum + c.avg, 0) / categoryAvgs.length;

  return {
    weakCategories: categoryAvgs.filter(c => c.avg < overallAvg - 5).map(c => c.name),
    strongCategories: categoryAvgs.filter(c => c.avg >= overallAvg + 5).map(c => c.name),
  };
}

/**
 * 학습 규칙성 점수를 계산한다 (0~100).
 * 기간 내 공부한 날 수 / 전체 일 수 * 100
 */
export function calculateConsistencyScore(
  logs: { studyDate: Date; durationMin: number }[],
  periodDays: number
): number {
  if (logs.length === 0 || periodDays <= 0) return 0;

  const uniqueDays = new Set(
    logs.map((l) => new Date(l.studyDate).toISOString().split('T')[0])
  );

  return Math.round((uniqueDays.size / periodDays) * 100);
}
