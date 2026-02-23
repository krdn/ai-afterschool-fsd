/**
 * AI 자동 배정 알고리즘 (Greedy with Load Balancing)
 *
 * 선생님-학생 궁합 최대화와 부하 분산 최적화를 목표로
 * 탐욕(Greedy) 알고리즘을 사용합니다. O(students x teachers) 복잡도.
 *
 * DB 의존성 없음 - 외부에서 데이터를 주입받아 순수 알고리즘만 실행합니다.
 */

import type {
  CompatibilityScore,
  DetailedAssignment,
  AutoAssignmentOptions,
  AssignmentSummary,
  LoadStats,
  TeacherAnalysisData,
  StudentAnalysisData,
} from "./types"

export interface TeacherCandidate {
  id: string
  currentLoad: number
  analysisData: TeacherAnalysisData
}

export interface StudentCandidate {
  id: string
  analysisData: StudentAnalysisData
}

/**
 * 궁합 점수 계산 함수 타입 (DI - 외부에서 주입)
 */
export type CompatibilityScoreFn = (
  teacher: TeacherAnalysisData,
  student: StudentAnalysisData,
  averageLoad: number
) => CompatibilityScore

/**
 * AI 자동 배정 알고리즘 (Greedy approach with load balancing)
 *
 * @param students - 배정할 학생 목록
 * @param teachers - 배정 가능한 선생님 목록
 * @param scoreFn - 궁합 점수 계산 함수 (DI)
 * @param options - 배정 옵션
 */
export function generateAutoAssignment(
  students: StudentCandidate[],
  teachers: TeacherCandidate[],
  scoreFn: CompatibilityScoreFn,
  options: AutoAssignmentOptions = {}
): DetailedAssignment[] {
  if (teachers.length === 0 || students.length === 0) return []

  const totalStudents = students.length
  const totalTeachers = teachers.length
  const averageLoad = totalStudents / totalTeachers
  const maxLoad = options.maxStudentsPerTeacher ?? Math.ceil(averageLoad * 1.2)

  // 선생님별 현재 부하
  const teacherLoads = new Map<string, number>()
  for (const teacher of teachers) {
    teacherLoads.set(teacher.id, teacher.currentLoad)
  }

  const assignments: DetailedAssignment[] = []

  // 학생별로 최적 선생님 찾기 (Greedy)
  for (const student of students) {
    let bestTeacherId: string | null = null
    let bestScore: CompatibilityScore | null = null

    for (const teacher of teachers) {
      const currentLoad = teacherLoads.get(teacher.id)!

      // 부하 제약 조건 확인
      if (currentLoad >= maxLoad) continue

      // 궁합 점수 계산
      const score = scoreFn(
        { ...teacher.analysisData, currentLoad },
        student.analysisData,
        averageLoad
      )

      // 최소 궁합 점수 확인
      if (
        options.minCompatibilityThreshold &&
        score.overall < options.minCompatibilityThreshold
      ) {
        continue
      }

      // 최고 궁합 선택
      if (!bestScore || score.overall > bestScore.overall) {
        bestTeacherId = teacher.id
        bestScore = score
      }
    }

    if (bestTeacherId && bestScore) {
      assignments.push({
        studentId: student.id,
        teacherId: bestTeacherId,
        score: bestScore,
      })
      teacherLoads.set(bestTeacherId, teacherLoads.get(bestTeacherId)! + 1)
    }
  }

  return assignments
}

/**
 * 부하 분산 통계 계산
 */
export function calculateLoadStats(teacherLoads: Map<string, number>): LoadStats {
  const loads = Array.from(teacherLoads.values())

  if (loads.length === 0) {
    return { mean: 0, variance: 0, stdDev: 0, min: 0, max: 0, range: 0 }
  }

  const mean = loads.reduce((sum, load) => sum + load, 0) / loads.length
  const variance =
    loads.reduce((sum, load) => sum + Math.pow(load - mean, 2), 0) / loads.length
  const stdDev = Math.sqrt(variance)
  const min = Math.min(...loads)
  const max = Math.max(...loads)

  return { mean, variance, stdDev, min, max, range: max - min }
}

/**
 * 배정 결과 요약 생성
 */
export function summarizeAssignments(assignments: DetailedAssignment[]): AssignmentSummary {
  if (assignments.length === 0) {
    return {
      totalStudents: 0,
      assignedStudents: 0,
      averageScore: 0,
      minScore: 0,
      maxScore: 0,
      teacherCounts: {},
    }
  }

  const scores = assignments.map((a) => a.score.overall)
  const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length

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
