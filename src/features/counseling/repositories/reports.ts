import { db } from '@/lib/db/client'

/**
 * Get cached PDF for student (if exists and data version matches)
 */
export async function getStudentReportPDF(studentId: string) {
  return await db.reportPDF.findUnique({
    where: { studentId },
  })
}

/**
 * Check if PDF needs regeneration (data version mismatch or stale status)
 */
export async function shouldRegeneratePDF(
  studentId: string,
  currentDataVersion: number
): Promise<boolean> {
  const report = await getStudentReportPDF(studentId)

  // No PDF exists
  if (!report) return true

  // PDF generation failed - should retry
  if (report.status === 'failed') return true

  // PDF is marked as stale
  if (report.status === 'stale') return true

  // Data version changed (PersonalitySummary updated)
  if (report.dataVersion !== currentDataVersion) return true

  // PDF is current
  return false
}

/**
 * Save or update PDF record with status
 */
export async function saveReportPDF(params: {
  studentId: string
  status: 'generating' | 'complete' | 'failed' | 'stale'
  fileUrl?: string
  dataVersion?: number
  errorMessage?: string
  generatedAt?: Date
}) {
  const { studentId, status, fileUrl, dataVersion, errorMessage, generatedAt } = params

  return await db.reportPDF.upsert({
    where: { studentId },
    create: {
      studentId,
      status,
      fileUrl,
      dataVersion,
      errorMessage,
      generatedAt,
    },
    update: {
      status,
      fileUrl,
      dataVersion,
      errorMessage,
      generatedAt,
      updatedAt: new Date(),
    },
  })
}

/**
 * Mark PDF as generating (prevent duplicate generation)
 */
export async function markPDFGenerating(studentId: string) {
  return await saveReportPDF({
    studentId,
    status: 'generating',
  })
}

/**
 * Mark PDF as complete with file URL
 */
export async function markPDFComplete(
  studentId: string,
  fileUrl: string,
  dataVersion: number
) {
  return await saveReportPDF({
    studentId,
    status: 'complete',
    fileUrl,
    dataVersion,
    generatedAt: new Date(),
  })
}

/**
 * Mark PDF as failed with error message
 */
export async function markPDFFailed(
  studentId: string,
  errorMessage: string
) {
  return await saveReportPDF({
    studentId,
    status: 'failed',
    errorMessage,
  })
}

/**
 * Invalidate PDF (trigger regeneration on next request)
 */
export async function invalidateStudentReport(studentId: string) {
  return await saveReportPDF({
    studentId,
    status: 'stale',
  })
}

/**
 * Fetch all data needed for consultation report
 *
 * This shared function is used by both Server Actions and API Routes
 * to retrieve student data with all related analyses for PDF generation.
 *
 * @param studentId - The student ID to fetch report data for
 * @param teacherId - The teacher ID (for ownership verification)
 * @returns Report data object or null if student not found
 */
export async function fetchReportData(studentId: string, teacherId: string) {
  const student = await db.student.findFirst({
    where: {
      id: studentId,
      teacherId,
    },
    include: {
      images: true,
      personalitySummary: true,
    },
  })

  if (!student) return null

  // 분석 데이터 일괄 조회 (통합 테이블)
  const [sajuAnalysis, nameAnalysis, mbtiAnalysis, faceAnalysis, palmAnalysis] = await Promise.all([
    db.sajuAnalysis.findUnique({
      where: { subjectType_subjectId: { subjectType: 'STUDENT', subjectId: studentId } },
    }),
    db.nameAnalysis.findUnique({
      where: { subjectType_subjectId: { subjectType: 'STUDENT', subjectId: studentId } },
    }),
    db.mbtiAnalysis.findUnique({
      where: { subjectType_subjectId: { subjectType: 'STUDENT', subjectId: studentId } },
    }),
    db.faceAnalysis.findUnique({
      where: { subjectType_subjectId: { subjectType: 'STUDENT', subjectId: studentId } },
    }),
    db.palmAnalysis.findUnique({
      where: { subjectType_subjectId: { subjectType: 'STUDENT', subjectId: studentId } },
    }),
  ])

  return {
    student: {
      name: student.name,
      birthDate: student.birthDate,
      school: student.school,
      grade: student.grade,
      targetUniversity: student.targetUniversity,
      targetMajor: student.targetMajor,
      bloodType: student.bloodType,
    },
    analyses: {
      saju: sajuAnalysis
        ? {
            result: sajuAnalysis.result,
            interpretation: sajuAnalysis.interpretation,
            calculatedAt: sajuAnalysis.calculatedAt,
          }
        : null,
      name: nameAnalysis
        ? {
            result: nameAnalysis.result,
            interpretation: nameAnalysis.interpretation,
            calculatedAt: nameAnalysis.calculatedAt,
          }
        : null,
      mbti: mbtiAnalysis
        ? {
            mbtiType: mbtiAnalysis.mbtiType,
            percentages: mbtiAnalysis.percentages as Record<string, number>,
            calculatedAt: mbtiAnalysis.calculatedAt,
          }
        : null,
      face: faceAnalysis
        ? {
            result: faceAnalysis.result,
            status: faceAnalysis.status,
            errorMessage: faceAnalysis.errorMessage,
          }
        : null,
      palm: palmAnalysis
        ? {
            result: palmAnalysis.result,
            status: palmAnalysis.status,
            errorMessage: palmAnalysis.errorMessage,
          }
        : null,
    },
    personalitySummary: student.personalitySummary
      ? {
          coreTraits: student.personalitySummary.coreTraits,
          learningStrategy: student.personalitySummary.learningStrategy,
          careerGuidance: student.personalitySummary.careerGuidance,
          status: student.personalitySummary.status,
        }
      : null,
    generatedAt: new Date(),
  }
}
