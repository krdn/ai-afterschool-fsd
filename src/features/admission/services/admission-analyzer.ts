import { generateWithProvider } from '@/features/ai-engine/universal-router'
import { ADMISSION_ANALYSIS_SYSTEM_PROMPT, buildAnalysisPrompt } from '@/features/admission/prompts/analysis'
import { getProbabilityGrade, type AdmissionAnalysisInput, type AdmissionAnalysisResult } from '@/features/admission/types'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const analysisResultSchema = z.object({
  probability: z.number().min(0).max(100),
  currentVsCutoff: z.array(z.object({
    subject: z.string(),
    current: z.number(),
    cutoff: z.number(),
    gap: z.number(),
    status: z.enum(['ABOVE', 'AT', 'BELOW']),
  })),
  improvementPriority: z.array(z.object({
    subject: z.string(),
    targetImprovement: z.number(),
    strategy: z.string(),
  })),
  overallAdvice: z.string(),
  references: z.array(z.string()).default([]),
})

export async function analyzeAdmission(
  input: AdmissionAnalysisInput,
): Promise<AdmissionAnalysisResult> {
  const prompt = buildAnalysisPrompt(
    input.student.grades,
    input.target.cutoffs,
    input.student.trend,
    input.target.universityName,
    input.target.majorName,
  )

  try {
    const response = await generateWithProvider({
      featureType: 'admission_analysis',
      prompt,
      system: ADMISSION_ANALYSIS_SYSTEM_PROMPT,
    })

    const jsonMatch = response.text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, response.text]
    const jsonText = jsonMatch[1]?.trim() ?? response.text.trim()
    const parsed = analysisResultSchema.safeParse(JSON.parse(jsonText))

    if (!parsed.success) {
      logger.error({ err: parsed.error }, 'Failed to parse analysis result')
      throw new Error('분석 결과 파싱에 실패했습니다.')
    }

    return {
      ...parsed.data,
      grade: getProbabilityGrade(parsed.data.probability),
    }
  } catch (error) {
    logger.error({ err: error }, 'Admission analysis failed')
    throw error
  }
}
