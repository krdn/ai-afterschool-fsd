/**
 * AI 자동 배정 알고리즘 (Greedy with Load Balancing)
 *
 * 선생님-학생 궁합 최대화와 부하 분산 최적화를 목표로
 * 탐욕(Greedy) 알고리즘을 사용하여 O(students x teachers) 복잡도로
 * 최적의 배정을 찾습니다.
 */

import { db } from "@/lib/db/client"
import { logger } from "@/lib/logger"
import { verifySession } from "@/lib/dal"
import { calculateCompatibilityScore } from "@/features/analysis"
import type { CompatibilityScore } from "@/features/analysis"
import type { MbtiPercentages } from "@/features/analysis"
import type { SajuResult } from "@/features/analysis"
import type { NameNumerologyResult } from "@/features/analysis"

/**
 * 단일 배정 결과
 */
export type Assignment = {
  studentId: string
  teacherId: string
  score: CompatibilityScore
}

/**
 * 자동 배정 옵션
 */
export type AutoAssignmentOptions = {
  maxStudentsPerTeacher?: number // 최대 담당 학생 수 (기본: 평균 + 20%)
  minCompatibilityThreshold?: number // 최소 궁합 점수 (기본: 없음)
  teamId?: string // 특정 팀에만 배정
}

/**
 * AI 자동 배정 알고리즘 (Greedy approach with load balancing)
 */
