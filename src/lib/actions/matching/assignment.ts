"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db/client"
import { verifySession } from "@/lib/dal"
import { calculateCompatibilityScore, type CompatibilityScore } from "@/features/analysis"
import { calculateFairnessMetrics } from "@/features/matching"
import {
  generateAutoAssignment,
  type Assignment,
  type AutoAssignmentOptions,
} from "@/lib/optimization/auto-assignment"
import { fetchSubjectAnalyses, fetchBatchAnalyses, upsertCompatibilityResult } from '@/features/matching'
import { ok, okVoid, fail, type ActionResult, type ActionVoidResult } from "@/lib/errors/action-result"
import { logger } from "@/lib/logger"
/** 선생님 추천 항목 */
export interface TeacherRecommendation {
  teacherId: string
  teacherName: string
  teacherRole: string
  currentStudentCount?: number
  score: CompatibilityScore
  breakdown: CompatibilityScore["breakdown"]
  reasons: string[]
}

/** 선생님 추천 목록 결과 데이터 */
export interface TeacherRecommendationsData {
  studentId: string
  studentName: string
  recommendations: TeacherRecommendation[]
}

/** 자동 배정 제안 결과 데이터 */
export interface AutoAssignmentSuggestionData {
  assignments: Assignment[]
  fairnessMetrics: Awaited<ReturnType<typeof calculateFairnessMetrics>>
  summary: {
    totalStudents: number
    assignedStudents: number
    averageScore: number
    minScore: number
    maxScore: number
  }
}

/**
 * 학생 배정 해제 (미배정 상태로 변경)
 *
 * RBAC: DIRECTOR, TEAM_LEADER만 해제 가능
 *
 * @param studentId - 학생 ID
 * @returns 해제 결과
 */
export async function unassignStudent(
  studentId: string
): Promise<ActionVoidResult> {
  const session = await verifySession()

  if (session.role !== "DIRECTOR" && session.role !== "TEAM_LEADER") {
    return fail("배정 해제 권한이 없습니다.")
  }

  const student = await db.student.findUnique({ where: { id: studentId } })
  if (!student) return fail("학생을 찾을 수 없습니다.")

  const previousTeacherId = student.teacherId

  try {
    await db.student.update({
      where: { id: studentId },
      data: { teacherId: null },
    })
  } catch (error) {
    logger.error({ err: error }, 'Failed to unassign student')
    return fail("배정 해제 중 오류가 발생했습니다.")
  }

  revalidatePath("/matching")
  revalidatePath(`/students/${studentId}`)
  if (previousTeacherId) revalidatePath(`/teachers/${previousTeacherId}`)

  return okVoid()
}

/**
 * 학생을 선생님에게 수동 배정
 *
 * RBAC: DIRECTOR, TEAM_LEADER만 배정 가능
 *
 * @param studentId - 학생 ID
 * @param teacherId - 선생님 ID
 * @returns 배정 결과
 */
export async function assignStudentToTeacher(
  studentId: string,
  teacherId: string,
  compatibilityScore?: CompatibilityScore
): Promise<ActionVoidResult> {
  const session = await verifySession()

  // RBAC: DIRECTOR, TEAM_LEADER만 배정 가능
  if (session.role !== "DIRECTOR" && session.role !== "TEAM_LEADER") {
    return fail("배정 권한이 없습니다.")
  }

  // Student 조회 (본인 팀 데이터만)
  const student = await db.student.findUnique({
    where: { id: studentId },
  })

  if (!student) {
    return fail("학생을 찾을 수 없습니다.")
  }

  // Teacher 조회 (본인 팀 데이터만)
  const teacher = await db.teacher.findUnique({
    where: { id: teacherId },
  })

  if (!teacher) {
    return fail("선생님을 찾을 수 없습니다.")
  }

  // Student.teacherId 업데이트
  try {
    await db.student.update({
      where: { id: studentId },
      data: { teacherId },
    })
  } catch (error) {
    logger.error({ err: error }, 'Failed to assign student to teacher')
    return fail("학생 배정 중 오류가 발생했습니다.")
  }

  // 궁합 점수가 전달되면 CompatibilityResult에 저장
  if (compatibilityScore) {
    try {
      await upsertCompatibilityResult(teacherId, studentId, compatibilityScore)
    } catch (error) {
      // 궁합 저장 실패는 배정 자체를 롤백하지 않음
      logger.warn({ err: error }, 'Failed to save compatibility result')
    }
  }

  // 캐시 무효화
  revalidatePath("/matching")
  revalidatePath(`/students/${studentId}`)
  revalidatePath(`/teachers/${teacherId}`)

  return okVoid()
}

