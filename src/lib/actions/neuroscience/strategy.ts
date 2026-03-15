'use server';

import { getCurrentTeacher } from '@/lib/dal';
import { ok, fail, fieldError, type ActionResult } from '@/lib/errors/action-result';
import { logger } from '@/lib/logger';
import { getStudentProfile } from '@/features/grade-management/analysis/student-profiler';
import { getStrategyRecommendation } from '@/features/neuroscience';
import { strategyInputSchema, type NeuroscienceStrategy, type NeuroscienceCondition } from '@/features/neuroscience/types';
import { db } from '@/lib/db/client';

type StrategyActionResult = {
  strategy: NeuroscienceStrategy;
  provider: string;
  model: string;
};

function deriveGradeContext(profile: {
  gradeHistory: { subject: string; score: number; testDate: Date }[];
}): NeuroscienceCondition['gradeContext'] {
  const history = profile.gradeHistory;
  if (history.length === 0) return undefined;

  const subjectScores = new Map<string, number[]>();
  for (const g of history) {
    const arr = subjectScores.get(g.subject) ?? [];
    arr.push(g.score);
    subjectScores.set(g.subject, arr);
  }

  const subjectAvgs = Array.from(subjectScores.entries()).map(([subject, scores]) => ({
    subject,
    avg: scores.reduce((a, b) => a + b, 0) / scores.length,
  }));

  const overallAvg = subjectAvgs.reduce((sum, s) => sum + s.avg, 0) / (subjectAvgs.length || 1);

  // 추이: 최근 3개 vs 이전 3개 비교 (testDate asc 정렬 전제)
  const allScores = history.map(h => h.score);
  let recentTrend: 'improving' | 'stable' | 'declining' = 'stable';
  if (allScores.length >= 6) {
    const recent = allScores.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const previous = allScores.slice(-6, -3).reduce((a, b) => a + b, 0) / 3;
    if (recent - previous > 5) recentTrend = 'improving';
    else if (previous - recent > 5) recentTrend = 'declining';
  }

  const sorted = [...subjectAvgs].sort((a, b) => a.avg - b.avg);
  const weakSubjects = sorted.slice(0, 2).filter(s => s.avg < overallAvg).map(s => s.subject);
  const strongSubjects = sorted.slice(-2).filter(s => s.avg >= overallAvg).map(s => s.subject);

  return {
    recentTrend,
    weakSubjects,
    strongSubjects,
    averageScore: Math.round(overallAvg),
  };
}

export async function runStrategyRecommendation(
  input: unknown
): Promise<ActionResult<StrategyActionResult>> {
  try {
    const teacher = await getCurrentTeacher();

    const parsed = strategyInputSchema.safeParse(input);
    if (!parsed.success) return fieldError(parsed.error.flatten().fieldErrors);

    const { studentId, situation, goal, locale, provider } = parsed.data;

    const profile = await getStudentProfile(studentId);
    if (!profile) return fail('학생을 찾을 수 없습니다.');

    // 사주 데이터 조회
    const sajuAnalysis = await db.sajuAnalysis.findFirst({
      where: { subjectId: studentId, subjectType: 'STUDENT' },
      select: { interpretation: true },
    });

    // 나이 계산
    const student = await db.student.findUnique({
      where: { id: studentId },
      select: { birthDate: true },
    });
    const age = student?.birthDate
      ? Math.floor((Date.now() - student.birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : profile.grade + 6;

    const condition: NeuroscienceCondition = {
      profile: {
        studentId,
        name: profile.name,
        age,
        grade: profile.grade,
        varkType: profile.varkType,
        mbtiType: profile.mbtiType,
        sajuTraits: sajuAnalysis?.interpretation?.toString().slice(0, 200) ?? null,
        personalitySummary: profile.personalitySummary?.toString() ?? null,
      },
      situation,
      goal,
      gradeContext: deriveGradeContext(profile),
    };

    const result = await getStrategyRecommendation(condition, {
      teacherId: teacher.id,
      locale,
      providerId: provider,
    });

    return ok(result);
  } catch (error) {
    logger.error({ err: error }, 'Failed to get neuroscience strategy recommendation');
    return fail(error instanceof Error ? error.message : '학습 전략 추천 중 오류가 발생했습니다.');
  }
}
