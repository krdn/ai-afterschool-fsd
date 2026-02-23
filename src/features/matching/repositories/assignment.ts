/**
 * AssignmentProposal CRUD 모듈
 *
 * 자동 배정 제안의 생성, 조회, 적용 기능을 제공합니다.
 */

import { Prisma } from '@/lib/db'
import { db } from "@/lib/db/client"
import type { DetailedAssignment as Assignment } from "../types"
import type { CompatibilityScore } from "@/features/analysis"

/**
 * AssignmentProposal 요약 타입
 */
type AssignmentSummary = {
  totalStudents: number
  assignedStudents: number
  averageScore: number
  minScore: number
  maxScore: number
  teacherLoads: Record<string, number>
}

/**
 * 생성 페이로드
 */
type CreateAssignmentProposalInput = {
  name: string
  teamId?: string | null
  proposedBy: string
  assignments: Assignment[]
}

/**
 * 자동 배정 제안 생성
 *
 * @param name - 제안 이름 (예: "2026년 1학기 자동 배정")
 * @param teamId - 팀 ID (선택, null이면 전체 배정)
 * @param proposedBy - 제안 생성자 Teacher ID
 * @param assignments - 배정 목록
 * @returns 생성된 AssignmentProposal
 */
export async function createAssignmentProposal({
  name,
  teamId,
  proposedBy,
  assignments,
}: CreateAssignmentProposalInput) {
  // 요약 계산
  const summary = calculateSummary(assignments)

  return db.assignmentProposal.create({
    data: {
      name,
      teamId,
      proposedBy,
      assignments: assignments as unknown as Prisma.InputJsonValue,
      summary: summary as unknown as Prisma.InputJsonValue,
      status: "pending",
    },
    include: {
      team: true,
      proposer: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  })
}

/**
 * 자동 배정 제안 조회 (ID로)
 *
 * @param id - 제안 ID
 * @returns AssignmentProposal 또는 null
 */
export async function getAssignmentProposal(id: string) {
  return db.assignmentProposal.findUnique({
    where: { id },
    include: {
      team: true,
      proposer: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  })
}

/**
 * 자동 배정 제안 목록 조회
 *
 * @param options - 조회 옵션
 * @returns AssignmentProposal 배열 (createdAt 내림차순)
 */
export async function listAssignmentProposals(options: {
  teamId?: string
  status?: string
  limit?: number
} = {}) {
  const where: Prisma.AssignmentProposalWhereInput = {
    ...(options.teamId && { teamId: options.teamId }),
    ...(options.status && { status: options.status }),
  }

  return db.assignmentProposal.findMany({
    where,
    include: {
      team: true,
      proposer: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    ...(options.limit && { take: options.limit }),
  })
}

/**
 * 자동 배정 제안 적용
 *
 * 제안 상태를 "approved"로 변경하고 실제 학생-선생님 배정을 적용합니다.
 *
 * @param proposalId - 제안 ID
 * @returns 적용된 학생 수
 */
export async function applyAssignmentProposal(proposalId: string) {
  // 제안 조회
  const proposal = await db.assignmentProposal.findUnique({
    where: { id: proposalId },
  })

  if (!proposal) {
    throw new Error("제안을 찾을 수 없습니다.")
  }

  if (proposal.status !== "pending") {
    throw new Error("이미 처리된 제안입니다.")
  }

  // assignments 배열 파싱
  const assignments = proposal.assignments as unknown as Assignment[]

  // 일괄 업데이트로 성능 최적화
  const updatePromises = assignments.map(({ studentId, teacherId }) =>
    db.student.update({
      where: { id: studentId },
      data: { teacherId },
    })
  )

  await Promise.all(updatePromises)

  // 상태 업데이트
  await db.assignmentProposal.update({
    where: { id: proposalId },
    data: { status: "approved" },
  })

  return {
    success: true,
    count: assignments.length,
  }
}

/**
 * 자동 배정 제안 거절
 *
 * @param proposalId - 제안 ID
 * @returns 업데이트된 AssignmentProposal
 */
export async function rejectAssignmentProposal(proposalId: string) {
  return db.assignmentProposal.update({
    where: { id: proposalId },
    data: { status: "rejected" },
  })
}

/**
 * 배정 요약 계산
 *
 * @param assignments - 배정 목록
 * @returns 요약 정보
 */
function calculateSummary(assignments: Assignment[]): AssignmentSummary {
  if (assignments.length === 0) {
    return {
      totalStudents: 0,
      assignedStudents: 0,
      averageScore: 0,
      minScore: 0,
      maxScore: 0,
      teacherLoads: {},
    }
  }

  const scores = assignments.map((a) => a.score.overall)
  const averageScore =
    scores.reduce((sum, score) => sum + score, 0) / scores.length
  const minScore = Math.min(...scores)
  const maxScore = Math.max(...scores)

  // 선생님별 배정 수
  const teacherLoads: Record<string, number> = {}
  for (const assignment of assignments) {
    teacherLoads[assignment.teacherId] =
      (teacherLoads[assignment.teacherId] || 0) + 1
  }

  return {
    totalStudents: assignments.length,
    assignedStudents: assignments.length,
    averageScore,
    minScore,
    maxScore,
    teacherLoads,
  }
}
