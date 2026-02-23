"use server"

import { revalidatePath } from "next/cache"
import { Prisma } from '@/lib/db'
import { db } from "@/lib/db/client"
import { verifySession } from "@/lib/dal"
import {
  calculateSaju,
  generateSajuInterpretation,
} from "@/features/analysis"
import {
  calculateNameNumerology,
  generateNameInterpretation,
} from "@/features/analysis"
import {
  coerceHanjaSelections,
  selectionsToHanjaName,
} from "@/features/analysis"
import {
  clearStudentRecalculationNeeded,
  createSajuHistory,
  getStudentCalculationStatus,
  markStudentRecalculationNeeded,
  upsertNameAnalysis,
  upsertSajuAnalysis,
} from '@/features/analysis'
import { generateWithProvider, generateWithSpecificProvider } from '@/features/ai-engine'
import { getSajuPromptDefinition as getPromptDefinition, buildSajuPromptFromTemplate as buildPromptFromTemplate, type AnalysisPromptId, type SajuStudentInfo as StudentInfo } from "@/features/ai-engine/prompts"
import { getSajuPresetByKey } from '@/features/analysis'
import type { ProviderName } from '@/features/ai-engine'
import { eventBus } from "@/lib/events/event-bus"
import { logger } from "@/lib/logger"

type AnalysisInput = Prisma.JsonValue
type AnalysisResult = Prisma.JsonValue

function humanizeLLMError(raw: string): string {
  if (raw.includes('quota') || raw.includes('rate') || raw.includes('RESOURCE_EXHAUSTED'))
    return 'API 사용량 한도를 초과했습니다. 요금제를 확인하세요.'
  if (raw.includes('401') || raw.includes('Unauthorized') || raw.includes('API_KEY_INVALID'))
    return 'API 키가 유효하지 않습니다. 설정을 확인하세요.'
  if (raw.includes('ECONNREFUSED') || raw.includes('fetch failed'))
    return 'LLM 서버에 연결할 수 없습니다. 서버 상태를 확인하세요.'
  if (raw.includes('timeout') || raw.includes('abort'))
    return 'LLM 서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도하세요.'
  if (raw.includes('Method Not Allowed'))
    return 'LLM 서버 설정이 올바르지 않습니다. 관리자에게 문의하세요.'
  if (raw.includes('not configured') || raw.includes('not enabled'))
    return '해당 LLM 제공자가 설정되지 않았습니다. 관리자 설정을 확인하세요.'
  return 'LLM 호출 중 오류가 발생했습니다. 잠시 후 다시 시도하세요.'
}

function ownerTeacherId(session: { userId: string; role: string }): string | null {
  return session.role === 'TEACHER' ? session.userId : null
}

async function ensureStudentAccess(studentId: string, session: { userId: string; role: string }) {
  const where: { id: string; teacherId?: string } = { id: studentId }
  const tid = ownerTeacherId(session)
  if (tid) where.teacherId = tid

  const student = await db.student.findFirst({
    where,
    select: { id: true },
  })

  if (!student) {
    throw new Error("학생을 찾을 수 없어요.")
  }
}

export async function getCalculationStatus(studentId: string) {
  const session = await verifySession()
  return getStudentCalculationStatus(studentId, ownerTeacherId(session))
}

export async function saveSajuAnalysis(
  studentId: string,
  inputSnapshot: AnalysisInput,
  result: AnalysisResult,
  interpretation?: string | null,
  usedProvider?: string | null,
  usedModel?: string | null
) {
  const session = await verifySession()
  await ensureStudentAccess(studentId, session)

  await upsertSajuAnalysis(studentId, {
    inputSnapshot,
    result,
    interpretation,
    usedProvider,
    usedModel,
  })

  await clearStudentRecalculationNeeded(studentId, ownerTeacherId(session))
  revalidatePath(`/students/${studentId}`)
}

export async function saveNameAnalysis(
  studentId: string,
  inputSnapshot: AnalysisInput,
  result: AnalysisResult,
  interpretation?: string | null
) {
  const session = await verifySession()
  await ensureStudentAccess(studentId, session)

  await upsertNameAnalysis(studentId, {
    inputSnapshot,
    result,
    interpretation,
  })

  await clearStudentRecalculationNeeded(studentId, ownerTeacherId(session))
  revalidatePath(`/students/${studentId}`)
}