/**
 * 학생을 다른 선생님으로 재배정
 *
 * RBAC: DIRECTOR, TEAM_LEADER만 재배정 가능
 *
 * @param studentId - 학생 ID
 * @param newTeacherId - 새 선생님 ID
 * @returns 재배정 결과
 */
export async function reassignStudent(
  studentId: string,
  newTeacherId: string
): Promise<ActionResult<{ previousTeacherId: string | null; newTeacherId: string }>> {
  const session = await verifySession()

  // RBAC: DIRECTOR, TEAM_LEADER만 재배정 가능
  if (session.role !== "DIRECTOR" && session.role !== "TEAM_LEADER") {
    return fail("재배정 권한이 없습니다.")
  }

  // Student 조회
  const student = await db.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      teacherId: true,
    },
  })

  if (!student) {
    return fail("학생을 찾을 수 없습니다.")
  }

  const previousTeacherId = student.teacherId

  // 새로운 Teacher가 있는지 확인
  const newTeacher = await db.teacher.findUnique({
    where: { id: newTeacherId },
  })

  if (!newTeacher) {
    return fail("새 선생님을 찾을 수 없습니다.")
  }

  // Student.teacherId 업데이트
  try {
    await db.student.update({
      where: { id: studentId },
      data: { teacherId: newTeacherId },
    })
  } catch (error) {
    logger.error({ err: error }, 'Failed to reassign student')
    return fail("학생 재배정 중 오류가 발생했습니다.")
  }

  // 캐시 무효화
  revalidatePath("/matching")
  revalidatePath(`/students/${studentId}`)
  revalidatePath(`/teachers/${newTeacherId}`)
  if (previousTeacherId && previousTeacherId !== newTeacherId) {
    revalidatePath(`/teachers/${previousTeacherId}`)
  }

  return ok({ previousTeacherId, newTeacherId })
}

/**
 * 다수 학생 일괄 배정
 *
 * RBAC: DIRECTOR, TEAM_LEADER만 배정 가능
 *
 * @param studentIds - 학생 ID 배열
 * @param teacherId - 배정할 선생님 ID
 * @returns 배정 결과 (성공 여부, 배정된 학생 수)
 */
export async function assignStudentBatch(
  studentIds: string[],
  teacherId: string
): Promise<ActionResult<{ count: number }>> {
  const session = await verifySession()

  // RBAC: DIRECTOR, TEAM_LEADER만 배정 가능
  if (session.role !== "DIRECTOR" && session.role !== "TEAM_LEADER") {
    return fail("배정 권한이 없습니다.")
  }

  if (studentIds.length === 0) {
    return fail("배정할 학생을 선택해주세요.")
  }

  // Teacher 조회 (본인 팀 데이터만)
  const teacher = await db.teacher.findUnique({
    where: { id: teacherId },
  })

  if (!teacher) {
    return fail("선생님을 찾을 수 없습니다.")
  }

  // Promise.all로 일괄 업데이트
  try {
    await Promise.all(
      studentIds.map((studentId) =>
        db.student.update({
          where: { id: studentId },
          data: { teacherId },
        })
      )
    )
  } catch (error) {
    logger.error({ err: error }, 'Failed to assign students batch')
    return fail("학생 일괄 배정 중 오류가 발생했습니다.")
  }

  // 캐시 무효화
  revalidatePath("/matching")
  revalidatePath("/students")
  revalidatePath(`/teachers/${teacherId}`)

  return ok({ count: studentIds.length })
}

/** 학생의 배정된 선생님 궁합 결과 */
export interface AssignedCompatibilityData {
  teacherId: string
  teacherName: string
  teacherRole: string
  overallScore: number
  breakdown: CompatibilityScore["breakdown"]
  reasons: string[]
  calculatedAt: string
}

/**
 * 학생의 현재 배정된 선생님과의 궁합 결과 조회
 *
 * CompatibilityResult 테이블에서 저장된 데이터를 반환합니다.
 * 저장된 데이터가 없으면 실시간으로 계산합니다.
 *
 * @param studentId - 학생 ID
 * @returns 배정된 선생님과의 궁합 데이터
 */
