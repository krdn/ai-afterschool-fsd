'use server'

import { z } from 'zod'
import { verifySession } from '@/lib/dal'
import { db } from '@/lib/db/client'
import { ok, fail, type ActionResult } from '@/lib/errors/action-result'
import { generateWithProvider } from '@/features/ai-engine/universal-router'
import { buildCounselingReportPrompt } from '@/features/ai-engine/prompts/counseling-scenario'
import { logger } from '@/lib/logger'

// --- 입력 스키마 ---
const reportInputSchema = z.object({
  sessionId: z.string().min(1),
  type: z.enum(['ACADEMIC', 'CAREER', 'PSYCHOLOGICAL', 'BEHAVIORAL']),
  duration: z.number().min(5),
  summary: z.string().min(10),
})

export async function generateCounselingReportAction(
  input: z.infer<typeof reportInputSchema>
): Promise<ActionResult<string>> {
  const session = await verifySession()
  if (!session?.userId) return fail('인증이 필요합니다.')

  const parsed = reportInputSchema.safeParse(input)
  if (!parsed.success) return fail('입력값이 올바르지 않습니다.')

  const { sessionId, type, duration, summary } = parsed.data

  try {
    // DB에서 상담 세션 조회 (본인 소유 확인)
    const counselingSession = await db.counselingSession.findUnique({
      where: { id: sessionId, teacherId: session.userId },
      include: {
        student: { select: { name: true } },
        notes: { orderBy: { order: 'asc' } },
        reservation: { select: { topic: true } },
      },
    })

    if (!counselingSession) return fail('상담 세션을 찾을 수 없습니다.')

    // 프롬프트 빌드
    const topic = counselingSession.reservation?.topic ?? '일반 상담'
    const buildResult = await buildCounselingReportPrompt({
      studentName: counselingSession.student.name,
      topic,
      counselingType: type,
      duration,
      teacherSummary: summary,
      checklist: counselingSession.notes.map((note) => ({
        content: note.content,
        checked: note.checked,
        memo: note.memo,
      })),
      aiReference: counselingSession.aiSummary,
    })

    // AI 생성
    const result = await generateWithProvider({
      prompt: buildResult.prompt,
      featureType: 'counseling_scenario',
      teacherId: session.userId,
      maxOutputTokens: buildResult.maxOutputTokens ?? 1500,
      temperature: buildResult.temperature ?? 0.3,
      ...(buildResult.systemPrompt && { systemPrompt: buildResult.systemPrompt }),
    })

    if (!result.text) return fail('AI 응답이 비어있습니다. 다시 시도해주세요.')
    return ok(result.text)
  } catch (error) {
    logger.error({ err: error }, 'Failed to generate counseling report')
    return fail('상담 보고서 생성에 실패했습니다. 다시 시도해주세요.')
  }
}
