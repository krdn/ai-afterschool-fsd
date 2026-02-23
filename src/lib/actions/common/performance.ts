"use server"

import { revalidatePath } from "next/cache"
import { verifySession } from "@/lib/dal"
import { getRBACPrisma } from "@/lib/db/common/rbac"
import {
  createGradeHistory,
  updateGradeHistory,
  deleteGradeHistory,
  createCounselingSession,
  updateCounselingSession,
  deleteCounselingSession,
  createStudentSatisfaction,
  updateStudentSatisfaction,
  deleteStudentSatisfaction,
} from "@/lib/db/common/performance"
import type { GradeType, CounselingType } from '@/lib/db'
import { okVoid, fail, type ActionVoidResult } from "@/lib/errors/action-result"

/**
 * 성적 기록 Server Action
 *
 * RBAC: DIRECTOR, TEAM_LEADER, MANAGER - 모든 학생 성적 기록 가능
 *       TEACHER - 자신이 담당하는 학생만 기록 가능
 */
export async function recordGradeAction(
  prevState: ActionVoidResult | undefined,
  formData: FormData
): Promise<ActionVoidResult> {
  const session = await verifySession()
  if (!session) {
    return fail("인증이 필요합니다.")
  }

  const studentId = formData.get("studentId") as string
  const subject = formData.get("subject") as string
  const gradeType = formData.get("gradeType") as GradeType
  const score = parseFloat(formData.get("score") as string)
  const maxScore = parseFloat(formData.get("maxScore") as string) || 100
  const testDateStr = formData.get("testDate") as string
  const academicYear = parseInt(formData.get("academicYear") as string)
  const semester = parseInt(formData.get("semester") as string)
  const notes = formData.get("notes") as string | null

  if (!studentId || !subject || !gradeType || isNaN(score) || !testDateStr || isNaN(academicYear) || isNaN(semester)) {
    return fail("필수 항목을 모두 입력해주세요.")
  }

  // RBAC: TEACHER는 자신의 학생만 접근 가능
  if (session.role === "TEACHER") {
    const rbacDb = getRBACPrisma(session)
    const student = await rbacDb.student.findFirst({
      where: { id: studentId },
      select: { id: true },
    })
    if (!student) {
      return fail("해당 학생에 대한 권한이 없습니다.")
    }
  }

  try {
    const normalizedScore = (score / maxScore) * 100
    const testDate = new Date(testDateStr)

    await createGradeHistory({
      studentId,
      teacherId: session.userId,
      subject,
      gradeType,
      score,
      maxScore,
      normalizedScore,
      testDate,
      academicYear,
      semester,
      notes: notes || undefined,
    })

    revalidatePath(`/students/${studentId}`)
    return okVoid()
  } catch (error) {
    console.error("성적 기록 실패:", error)
    return fail("성적 기록에 실패했습니다.")
  }
}

/**
 * 성적 수정 Server Action
 */
export async function updateGradeAction(
  gradeId: string,
  prevState: ActionVoidResult | undefined,
  formData: FormData
): Promise<ActionVoidResult> {
  const session = await verifySession()
  if (!session) {
    return fail("인증이 필요합니다.")
  }

  const score = parseFloat(formData.get("score") as string)
  const maxScore = parseFloat(formData.get("maxScore") as string) || 100
  const notes = formData.get("notes") as string | null

  if (isNaN(score)) {
    return fail("점수를 입력해주세요.")
  }

  try {
    const normalizedScore = (score / maxScore) * 100

    await updateGradeHistory(gradeId, {
      score,
      maxScore,
      normalizedScore,
      notes: notes || undefined,
    })

    return okVoid()
  } catch (error) {
    console.error("성적 수정 실패:", error)
    return fail("성적 수정에 실패했습니다.")
  }
}

/**
 * 성적 삭제 Server Action
 */
export async function deleteGradeAction(
  gradeId: string
): Promise<ActionVoidResult> {
  const session = await verifySession()
  if (!session) {
    return fail("인증이 필요합니다.")
  }

  try {
    await deleteGradeHistory(gradeId)
    return okVoid()
  } catch (error) {
    console.error("성적 삭제 실패:", error)
    return fail("성적 삭제에 실패했습니다.")
  }
}

