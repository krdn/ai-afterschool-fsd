'use server'

import { verifySession } from '@/lib/dal'
import { ok, fail, type ActionResult } from '@/lib/errors/action-result'
import { getCounselingSessions } from '@/lib/db/common/performance'

export type StudentCounselingSessionItem = {
  id: string
  sessionDate: Date
  type: string
  summary: string
  aiSummary: string | null
  duration: number
  followUpRequired: boolean
  followUpDate: Date | null
  satisfactionScore: number | null
  teacher: { id: string; name: string }
}

export async function getStudentSessionsAction(
  studentId: string
): Promise<ActionResult<StudentCounselingSessionItem[]>> {
  const session = await verifySession()
  if (!session?.userId) return fail('인증이 필요합니다.')

  try {
    const sessions = await getCounselingSessions(studentId)

    return ok(
      sessions.map((s) => ({
        id: s.id,
        sessionDate: s.sessionDate,
        type: s.type,
        summary: s.summary,
        aiSummary: s.aiSummary,
        duration: s.duration,
        followUpRequired: s.followUpRequired,
        followUpDate: s.followUpDate,
        satisfactionScore: s.satisfactionScore,
        teacher: s.teacher,
      }))
    )
  } catch (error) {
    console.error('학생 상담 목록 조회 실패:', error)
    return fail('상담 기록을 불러오는데 실패했습니다.')
  }
}