export async function generateAutoAssignment(
  studentIds: string[],
  options: AutoAssignmentOptions = {}
): Promise<Assignment[]> {
  // 인증 및 RBAC 확인
  const session = await verifySession()

  // 선생님 목록 조회 (TEACHER, MANAGER, TEAM_LEADER만)
  const teachers = await db.teacher.findMany({
    where: {
      ...(options.teamId && { teamId: options.teamId }),
      role: {
        in: ["TEACHER", "MANAGER", "TEAM_LEADER"],
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      _count: {
        select: { students: true },
      },
    },
  })

  if (teachers.length === 0) {
    throw new Error("배정 가능한 선생님이 없습니다.")
  }

  // 선생님 분석 데이터 일괄 조회 (통합 테이블)
  const teacherIds = teachers.map(t => t.id)
  const [teacherMbtis, teacherSajus, teacherNames] = await Promise.all([
    db.mbtiAnalysis.findMany({
      where: { subjectType: 'TEACHER', subjectId: { in: teacherIds } },
      select: { subjectId: true, percentages: true },
    }),
    db.sajuAnalysis.findMany({
      where: { subjectType: 'TEACHER', subjectId: { in: teacherIds } },
      select: { subjectId: true, result: true },
    }),
    db.nameAnalysis.findMany({
      where: { subjectType: 'TEACHER', subjectId: { in: teacherIds } },
      select: { subjectId: true, result: true },
    }),
  ])

  const teacherMbtiMap = new Map(teacherMbtis.map(m => [m.subjectId, m]))
  const teacherSajuMap = new Map(teacherSajus.map(s => [s.subjectId, s]))
  const teacherNameMap = new Map(teacherNames.map(n => [n.subjectId, n]))

  // 학생 목록 조회
  const students = await db.student.findMany({
    where: {
      id: { in: studentIds },
    },
    select: {
      id: true,
      name: true,
    },
  })

  if (students.length === 0) {
    return []
  }

  // 학생 분석 데이터 일괄 조회 (통합 테이블)
  const studentIdsArr = students.map(s => s.id)
  const [studentMbtis, studentSajus, studentNames] = await Promise.all([
    db.mbtiAnalysis.findMany({
      where: { subjectType: 'STUDENT', subjectId: { in: studentIdsArr } },
      select: { subjectId: true, percentages: true },
    }),
    db.sajuAnalysis.findMany({
      where: { subjectType: 'STUDENT', subjectId: { in: studentIdsArr } },
      select: { subjectId: true, result: true },
    }),
    db.nameAnalysis.findMany({
      where: { subjectType: 'STUDENT', subjectId: { in: studentIdsArr } },
      select: { subjectId: true, result: true },
    }),
  ])

  const studentMbtiMap = new Map(studentMbtis.map(m => [m.subjectId, m]))
  const studentSajuMap = new Map(studentSajus.map(s => [s.subjectId, s]))
  const studentNameMap = new Map(studentNames.map(n => [n.subjectId, n]))

  // 평균 담당 학생 수 계산
  const totalStudents = students.length
  const totalTeachers = teachers.length
  const averageLoad = totalStudents / totalTeachers
  const maxLoad =
    options.maxStudentsPerTeacher ?? Math.ceil(averageLoad * 1.2)

  // 선생님별 현재 부하 초기화
  const teacherLoads = new Map<string, number>()
  for (const teacher of teachers) {
    teacherLoads.set(teacher.id, teacher._count.students)
  }

  // 배정 결과
  const assignments: Assignment[] = []

  // 학생별로 최적 선생님 찾기 (Greedy)
  for (const student of students) {
    let bestTeacherId: string | null = null
    let bestScore: CompatibilityScore | null = null

    // 모든 선생님에 대해 궁합 점수 계산
    for (const teacher of teachers) {
      const currentLoad = teacherLoads.get(teacher.id)!

      // 부하 제약 조건 확인
      if (currentLoad >= maxLoad) {
        continue // 이미 최대 인원인 선생님은 건너뜀
      }

      // 궁합 점수 계산
      const score = calculateCompatibilityScore(
        {
          mbti:
            (teacherMbtiMap.get(teacher.id)?.percentages as MbtiPercentages | null) ??
            null,
          saju: (teacherSajuMap.get(teacher.id)?.result as SajuResult | null) ?? null,
          name:
            (teacherNameMap.get(teacher.id)?.result as NameNumerologyResult | null) ??
            null,
          currentLoad,
        },
        {
          mbti: (studentMbtiMap.get(student.id)?.percentages as MbtiPercentages | null) ?? null,
          saju: (studentSajuMap.get(student.id)?.result as SajuResult | null) ?? null,
          name: (studentNameMap.get(student.id)?.result as NameNumerologyResult | null) ?? null,
        },
        averageLoad
      )

      // 최소 궁합 점수 확인
      if (
        options.minCompatibilityThreshold &&
        score.overall < options.minCompatibilityThreshold
      ) {
        continue
      }

      // 최고 궁합 선택 (Greedy)
      if (!bestScore || score.overall > bestScore.overall) {
        bestTeacherId = teacher.id
        bestScore = score
      }
    }

    // 배정
    if (bestTeacherId) {
      assignments.push({
        studentId: student.id,
        teacherId: bestTeacherId,
        score: bestScore!,
      })

      // 부하 업데이트
      teacherLoads.set(bestTeacherId, teacherLoads.get(bestTeacherId)! + 1)
    } else {
      logger.warn({ studentId: student.id }, 'Cannot assign student: no suitable teacher found')
    }
  }

  return assignments
}

/**
 * 부하 분산 통계 계산
 */
export function calculateLoadStats(teacherLoads: Map<string, number>) {
  const loads = Array.from(teacherLoads.values())

  if (loads.length === 0) {
    return {
      mean: 0,
      variance: 0,
      stdDev: 0,
      min: 0,
      max: 0,
      range: 0,
    }
  }

  const mean = loads.reduce((sum, load) => sum + load, 0) / loads.length
  const variance =
    loads.reduce((sum, load) => sum + Math.pow(load - mean, 2), 0) / loads.length
  const stdDev = Math.sqrt(variance)
  const min = Math.min(...loads)
  const max = Math.max(...loads)

  return {
    mean,
    variance,
    stdDev,
    min,
    max,
    range: max - min,
  }
}

/**
 * 배정 결과 요약 생성
 */
export function summarizeAssignments(assignments: Assignment[]) {
  if (assignments.length === 0) {
    return {
      totalStudents: 0,
      assignedStudents: 0,
      averageScore: 0,
      minScore: 0,
      maxScore: 0,
      teacherCounts: {} as Record<string, number>,
    }
  }

  const scores = assignments.map((a) => a.score.overall)
  const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length

  // 선생님별 배정 수
  const teacherCounts: Record<string, number> = {}
  for (const assignment of assignments) {
    teacherCounts[assignment.teacherId] =
      (teacherCounts[assignment.teacherId] || 0) + 1
  }

  return {
    totalStudents: assignments.length,
    assignedStudents: assignments.length,
    averageScore,
    minScore: Math.min(...scores),
    maxScore: Math.max(...scores),
    teacherCounts,
  }
}
