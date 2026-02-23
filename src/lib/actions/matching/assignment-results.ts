'use server'

import { db } from '@/lib/db/client'
import { verifySession } from '@/lib/dal'
import { ok, fail, type ActionResult } from '@/lib/errors/action-result'
import { logger } from "@/lib/logger"

/**
 * 배정 결과 집계 데이터
 */
export interface AssignmentResultData {
  totalStudents: number
  assignedCount: number
  excludedCount: number
  successCount: number
  failureCount: number
  averageScore: number
  createdAt: Date
  status: string
}

/**
 * 배정 결과 조회 Server Action
 *
 * AssignmentProposal ID로 배정 결과를 조회하여 집계 데이터를 반환합니다.
 *
 * @param proposalId - 배정 제안 ID
 * @returns 배정 결과 집계 데이터 또는 에러
 */
export async function getAssignmentResults(
  proposalId: string
): Promise<ActionResult<AssignmentResultData>> {
  // 인증 확인
  const session = await verifySession()
  if (!session) {
    return fail('인증되지 않은 요청입니다.')
  }

  try {
    // AssignmentProposal 조회
    const proposal = await db.assignmentProposal.findUnique({
      where: { id: proposalId },
      include: {
        proposer: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!proposal) {
      return fail('제안을 찾을 수 없습니다.')
    }

    // summary와 assignments는 Json 타입이므로 타입 캐스팅
    const summary = proposal.summary as {
      totalStudents: number
      assignedStudents: number
      averageScore: number
      minScore: number
      maxScore: number
    } | null

    const assignments = proposal.assignments as Array<{
      studentId: string
      teacherId: string
      score: number
    }> | null

    // 기본값 설정
    const totalStudents = summary?.totalStudents ?? 0
    const assignedCount = summary?.assignedStudents ?? 0
    const averageScore = summary?.averageScore ?? 0

    // 제외된 학생 계산
    const allStudentsCount = await db.student.count({
      where: { teamId: proposal.teamId ?? undefined }
    })
    const excludedCount = allStudentsCount - assignedCount

    // 성공/실패 카운트 (60점 이상 성공)
    let successCount = 0
    let failureCount = 0

    if (assignments && Array.isArray(assignments)) {
      successCount = assignments.filter(a => a.score >= 60).length
      failureCount = assignments.filter(a => a.score < 60).length
    }

    return ok({
      totalStudents,
      assignedCount,
      excludedCount,
      successCount,
      failureCount,
      averageScore,
      createdAt: proposal.createdAt,
      status: proposal.status
    })
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch assignment results')
    return fail(error instanceof Error ? error.message : '배정 결과를 불러오는데 실패했습니다.')
  }
}
