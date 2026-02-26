'use server'

import { verifySession } from '@/lib/dal'
import { db } from '@/lib/db/client'
import { ok, fail, type ActionResult } from '@/lib/errors/action-result'
import { generateWithProvider } from '@/features/ai-engine/universal-router'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// buildChecklistPrompt — 체크리스트 생성 프롬프트
// ---------------------------------------------------------------------------

function buildChecklistPrompt(topic: string, aiSummary: string | null): string {
  const summaryBlock = aiSummary
    ? `\n\n[AI 분석 자료]\n${aiSummary}`
    : ''

  return `당신은 학교 상담 전문가입니다.
아래 상담 주제와 참고 자료를 바탕으로, 상담 중 확인해야 할 체크리스트 항목을 5~8개 생성해주세요.

[상담 주제]
${topic}${summaryBlock}

규칙:
- 한 줄에 하나의 항목만 작성
- 번호, 기호, 마크다운 없이 순수 텍스트만 작성
- 각 항목은 간결한 질문 또는 확인사항 형태
- 상담 흐름 순서대로 작성`
}

// ---------------------------------------------------------------------------
// generateChecklistAction — AI 체크리스트 생성 + CounselingNote 일괄 생성
// ---------------------------------------------------------------------------

export type GenerateChecklistResult = {
  noteIds: string[]
  count: number
}

/**
 * AI를 사용하여 상담 체크리스트를 생성하고, CounselingNote 레코드로 일괄 저장한다.
 *
 * 1. verifySession → 세션 소유권 확인
 * 2. buildChecklistPrompt(topic, aiSummary) → 프롬프트 생성
 * 3. generateWithProvider → AI 호출
 * 4. 결과를 줄바꿈 분리 → 번호/기호 제거 → CounselingNote 일괄 생성 (source: 'AI')
 */
export async function generateChecklistAction(
  sessionId: string,
  topic: string,
  aiSummary: string | null
): Promise<ActionResult<GenerateChecklistResult>> {
  const session = await verifySession()
  if (!session) return fail('인증되지 않은 요청입니다.')

  try {
    // 세션 소유권 확인
    const counselingSession = await db.counselingSession.findUnique({
      where: { id: sessionId },
      select: { teacherId: true },
    })

    if (!counselingSession) return fail('상담 세션을 찾을 수 없습니다.')
    if (counselingSession.teacherId !== session.userId) {
      return fail('해당 세션에 대한 권한이 없습니다.')
    }

    // 프롬프트 생성 + AI 호출
    const prompt = buildChecklistPrompt(topic, aiSummary)

    const result = await generateWithProvider({
      prompt,
      featureType: 'counseling_scenario',
      teacherId: session.userId,
      maxOutputTokens: 300,
      temperature: 0.3,
    })

    if (!result.text) return fail('AI 응답이 비어있습니다. 다시 시도해주세요.')

    // 결과 파싱: 줄바꿈 분리 → 번호/기호 제거 → 빈 줄 제거
    const items = result.text
      .split('\n')
      .map((line) => line.replace(/^[\s]*[\d]+[.):\-]\s*/, '').trim()) // 번호/기호 제거
      .map((line) => line.replace(/^[-*•]\s*/, '').trim()) // 불릿 기호 제거
      .filter((line) => line.length > 0)

    if (items.length === 0) return fail('체크리스트 항목을 생성하지 못했습니다.')

    // 기존 최대 order 조회
    const maxOrder = await db.counselingNote.aggregate({
      where: { counselingSessionId: sessionId },
      _max: { order: true },
    })

    const startOrder = (maxOrder._max.order ?? -1) + 1

    // CounselingNote 일괄 생성
    const notes = await db.$transaction(
      items.map((content, index) =>
        db.counselingNote.create({
          data: {
            counselingSessionId: sessionId,
            content,
            order: startOrder + index,
            source: 'AI',
          },
        })
      )
    )

    return ok({
      noteIds: notes.map((n) => n.id),
      count: notes.length,
    })
  } catch (error) {
    logger.error({ err: error }, 'Failed to generate AI checklist')
    return fail('AI 체크리스트 생성에 실패했습니다. 다시 시도해주세요.')
  }
}