/**
 * 상담 기록 Server Action
 *
 * RBAC: DIRECTOR, TEAM_LEADER, MANAGER - 모든 학생 상담 기록 가능
 *       TEACHER - 자신이 담당하는 학생만 기록 가능
 */
export async function recordCounselingAction(
  prevState: ActionVoidResult | undefined,
  formData: FormData
): Promise<ActionVoidResult> {
  const session = await verifySession()
  if (!session) {
    return fail("인증이 필요합니다.")
  }

  const studentId = formData.get("studentId") as string
  const sessionDateStr = formData.get("sessionDate") as string
  const duration = parseInt(formData.get("duration") as string)
  const type = formData.get("type") as CounselingType
  const summary = formData.get("summary") as string
  const followUpRequired = formData.get("followUpRequired") === "true"
  const followUpDateStr = formData.get("followUpDate") as string | null
  const satisfactionScore = formData.get("satisfactionScore")
    ? parseInt(formData.get("satisfactionScore") as string)
    : null
  const aiSummary = formData.get("aiSummary") as string | null

  if (!studentId || !sessionDateStr || isNaN(duration) || !type || !summary) {
    return fail("필수 항목을 모두 입력해주세요.")
  }

  // RBAC: TEACHER는 자신의 학생만 접근 가능
  if (session.role === "TEACHER") {
    const rbacDb = getRBACPrisma(session)
    const student = await rbacDb.student.findFirst({
      where: { id: studentId },
      select: { id: true },
    })
    if (!student) {
      return fail("해당 학생에 대한 권한이 없습니다.")
    }
  }

  try {
    const sessionDate = new Date(sessionDateStr)
    const followUpDate = followUpDateStr ? new Date(followUpDateStr) : null

    await createCounselingSession({
      studentId,
      teacherId: session.userId,
      sessionDate,
      duration,
      type,
      summary,
      followUpRequired,
      followUpDate,
      satisfactionScore,
      aiSummary,
    })

    revalidatePath(`/students/${studentId}`)
    return okVoid()
  } catch (error) {
    console.error("상담 기록 실패:", error)
    return fail("상담 기록에 실패했습니다.")
  }
}

/**
 * 상담 수정 Server Action
 */
export async function updateCounselingAction(
  counselingId: string,
  prevState: ActionVoidResult | undefined,
  formData: FormData
): Promise<ActionVoidResult> {
  const session = await verifySession()
  if (!session) {
    return fail("인증이 필요합니다.")
  }

  const summary = formData.get("summary") as string
  const duration = parseInt(formData.get("duration") as string)
  const followUpRequired = formData.get("followUpRequired") === "true"
  const followUpDateStr = formData.get("followUpDate") as string | null
  const satisfactionScore = formData.get("satisfactionScore")
    ? parseInt(formData.get("satisfactionScore") as string)
    : null

  if (!summary || isNaN(duration)) {
    return fail("필수 항목을 입력해주세요.")
  }

  try {
    const followUpDate = followUpDateStr ? new Date(followUpDateStr) : null

    await updateCounselingSession(counselingId, {
      summary,
      duration,
      followUpRequired,
      followUpDate,
      satisfactionScore,
    })

    return okVoid()
  } catch (error) {
    console.error("상담 수정 실패:", error)
    return fail("상담 수정에 실패했습니다.")
  }
}

/**
 * 상담 삭제 Server Action
 */
export async function deleteCounselingAction(
  counselingId: string
): Promise<ActionVoidResult> {
  const session = await verifySession()
  if (!session) {
    return fail("인증이 필요합니다.")
  }

  try {
    await deleteCounselingSession(counselingId)
    return okVoid()
  } catch (error) {
    console.error("상담 삭제 실패:", error)
    return fail("상담 삭제에 실패했습니다.")
  }
}

/**
 * 만족도 조사 기록 Server Action
 *
 * RBAC: DIRECTOR, TEAM_LEADER, MANAGER - 모든 학생 대상 조사 가능
 *       TEACHER - 자신이 담당하는 학생만 조사 가능
 */
