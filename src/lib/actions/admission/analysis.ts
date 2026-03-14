'use server'

import { getCurrentTeacher } from '@/lib/dal'
import { ok, fail, type ActionResult } from '@/lib/errors/action-result'
import { analyzeAdmission } from '@/features/admission/services/admission-analyzer'
import { updateTargetAnalysis } from '@/features/admission/repositories/student-target'
import { analyzeSubjectStrengths } from '@/features/grade-management/analysis/stat-analyzer'
import { db } from '@/lib/db/client'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'
import type { AdmissionAnalysisInput, AdmissionAnalysisResult } from '@/features/admission/types'

export async function analyzeAdmissionAction(
  studentId: string,
  targetId: string,
): Promise<ActionResult<AdmissionAnalysisResult>> {
  try {
    await getCurrentTeacher()

    const student = await db.student.findUnique({
      where: { id: studentId },
      include: {
        gradeHistory: { orderBy: { testDate: 'desc' } },
        mockExamResults: { orderBy: { examDate: 'desc' } },
      },
    })
    if (!student) return fail('학생을 찾을 수 없습니다.')

    const target = await db.studentTarget.findUnique({
      where: { id: targetId },
      include: {
        universityMajor: {
          include: { university: true, cutoffs: { orderBy: { academicYear: 'desc' } } },
        },
      },
    })
    if (!target) return fail('목표 대학을 찾을 수 없습니다.')

    const strengths = analyzeSubjectStrengths(
      student.gradeHistory.map(g => ({
        subject: g.subject,
        normalizedScore: g.normalizedScore,
        testDate: g.testDate,
        category: g.category,
      })),
    )

    const overallTrend = strengths.length > 0
      ? strengths.filter(s => s.trend === 'UP').length > strengths.length / 2
        ? 'UP' as const
        : strengths.filter(s => s.trend === 'DOWN').length > strengths.length / 2
          ? 'DOWN' as const
          : 'STABLE' as const
      : 'STABLE' as const

    const input: AdmissionAnalysisInput = {
      student: {
        grades: student.gradeHistory.map(g => ({
          subject: g.subject,
          score: g.normalizedScore,
          gradeRank: g.gradeRank ?? undefined,
        })),
        mockExams: student.mockExamResults.map(m => ({
          subject: m.subject,
          standardScore: m.standardScore ?? undefined,
          percentile: m.percentile ?? undefined,
          gradeRank: m.gradeRank ?? undefined,
        })),
        trend: overallTrend,
      },
      target: {
        universityName: target.universityMajor.university.name,
        majorName: target.universityMajor.majorName,
        admissionType: target.admissionType ?? '수시_학생부교과',
        cutoffs: target.universityMajor.cutoffs.map(c => ({
          academicYear: c.academicYear,
          cutoffGrade: c.cutoffGrade ?? undefined,
          cutoffScore: c.cutoffScore ?? undefined,
          cutoffPercentile: c.cutoffPercentile ?? undefined,
          competitionRate: c.competitionRate ?? undefined,
        })),
      },
    }

    const result = await analyzeAdmission(input)
    await updateTargetAnalysis(targetId, result as unknown as Record<string, unknown>, result.probability)
    revalidatePath('/admission/targets')

    return ok(result)
  } catch (error) {
    logger.error({ err: error }, 'Failed to analyze admission')
    return fail(error instanceof Error ? error.message : '합격 가능성 분석에 실패했습니다.')
  }
}
