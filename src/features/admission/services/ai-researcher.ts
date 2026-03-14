import { generateWithSpecificProvider } from '@/features/ai-engine/universal-router'
import { aiResearchResultSchema } from '@/lib/validations/admission'
import { createSync, updateSyncStatus } from '@/features/admission/repositories/data-sync'
import { ADMISSION_RESEARCH_SYSTEM_PROMPT, buildResearchPrompt } from '@/features/admission/prompts/research'
import { logger } from '@/lib/logger'
import type { AIResearchResult } from '@/features/admission/types'

export async function researchUniversity(
  teacherId: string,
  universityName: string,
  majorName?: string,
  academicYear?: number,
): Promise<{ syncId: string; result: AIResearchResult | null; error?: string }> {
  const query = `${universityName}${majorName ? ` ${majorName}` : ''} ${academicYear ?? ''}`

  const sync = await createSync({
    syncType: 'AI_RESEARCH',
    targetQuery: query.trim(),
    teacherId,
    status: 'PENDING',
  })

  try {
    const response = await generateWithSpecificProvider('perplexity', {
      featureType: 'admission_research',
      prompt: buildResearchPrompt(universityName, majorName, academicYear),
      system: ADMISSION_RESEARCH_SYSTEM_PROMPT,
    })

    const text = response.text
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, text]
    const jsonText = jsonMatch[1]?.trim() ?? text.trim()

    const parsed = aiResearchResultSchema.safeParse(JSON.parse(jsonText))
    if (!parsed.success) {
      await updateSyncStatus(sync.id, 'REVIEW', {
        resultData: { raw: text, parseError: parsed.error.message },
        errorLog: `파싱 실패: ${parsed.error.message}`,
      })
      return { syncId: sync.id, result: null, error: `데이터 파싱 실패: ${parsed.error.message}` }
    }

    await updateSyncStatus(sync.id, 'REVIEW', {
      resultData: parsed.data as unknown as Record<string, unknown>,
      recordsFound: parsed.data.majors.length,
      source: parsed.data.sources.join(', '),
    })

    return { syncId: sync.id, result: parsed.data }
  } catch (error) {
    logger.error({ err: error }, 'AI research failed')
    const errorMsg = error instanceof Error ? error.message : '알 수 없는 오류'
    await updateSyncStatus(sync.id, 'FAILED', { errorLog: errorMsg })
    return { syncId: sync.id, result: null, error: errorMsg }
  }
}