export async function markRecalculationNeeded(
  studentId: string,
  reason: string
) {
  const session = await verifySession()
  await markStudentRecalculationNeeded(studentId, ownerTeacherId(session), reason)
  revalidatePath(`/students/${studentId}`)
}

export async function runSajuAnalysis(studentId: string, provider?: string, promptId?: string, additionalRequest?: string, forceRefresh?: boolean) {
  const session = await verifySession()

  const where: { id: string; teacherId?: string } = { id: studentId }
  if (session.role === 'TEACHER') {
    where.teacherId = session.userId
  }

  const student = await db.student.findFirst({
    where,
    select: {
      id: true,
      name: true,
      birthDate: true,
      birthTimeHour: true,
      birthTimeMinute: true,
      grade: true,
      school: true,
      targetMajor: true,
      calculationRecalculationNeeded: true,
    },
  })

  if (!student) {
    throw new Error("학생을 찾을 수 없어요.")
  }

  const time =
    student.birthTimeHour === null
      ? null
      : {
          hour: student.birthTimeHour,
          minute: student.birthTimeMinute ?? 0,
        }
  const timeKnown = Boolean(time)
  const resolvedPromptId = promptId || 'default'

  const inputSnapshot = {
    birthDate: student.birthDate.toISOString(),
    timeKnown,
    time,
    longitude: 127.0,
    promptId: resolvedPromptId,
  }

  // 사주 계산은 항상 알고리즘 (동일 입력 = 동일 결과)
  const result = calculateSaju({
    birthDate: student.birthDate,
    time,
    longitude: 127.0,
  })

  // 캐시 확인: forceRefresh가 아니고, 재계산 필요 플래그가 없으며, LLM 제공자를 사용하는 경우
  const useLLM = provider && provider !== 'built-in'
  if (!forceRefresh && !student.calculationRecalculationNeeded && useLLM) {
    const cached = await db.sajuAnalysisHistory.findFirst({
      where: {
        studentId,
        promptId: resolvedPromptId,
        additionalRequest: additionalRequest || null,
        usedProvider: provider === 'auto' ? { not: '내장 알고리즘' } : provider,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        interpretation: true,
        usedProvider: true,
        usedModel: true,
      },
    })

    if (cached?.interpretation) {
      // 캐시된 결과로 SajuAnalysis도 갱신 (최신 계산 결과 반영)
      await saveSajuAnalysis(studentId, inputSnapshot, result, cached.interpretation, cached.usedProvider, cached.usedModel)

      return {
        result,
        interpretation: cached.interpretation,
        llmFailed: false,
        llmError: undefined,
        usedProvider: cached.usedProvider,
        usedModel: cached.usedModel ?? undefined,
        cached: true,
      }
    }
  }

  // 해석만 내장/LLM 분기
  let interpretation: string
  let llmFailed = false
  let llmError: string | undefined
  let usedProvider = '내장 알고리즘'
  let usedModel: string | undefined
  if (!useLLM) {
    interpretation = generateSajuInterpretation(result)
  } else {
    try {
      const birthDateStr = student.birthDate.toISOString().split('T')[0]
      const birthTimeStr = student.birthTimeHour !== null
        ? `${String(student.birthTimeHour).padStart(2, '0')}:${String(student.birthTimeMinute ?? 0).padStart(2, '0')}`
        : '미상'
      const studentInfoForPrompt: StudentInfo = {
        birthDate: birthDateStr,
        birthTime: birthTimeStr,
        grade: student.grade,
        school: student.school,
        targetMajor: student.targetMajor ?? undefined,
      }

      // DB 프리셋 우선, 없으면 코드 기본값 사용
      const dbPreset = await getSajuPresetByKey(resolvedPromptId)
      let prompt: string
      if (dbPreset?.isActive && dbPreset.promptTemplate) {
        prompt = buildPromptFromTemplate(dbPreset.promptTemplate, result, studentInfoForPrompt, additionalRequest)
      } else {
        const promptDef = getPromptDefinition(resolvedPromptId as AnalysisPromptId)
        prompt = promptDef.buildPrompt(result, studentInfoForPrompt, additionalRequest)
      }
      const maxTokens = resolvedPromptId === 'default' ? 2048 : 4096
      const llmResult = provider === 'auto'
        ? await generateWithProvider({
            featureType: 'saju_analysis',
            prompt,
            teacherId: session.userId,
            maxOutputTokens: maxTokens,
          })
        : await generateWithSpecificProvider(provider as ProviderName, {
            featureType: 'saju_analysis',
            prompt,
            teacherId: session.userId,
            maxOutputTokens: maxTokens,
          })
      interpretation = llmResult.text
      usedProvider = llmResult.provider
      usedModel = llmResult.model
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logger.error({ detail: errorMsg }, '[Saju Analysis] LLM failed, falling back to built-in')
      interpretation = generateSajuInterpretation(result)
      llmFailed = true
      llmError = humanizeLLMError(errorMsg)
    }
  }

  await saveSajuAnalysis(studentId, inputSnapshot, result, interpretation, usedProvider, usedModel)

  // 이력 테이블에 저장
  await createSajuHistory({
    studentId,
    promptId: resolvedPromptId,
    additionalRequest: additionalRequest || null,
    result: result as Prisma.InputJsonValue,
    interpretation,
    usedProvider,
    usedModel: usedModel ?? null,
  })

  // 이벤트 발행
  eventBus.emitEvent({
    type: 'analysis:complete',
    analysisType: 'saju',
    subjectType: 'STUDENT',
    subjectId: studentId,
    subjectName: student.name,
    timestamp: new Date().toISOString(),
  })

  return {
    result,
    interpretation,
    llmFailed,
    llmError,
    usedProvider,
    usedModel,
    cached: false,
  }
}

