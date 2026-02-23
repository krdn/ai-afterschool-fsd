import React from 'react'
import type { DocumentProps } from '@react-pdf/renderer'
import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/dal'
import { db } from '@/lib/db/client'
import { counselingReportsRepo } from '@/features/counseling';
const {  getStudentReportPDF, fetchReportData  } = counselingReportsRepo;
import { ConsultationReport } from '@/features/report'
import { pdfToBuffer } from '@/features/report'
import type { ConsultationReportData } from '@/features/report'
import { createPDFStorage } from '@/lib/storage/factory'
import { logger } from '@/lib/logger'
import path from 'path'

/**
 * GET /api/students/[id]/report
 * Stream PDF as response (use existing or generate on-demand)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Declare studentId at function level so catch block can access it
  let studentId: string | undefined

  try {
    const { id: id } = await params
    studentId = id

    // 1. Authentication
    const session = await verifySession()
    if (!session?.userId) {
      return NextResponse.json(
        { error: '인증되지 않았습니다.' },
        { status: 401 }
      )
    }

    // 2. Verify student ownership
    const student = await db.student.findFirst({
      where: {
        id: studentId,
        teacherId: session.userId,
      },
    })

    if (!student) {
      return NextResponse.json(
        { error: '학생을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 3. Check for cached PDF
    const report = await getStudentReportPDF(studentId)

    if (report?.status === 'complete' && report.fileUrl) {
      // Serve cached PDF using storage interface
      const storage = createPDFStorage()
      const filename = path.basename(report.fileUrl)

      try {
        const fileExists = await storage.exists(filename)

        if (fileExists) {
          // For local storage, serve directly
          if (process.env.PDF_STORAGE_TYPE === 'local' || !process.env.PDF_STORAGE_TYPE) {
            const pdfBuffer = await storage.download(filename)

            return new NextResponse(pdfBuffer as BodyInit, {
              headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="report-${student.name}.pdf"`,
                'Content-Length': pdfBuffer.length.toString(),
                'Cache-Control': 'public, max-age=3600',
              },
            })
          }

          // For S3 storage, fetch and proxy the PDF
          // This avoids presigned URL expiration issues
          const presignedUrl = await storage.getPresignedUrl(filename)
          const pdfResponse = await fetch(presignedUrl)

          if (!pdfResponse.ok) {
            throw new Error(`Failed to fetch PDF from S3: ${pdfResponse.statusText}`)
          }

          const pdfBuffer = await pdfResponse.arrayBuffer()

          return new NextResponse(Buffer.from(pdfBuffer) as BodyInit, {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="report-${student.name}.pdf"`,
              'Content-Length': pdfBuffer.byteLength.toString(),
              'Cache-Control': 'public, max-age=3600',
            },
          })
        }
      } catch (fileError) {
        // File doesn't exist or storage error, regenerate
        logger.error({ error: fileError, studentId }, 'Cached PDF access error')
      }
    }

    // 4. Generate PDF on-demand (synchronous for API response)
    const reportData = await fetchReportData(studentId, session.userId)
    if (!reportData) {
      return NextResponse.json(
        { error: '보고서 데이터를 가져올 수 없습니다.' },
        { status: 500 }
      )
    }

    // Render PDF to buffer
    const pdfBuffer = await pdfToBuffer(
      React.createElement(ConsultationReport, reportData as ConsultationReportData) as React.ReactElement<DocumentProps>
    )

    // Return PDF
    return new NextResponse(Buffer.from(pdfBuffer) as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="report-${student.name}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache', // Don't cache on-demand generation
      },
    })
  } catch (error) {
    logger.error({ error, studentId }, 'PDF generation error')
    return NextResponse.json(
      { error: 'PDF 생성에 실패했습니다.' },
      { status: 500 }
    )
  }
}