export async function getAssignedTeacherCompatibility(
  studentId: string
): Promise<ActionResult<AssignedCompatibilityData | null>> {
  await verifySession()

  // 학생 조회 (배정된 선생님 포함)
  const student = await db.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      name: true,
      teacherId: true,
      teacher: {
        select: {
          id: true,
          name: true,
          role: true,
          _count: { select: { students: true } },
        },
      },
    },
  })

  if (!student) return fail("학생을 찾을 수 없어요.")
  if (!student.teacherId || !student.teacher) return ok(null)

  // 저장된 궁합 결과 조회
  const { getCompatibilityResult } = await import("@/features/matching")
  const saved = await getCompatibilityResult(student.teacherId, studentId)

  if (saved) {
    const breakdown = saved.breakdown as CompatibilityScore["breakdown"]
    const reasons = (saved.reasons ?? []) as string[]
    return ok({
      teacherId: student.teacher.id,
      teacherName: student.teacher.name,
      teacherRole: student.teacher.role,
      overallScore: saved.overallScore,
      breakdown,
      reasons,
      calculatedAt: saved.calculatedAt.toISOString(),
    })
  }

  // 저장된 데이터 없으면 실시간 계산
  const studentAnalyses = await fetchSubjectAnalyses(studentId, "STUDENT")
  const teacherAnalyses = await fetchSubjectAnalyses(student.teacherId, "TEACHER")

  const totalStudentCount = await db.student.count()
  const totalTeacherCount = await db.teacher.count({
    where: { role: { in: ["TEACHER", "MANAGER", "TEAM_LEADER"] } },
  })
  const averageLoad = totalTeacherCount > 0 ? totalStudentCount / totalTeacherCount : 15

  const score = calculateCompatibilityScore(
    {
      mbti: teacherAnalyses.mbti,
      saju: teacherAnalyses.saju,
      name: teacherAnalyses.name,
      currentLoad: student.teacher._count.students,
    },
    {
      mbti: studentAnalyses.mbti,
      saju: studentAnalyses.saju,
      name: studentAnalyses.name,
    },
    averageLoad
  )

  // 계산 결과를 DB에 저장 (다음 조회 시 빠르게)
  try {
    await upsertCompatibilityResult(student.teacherId, studentId, score)
  } catch (error) {
    logger.warn({ err: error }, 'Failed to cache compatibility result')
  }

  return ok({
    teacherId: student.teacher.id,
    teacherName: student.teacher.name,
    teacherRole: student.teacher.role,
    overallScore: score.overall,
    breakdown: score.breakdown,
    reasons: score.reasons,
    calculatedAt: new Date().toISOString(),
  })
}

/**
 * 학생별 선생님 추천 목록 조회
 *
 * 학생별로 팀 내 모든 선생님의 궁합 점수를 계산하고 순위별로 반환합니다.
 * RBAC: 본인 팀 데이터만 접근 가능 (verifySession의 RLS 필터링 활용)
 *
 * @param studentId - 학생 ID
 * @returns 추천 선생님 목록 (score.overall 내림차순 정렬)
 */
