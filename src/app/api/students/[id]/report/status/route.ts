import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/dal'
import { counselingReportsRepo } from '@/features/counseling';
const {  getStudentReportPDF  } = counselingReportsRepo;
import { logger } from '@/lib/logger'

/**
 * GET /api/students/[id]/report/status
 * Return PDF generation status for polling
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

    // Authentication
    const session = await verifySession()
    if (!session?.userId) {
      return NextResponse.json(
        { error: '인증되지 않았습니다.' },
        { status: 401 }
      )
    }

    // Get report status
    const report = await getStudentReportPDF(studentId)

    return NextResponse.json({
      status: report?.status || 'none',
      fileUrl: report?.fileUrl || null,
      errorMessage: report?.errorMessage || null,
      generatedAt: report?.generatedAt || null,
    })
  } catch (error) {
    logger.error({ error, studentId }, 'Status check error')
    return NextResponse.json(
      { error: '상태 조회 실패' },
      { status: 500 }
    )
  }
}