export async function recordSatisfactionAction(
  prevState: ActionVoidResult | undefined,
  formData: FormData
): Promise<ActionVoidResult> {
  const session = await verifySession()
  if (!session) {
    return fail("인증이 필요합니다.")
  }

  const studentId = formData.get("studentId") as string
  const teacherId = formData.get("teacherId") as string
  const surveyDateStr = formData.get("surveyDate") as string
  const overallSatisfaction = parseInt(formData.get("overallSatisfaction") as string)
  const teachingQuality = parseInt(formData.get("teachingQuality") as string)
  const communication = parseInt(formData.get("communication") as string)
  const supportLevel = parseInt(formData.get("supportLevel") as string)
  const feedback = formData.get("feedback") as string | null

  if (!studentId || !teacherId || !surveyDateStr ||
      isNaN(overallSatisfaction) || isNaN(teachingQuality) ||
      isNaN(communication) || isNaN(supportLevel)) {
    return fail("필수 항목을 모두 입력해주세요.")
  }

  // 점수 범위 검증 (1-10)
  if ([overallSatisfaction, teachingQuality, communication, supportLevel].some(
    s => s < 1 || s > 10
  )) {
    return fail("만족도 점수는 1-10 사이여야 합니다.")
  }

  // RBAC: TEACHER는 자신의 학생만 접근 가능
  if (session.role === "TEACHER") {
    const rbacDb = getRBACPrisma(session)
    const student = await rbacDb.student.findFirst({
      where: { id: studentId },
      select: { id: true },
    })
    if (!student) {
      return fail("해당 학생에 대한 권한이 없습니다.")
    }
  }

  try {
    const surveyDate = new Date(surveyDateStr)

    await createStudentSatisfaction({
      studentId,
      teacherId,
      surveyDate,
      overallSatisfaction,
      teachingQuality,
      communication,
      supportLevel,
      feedback: feedback || undefined,
    })

    revalidatePath(`/students/${studentId}`)
    revalidatePath(`/teachers/${teacherId}`)
    return okVoid()
  } catch (error) {
    console.error("만족도 조사 기록 실패:", error)
    return fail("만족도 조사 기록에 실패했습니다.")
  }
}

/**
 * 만족도 수정 Server Action
 */
export async function updateSatisfactionAction(
  satisfactionId: string,
  prevState: ActionVoidResult | undefined,
  formData: FormData
): Promise<ActionVoidResult> {
  const session = await verifySession()
  if (!session) {
    return fail("인증이 필요합니다.")
  }

  const overallSatisfaction = parseInt(formData.get("overallSatisfaction") as string)
  const teachingQuality = parseInt(formData.get("teachingQuality") as string)
  const communication = parseInt(formData.get("communication") as string)
  const supportLevel = parseInt(formData.get("supportLevel") as string)
  const feedback = formData.get("feedback") as string | null

  if (isNaN(overallSatisfaction) || isNaN(teachingQuality) ||
      isNaN(communication) || isNaN(supportLevel)) {
    return fail("모든 점수를 입력해주세요.")
  }

  // 점수 범위 검증 (1-10)
  if ([overallSatisfaction, teachingQuality, communication, supportLevel].some(
    s => s < 1 || s > 10
  )) {
    return fail("만족도 점수는 1-10 사이여야 합니다.")
  }

  try {
    await updateStudentSatisfaction(satisfactionId, {
      overallSatisfaction,
      teachingQuality,
      communication,
      supportLevel,
      feedback: feedback || undefined,
    })

    return okVoid()
  } catch (error) {
    console.error("만족도 수정 실패:", error)
    return fail("만족도 수정에 실패했습니다.")
  }
}

/**
 * 만족도 삭제 Server Action
 */
export async function deleteSatisfactionAction(
  satisfactionId: string
): Promise<ActionVoidResult> {
  const session = await verifySession()
  if (!session) {
    return fail("인증이 필요합니다.")
  }

  try {
    await deleteStudentSatisfaction(satisfactionId)
    return okVoid()
  } catch (error) {
    console.error("만족도 삭제 실패:", error)
    return fail("만족도 삭제에 실패했습니다.")
  }
}