export async function getTeacherRecommendations(
  studentId: string
): Promise<ActionResult<TeacherRecommendationsData>> {
  await verifySession() // RLS 적용을 위해 세션 확인

  // Student 조회
  const student = await db.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      name: true,
    },
  })

  if (!student) {
    return fail("학생을 찾을 수 없어요.")
  }

  // 공유 함수로 학생 분석 데이터 조회
  const studentAnalyses = await fetchSubjectAnalyses(studentId, "STUDENT")

  // 팀 내 Teacher 목록 조회 (role이 TEACHER, MANAGER, TEAM_LEADER인 경우)
  const teachers = await db.teacher.findMany({
    where: {
      role: {
        in: ["TEACHER", "MANAGER", "TEAM_LEADER"],
      },
    },
    select: {
      id: true,
      name: true,
      role: true,
      _count: {
        select: {
          students: true,
        },
      },
    },
  })

  if (teachers.length === 0) {
    return ok({
      studentId: student.id,
      studentName: student.name,
      recommendations: [],
    })
  }

  // 공유 함수로 선생님 배치 분석 데이터 조회
  const teacherIds = teachers.map((t) => t.id)
  const teacherAnalysesMap = await fetchBatchAnalyses(teacherIds, "TEACHER")

  // 전체 Student/Teacher 수로 averageLoad 계산
  const totalStudentCount = await db.student.count()
  const totalTeacherCount = teachers.length
  const averageLoad = totalTeacherCount > 0 ? totalStudentCount / totalTeacherCount : 15

  // 각 Teacher에 대해 궁합 점수 계산
  const recommendations = teachers.map((teacher) => {
    const tAnalyses = teacherAnalysesMap.get(teacher.id) ?? { mbti: null, saju: null, name: null }

    const score = calculateCompatibilityScore(
      {
        mbti: tAnalyses.mbti,
        saju: tAnalyses.saju,
        name: tAnalyses.name,
        currentLoad: teacher._count.students,
      },
      {
        mbti: studentAnalyses.mbti,
        saju: studentAnalyses.saju,
        name: studentAnalyses.name,
      },
      averageLoad
    )

    return {
      teacherId: teacher.id,
      teacherName: teacher.name,
      teacherRole: teacher.role,
      currentStudentCount: teacher._count.students,
      score,
      breakdown: score.breakdown,
      reasons: score.reasons,
    }
  })

  // score.overall 내림차순 정렬
  recommendations.sort((a, b) => b.score.overall - a.score.overall)

  return ok({
    studentId: student.id,
    studentName: student.name,
    recommendations,
  })
}

/**
 * AI 자동 배정 제안 생성
 *
 * RBAC: DIRECTOR, TEAM_LEADER만 사용 가능
 *
 * @param studentIds - 배정할 학생 ID 목록
 * @param options - 자동 배정 옵션
 * @returns 배정 제안 (assignments, fairnessMetrics, summary)
 */
export async function generateAutoAssignmentSuggestions(
  studentIds: string[],
  options: AutoAssignmentOptions = {}
): Promise<ActionResult<AutoAssignmentSuggestionData>> {
  const session = await verifySession()

  // RBAC: DIRECTOR, TEAM_LEADER만 사용 가능
  if (session.role !== "DIRECTOR" && session.role !== "TEAM_LEADER") {
    return fail("자동 배정 제안 생성 권한이 없습니다.")
  }

  // 자동 배정 생성
  const assignments = await generateAutoAssignment(studentIds, options)

  // fairness metrics 계산 (score.overall을 number로 변환)
  const fairnessAssignments = assignments.map((a) => ({
    studentId: a.studentId,
    teacherId: a.teacherId,
    score: a.score.overall,
  }))
  const fairnessMetrics = await calculateFairnessMetrics(fairnessAssignments)

  // summary 계산
  const summary = {
    totalStudents: studentIds.length,
    assignedStudents: assignments.length,
    averageScore:
      assignments.length > 0
        ? assignments.reduce((sum, a) => sum + a.score.overall, 0) /
          assignments.length
        : 0,
    minScore:
      assignments.length > 0
        ? Math.min(...assignments.map((a) => a.score.overall))
        : 0,
    maxScore:
      assignments.length > 0
        ? Math.max(...assignments.map((a) => a.score.overall))
        : 0,
  }

  return ok({
    assignments,
    fairnessMetrics,
    summary,
  })
}

/**
 * 자동 배정 제안 적용
 *
 * RBAC: DIRECTOR, TEAM_LEADER만 적용 가능
 *
 * @param assignments - 배정 목록
 * @returns 적용 결과 (success, count)
 */
export async function applyAutoAssignment(
  assignments: Assignment[]
): Promise<ActionResult<{ count: number }>> {
  const session = await verifySession()

  // RBAC: DIRECTOR, TEAM_LEADER만 적용 가능
  if (session.role !== "DIRECTOR" && session.role !== "TEAM_LEADER") {
    return fail("자동 배정 적용 권한이 없습니다.")
  }

  if (assignments.length === 0) {
    return fail("적용할 배정이 없습니다.")
  }

  // Promise.all로 일괄 업데이트
  try {
    await Promise.all(
      assignments.map(({ studentId, teacherId }) =>
        db.student.update({
          where: { id: studentId },
          data: { teacherId },
        })
      )
    )
  } catch (error) {
    logger.error({ err: error }, 'Failed to apply auto assignments')
    return fail("자동 배정 적용 중 오류가 발생했습니다.")
  }

  // 캐시 무효화
  revalidatePath("/matching")
  revalidatePath("/students")

  return ok({ count: assignments.length })
}