export async function runNameAnalysis(studentId: string) {
  const session = await verifySession()

  const nameWhere: { id: string; teacherId?: string } = { id: studentId }
  if (session.role === 'TEACHER') {
    nameWhere.teacherId = session.userId
  }

  const student = await db.student.findFirst({
    where: nameWhere,
    select: {
      id: true,
      name: true,
      nameHanja: true,
    },
  })

  if (!student) {
    throw new Error("학생을 찾을 수 없어요.")
  }

  const selections = coerceHanjaSelections(student.nameHanja)
  const hanjaName = selectionsToHanjaName(selections)
  const outcome = calculateNameNumerology({
    name: student.name,
    hanjaName,
  })

  if (outcome.status !== "ok") {
    throw new Error(outcome.message)
  }

  const inputSnapshot = {
    name: student.name,
    nameHanja: selections,
    hanjaName,
  }

  const interpretation = generateNameInterpretation(outcome.result)

  await saveNameAnalysis(studentId, inputSnapshot, outcome.result, interpretation)

  // 이벤트 발행
  eventBus.emitEvent({
    type: 'analysis:complete',
    analysisType: 'name',
    subjectType: 'STUDENT',
    subjectId: studentId,
    subjectName: student.name,
    timestamp: new Date().toISOString(),
  })

  return {
    result: outcome.result,
    interpretation,
  }
}

export async function simplifyInterpretation(
  interpretation: string,
  provider: string
): Promise<{ text: string; usedProvider: string; usedModel?: string }> {
  const session = await verifySession()

  const SIMPLIFY_PROMPT = `아래 사주 해석을 초등학생~중학생도 이해할 수 있도록 쉽게 풀어주세요.

규칙:
- 사주 전문 용어(예: 오행, 천간, 지지, 상관, 편인 등) 대신 일상 언어를 사용하세요
- 핵심 메시지 위주로 간결하게 정리하세요
- 학생에게 도움이 되는 조언은 구체적이고 실천 가능하게 표현하세요
- 마크다운 형식을 유지하되, 쉬운 표현으로 바꿔주세요
- "~해요", "~이에요" 체를 사용하세요

---
${interpretation}`

  let llmResult
  if (provider === 'auto') {
    llmResult = await generateWithProvider({
      featureType: 'saju_analysis',
      prompt: SIMPLIFY_PROMPT,
      teacherId: session.userId,
      maxOutputTokens: 2048,
    })
  } else {
    llmResult = await generateWithSpecificProvider(provider as ProviderName, {
      featureType: 'saju_analysis',
      prompt: SIMPLIFY_PROMPT,
      teacherId: session.userId,
      maxOutputTokens: 2048,
    })
  }

  return {
    text: llmResult.text,
    usedProvider: llmResult.provider,
    usedModel: llmResult.model,
  }
}
