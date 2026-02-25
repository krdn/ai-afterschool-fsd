'use server'

import { z } from 'zod'
import { verifySession } from '@/lib/dal'
import { ok, fail, type ActionResult } from '@/lib/errors/action-result'
import { db } from '@/lib/db/client'
import { getUnifiedPersonalityData } from '@/features/analysis'
import { getGradeHistory } from '@/lib/db/common/performance'
import type { UnifiedPersonalityData } from '@/features/ai-engine/prompts/counseling'

export interface StudentInsightData {
  studentName: string
  school: string
  grade: number
  personalitySummary: string | null
  personalityData: UnifiedPersonalityData | null
  counselingHistory: Array<{
    id: string
    summary: string
    sessionDate: Date
    type: string
    duration: number
    teacherName: string
  }>
  gradeHistory: Array<{
    subject: string
    score: number
    testDate: Date
    gradeType: string
  }>
}

const inputSchema = z.string().min(1, '학생 ID가 필요합니다')

export async function getStudentInsightAction(
  studentId: string
): Promise<ActionResult<StudentInsightData>> {
  const session = await verifySession()
  if (!session?.userId) return fail('인증이 필요합니다.')

  const parsed = inputSchema.safeParse(studentId)
  if (!parsed.success) return fail('잘못된 학생 ID입니다.')

  try {
    const [student, personalityData, grades, sessions] = await Promise.all([
      db.student.findFirst({
        where: { id: studentId, teacherId: session.userId },
        select: {
          name: true,
          school: true,
          grade: true,
          personalitySummary: { select: { coreTraits: true } },
        },
      }),
      getUnifiedPersonalityData(studentId, session.userId),
      getGradeHistory(studentId),
      db.counselingSession.findMany({
        where: { studentId, teacherId: session.userId },
        orderBy: { sessionDate: 'desc' },
        take: 5,
        select: {
          id: true,
          summary: true,
          sessionDate: true,
          type: true,
          duration: true,
          teacher: { select: { name: true } },
        },
      }),
    ])

    if (!student) return fail('학생을 찾을 수 없습니다.')

    return ok({
      studentName: student.name,
      school: student.school,
      grade: student.grade,
      personalitySummary: student.personalitySummary?.coreTraits ?? null,
      personalityData,
      counselingHistory: sessions.map(s => ({
        id: s.id,
        summary: s.summary,
        sessionDate: s.sessionDate,
        type: s.type,
        duration: s.duration,
        teacherName: s.teacher.name,
      })),
      gradeHistory: grades.map(g => ({
        subject: g.subject,
        score: g.score,
        testDate: g.testDate,
        gradeType: g.gradeType,
      })),
    })
  } catch (error) {
    console.error('학생 인사이트 조회 실패:', error)
    return fail('학생 정보를 불러오는데 실패했습니다.')
  }
}
