'use server'

import React from 'react'
import type { DocumentProps } from '@react-pdf/renderer'
import { after } from 'next/server'
import { verifySession } from '@/lib/dal'
import { db } from '@/lib/db/client'
import { counselingReportsRepo } from '@/features/counseling';
const {
  getStudentReportPDF,
  shouldRegeneratePDF,
  markPDFGenerating,
  markPDFComplete,
  markPDFFailed,
  fetchReportData,
 } = counselingReportsRepo;
import { getPersonalitySummary } from '@/features/analysis'
import { ConsultationReport } from '@/features/report'
import { pdfToBuffer, generateReportFilename } from '@/features/report'
import type { ConsultationReportData } from '@/features/report'
import { createPDFStorage } from '@/lib/storage/factory'
import { revalidatePath } from 'next/cache'

/**
 * Generate consultation report PDF asynchronously
 * Follows Phase 6's after() pattern for non-blocking generation
 */
export async function generateConsultationReport(studentId: string) {
  // 1. Teacher authentication
  const session = await verifySession()
  if (!session?.userId) {
    return { success: false, error: '인증되지 않았습니다.' }
  }

  // 2. Verify student ownership
  const student = await db.student.findFirst({
    where: {
      id: studentId,
      teacherId: session.userId,
    },
  })

  if (!student) {
    return { success: false, error: '학생을 찾을 수 없습니다.' }
  }

  // 3. Check if already generating (prevent duplicate)
  const existingReport = await getStudentReportPDF(studentId)
  if (existingReport?.status === 'generating') {
    return { success: false, error: '이미 생성 중입니다.' }
  }

  // 4. Get current data version for cache invalidation
  const summary = await getPersonalitySummary(studentId)
  const currentDataVersion = summary?.version || 1

  // 5. Check if regeneration is needed
  const needsRegeneration = await shouldRegeneratePDF(
    studentId,
    currentDataVersion
  )

  if (!needsRegeneration && existingReport?.status === 'complete') {
    return {
      success: true,
      message: '이미 최신 보고서가 있습니다.',
      cached: true,
      fileUrl: existingReport.fileUrl,
    }
  }

  // 6. Mark as generating
  await markPDFGenerating(studentId)

  // 7. Generate PDF in background using after() pattern
  after(async () => {
    try {
      // Fetch all data needed for report
      const reportData = await fetchReportData(studentId, session.userId)
      if (!reportData) {
        throw new Error('보고서 데이터를 가져올 수 없습니다.')
      }

      // Generate PDF file using storage interface
      const filename = generateReportFilename(
        studentId,
        student.name,
        Date.now()
      )
      const storage = createPDFStorage()

      // Render PDF to buffer and upload
      const pdfBuffer = await pdfToBuffer(
        React.createElement(ConsultationReport, reportData as ConsultationReportData) as React.ReactElement<DocumentProps>
      )
      await storage.upload(filename, Buffer.from(pdfBuffer))

      // Mark as complete with storage URL
      const reportUrl = await storage.getPresignedUrl(filename)
      await markPDFComplete(studentId, reportUrl, currentDataVersion)

      // Revalidate path to refresh UI
      revalidatePath(`/students/${studentId}`)
    } catch (error) {
      // Mark as failed
      await markPDFFailed(
        studentId,
        error instanceof Error ? error.message : '알 수 없는 오류'
      )

      // Revalidate path to show error state
      revalidatePath(`/students/${studentId}`)
    }
  })

  return {
    success: true,
    message: 'PDF 생성을 시작했습니다. 완료되면 알림을 드릴게요.',
    cached: false,
  }
}

/**
 * Get PDF generation status
 */
export async function getReportStatus(studentId: string) {
  const session = await verifySession()
  if (!session?.userId) {
    return { error: '인증되지 않았습니다.' }
  }

  const report = await getStudentReportPDF(studentId)

  return {
    status: report?.status || 'none',
    fileUrl: report?.fileUrl || null,
    errorMessage: report?.errorMessage || null,
    generatedAt: report?.generatedAt || null,
  }
}
