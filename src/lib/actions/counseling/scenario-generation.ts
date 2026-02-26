'use server'

import { z } from 'zod'
import { verifySession } from '@/lib/dal'
import { ok, fail, type ActionResult } from '@/lib/errors/action-result'
import { generateWithProvider } from '@/features/ai-engine/universal-router'
import { getUnifiedPersonalityData } from '@/features/analysis'
import { db } from '@/lib/db/client'
import {
  buildAnalysisReportPrompt,
  buildScenarioPrompt,
  buildParentSummaryPrompt,
} from '@/features/ai-engine/prompts/counseling-scenario'

// --- 모델 override 공통 스키마 ---
const modelOverrideSchema = z.object({
  providerId: z.string(),
  modelId: z.string(),
}).optional()

// --- 1. 분석 보고서 생성 ---
const analysisInputSchema = z.object({
  studentId: z.string().min(1),
  topic: z.string().min(2).max(200),
  modelOverride: modelOverrideSchema,
})

export async function generateAnalysisReportAction(
  input: z.infer<typeof analysisInputSchema>
): Promise<ActionResult<string>> {
  const session = await verifySession()
  if (!session?.userId) return fail('인증이 필요합니다.')

  const parsed = analysisInputSchema.safeParse(input)
  if (!parsed.success) return fail('입력값이 올바르지 않습니다.')

  const { studentId, topic } = parsed.data

  try {
    const [student, personalityData, sessions, grades] = await Promise.all([
      db.student.findFirst({
        where: { id: studentId, teacherId: session.userId },
        select: { name: true, school: true, grade: true },
      }),
      getUnifiedPersonalityData(studentId, session.userId),
      db.counselingSession.findMany({
        where: { studentId, teacherId: session.userId },
        orderBy: { sessionDate: 'desc' },
        take: 5,
        select: { summary: true, sessionDate: true, type: true },
      }),
      db.gradeHistory.findMany({
        where: { studentId },
        orderBy: { testDate: 'desc' },
        take: 10,
        select: { subject: true, score: true, testDate: true },
      }),
    ])

    if (!student) return fail('학생을 찾을 수 없습니다.')

    const prompt = buildAnalysisReportPrompt({
      studentName: student.name,
      school: student.school,
      grade: student.grade,
      topic,
      personality: personalityData,
      previousSessions: sessions,
      gradeHistory: grades,
    })

    const result = await generateWithProvider({
      prompt,
      featureType: 'counseling_analysis',
      teacherId: session.userId,
      maxOutputTokens: 1000,
      temperature: 0.3,
      ...(parsed.data.modelOverride && {
        providerId: parsed.data.modelOverride.providerId,
        modelId: parsed.data.modelOverride.modelId,
      }),
    })

    if (!result.text) return fail('AI 응답이 비어있습니다. 다시 시도해주세요.')
    return ok(result.text)
  } catch (error) {
    console.error('분석 보고서 생성 실패:', error)
    return fail('분석 보고서 생성에 실패했습니다. 다시 시도해주세요.')
  }
}

// --- 2. 상담 시나리오 생성 ---
const scenarioInputSchema = z.object({
  studentId: z.string().min(1),
  topic: z.string().min(2),
  approvedReport: z.string().min(10),
  modelOverride: modelOverrideSchema,
})

export async function generateScenarioAction(
  input: z.infer<typeof scenarioInputSchema>
): Promise<ActionResult<string>> {
  const session = await verifySession()
  if (!session?.userId) return fail('인증이 필요합니다.')

  const parsed = scenarioInputSchema.safeParse(input)
  if (!parsed.success) return fail('입력값이 올바르지 않습니다.')

  const { studentId, topic, approvedReport } = parsed.data

  try {
    const student = await db.student.findFirst({
      where: { id: studentId, teacherId: session.userId },
      select: {
        name: true,
        personalitySummary: { select: { coreTraits: true } },
      },
    })

    if (!student) return fail('학생을 찾을 수 없습니다.')

    const prompt = buildScenarioPrompt({
      studentName: student.name,
      topic,
      approvedReport,
      personalitySummary: student.personalitySummary?.coreTraits ?? null,
    })

    const result = await generateWithProvider({
      prompt,
      featureType: 'counseling_scenario',
      teacherId: session.userId,
      maxOutputTokens: 1500,
      temperature: 0.5,
      ...(parsed.data.modelOverride && {
        providerId: parsed.data.modelOverride.providerId,
        modelId: parsed.data.modelOverride.modelId,
      }),
    })

    if (!result.text) return fail('AI 응답이 비어있습니다. 다시 시도해주세요.')
    return ok(result.text)
  } catch (error) {
    console.error('상담 시나리오 생성 실패:', error)
    return fail('상담 시나리오 생성에 실패했습니다. 다시 시도해주세요.')
  }
}

// --- 3. 학부모 공유용 생성 ---
const parentInputSchema = z.object({
  studentName: z.string().min(1),
  topic: z.string().min(2),
  scheduledAt: z.string().min(1),
  approvedScenario: z.string().min(10),
  modelOverride: modelOverrideSchema,
})

export async function generateParentSummaryAction(
  input: z.infer<typeof parentInputSchema>
): Promise<ActionResult<string>> {
  const session = await verifySession()
  if (!session?.userId) return fail('인증이 필요합니다.')

  const parsed = parentInputSchema.safeParse(input)
  if (!parsed.success) return fail('입력값이 올바르지 않습니다.')

  try {
    const prompt = buildParentSummaryPrompt(parsed.data)

    const result = await generateWithProvider({
      prompt,
      featureType: 'counseling_parent',
      teacherId: session.userId,
      maxOutputTokens: 500,
      temperature: 0.3,
      ...(parsed.data.modelOverride && {
        providerId: parsed.data.modelOverride.providerId,
        modelId: parsed.data.modelOverride.modelId,
      }),
    })

    if (!result.text) return fail('AI 응답이 비어있습니다. 다시 시도해주세요.')
    return ok(result.text)
  } catch (error) {
    console.error('학부모 공유용 생성 실패:', error)
    return fail('학부모 공유용 문서 생성에 실패했습니다. 다시 시도해주세요.')
  }
}
