'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/dal'
import { getRBACPrisma } from '@/lib/db/common/rbac'
import { ok, fail, type ActionResult } from '@/lib/errors/action-result'
import { db } from '@/lib/db/client'

const inputSchema = z.object({
  scheduledAt: z.string().min(1),
  studentId: z.string().min(1),
  parentId: z.string().min(1),
  topic: z.string().min(2).max(200),
  analysisReport: z.string().optional(),
  scenario: z.string().optional(),
  parentSummary: z.string().optional(),
})

export async function createReservationWithScenarioAction(
  input: z.infer<typeof inputSchema>
): Promise<ActionResult<{ reservationId: string }>> {
  const session = await verifySession()
  if (!session?.userId) return fail('인증이 필요합니다.')

  const parsed = inputSchema.safeParse(input)
  if (!parsed.success) return fail('입력값이 올바르지 않습니다.')

  const { scheduledAt, studentId, parentId, topic, analysisReport, scenario, parentSummary } = parsed.data

  // RBAC: 학생 접근 확인
  const rbacDb = getRBACPrisma(session)
  const student = await rbacDb.student.findFirst({
    where: { id: studentId },
    select: { id: true },
  })
  if (!student) return fail('해당 학생에 대한 권한이 없습니다.')

  // 학부모 소속 확인
  const parent = await db.parent.findFirst({
    where: { id: parentId, studentId },
    select: { id: true },
  })
  if (!parent) return fail('해당 학부모를 찾을 수 없습니다.')

  try {
    // aiSummary 합본
    const hasAiDocs = analysisReport || scenario || parentSummary
    let aiSummary: string | null = null
    if (hasAiDocs) {
      const parts: string[] = []
      if (analysisReport) parts.push(`## 학생 분석 보고서\n\n${analysisReport}`)
      if (scenario) parts.push(`## 상담 시나리오\n\n${scenario}`)
      if (parentSummary) parts.push(`## 학부모 공유용\n\n${parentSummary}`)
      aiSummary = parts.join('\n\n---\n\n')
    }

    const scheduledDate = new Date(scheduledAt)

    // 트랜잭션: 예약 + CounselingSession 일괄 생성
    const result = await db.$transaction(async (tx) => {
      // 시간 충돌 확인 (30분 슬롯)
      const slotStart = new Date(scheduledDate)
      const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000)

      const conflict = await tx.parentCounselingReservation.findFirst({
        where: {
          teacherId: session.userId,
          status: 'SCHEDULED',
          scheduledAt: { gte: slotStart, lt: slotEnd },
        },
      })
      if (conflict) throw new Error('해당 시간에 이미 예약이 있습니다.')

      // CounselingSession 사전 생성 (AI 문서가 있는 경우)
      let counselingSessionId: string | null = null
      if (aiSummary) {
        const counselingSession = await tx.counselingSession.create({
          data: {
            studentId,
            teacherId: session.userId,
            sessionDate: scheduledDate,
            duration: 30,
            type: 'ACADEMIC',
            summary: '',
            aiSummary,
          },
        })
        counselingSessionId = counselingSession.id
      }

      // 예약 생성
      const reservation = await tx.parentCounselingReservation.create({
        data: {
          scheduledAt: scheduledDate,
          studentId,
          teacherId: session.userId,
          parentId,
          topic,
          status: 'SCHEDULED',
          ...(counselingSessionId ? { counselingSessionId } : {}),
        },
      })

      return { reservationId: reservation.id }
    })

    revalidatePath('/counseling')
    revalidatePath(`/students/${studentId}`)
    return ok(result)
  } catch (error) {
    if (error instanceof Error && error.message.includes('이미 예약')) {
      return fail(error.message)
    }
    console.error('예약 생성 실패:', error)
    return fail('예약 생성에 실패했습니다.')
  }
}
