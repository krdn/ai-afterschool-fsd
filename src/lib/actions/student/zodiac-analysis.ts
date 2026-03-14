"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db/client"
import { verifySession } from "@/lib/dal"
import { getZodiacSign } from "@/features/analysis"
import { getZodiacAnalysis as getZodiacAnalysisDb, upsertZodiacAnalysis } from '@/features/analysis'
import { eventBus } from "@/lib/events/event-bus"
import { generateWithProvider, generateWithSpecificProvider } from '@/features/ai-engine'
import { getZodiacPrompt, type ZodiacPromptId } from "@/features/ai-engine/prompts"
import type { ProviderName } from '@/features/ai-engine'
import { ok } from "@/lib/errors/action-result"

/**
 * 역할에 따른 teacherId 반환 (TEACHER만 본인 학생으로 제한)
 */
function ownerTeacherId(session: { userId: string; role: string }): string | null {
  return session.role === "TEACHER" ? session.userId : null
}

/**
 * 학생 접근 권한 확인
 */
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

/**
 * 별자리 분석 실행 (내장 데이터 기반)
 */
export async function runZodiacAnalysis(studentId: string) {
  const session = await verifySession()
  await ensureStudentAccess(studentId, session)

  // 학생 생년월일 조회
  const student = await db.student.findUnique({
    where: { id: studentId },
    select: { birthDate: true, name: true },
  })

  if (!student) throw new Error("학생을 찾을 수 없습니다.")

  // 별자리 결정
  const zodiac = getZodiacSign(student.birthDate)

  // 내장 데이터 기반 해석 텍스트
  const interpretation = `## ${zodiac.symbol} ${zodiac.name}

**원소:** ${zodiac.elementName} (${zodiac.element})
**지배 행성:** ${zodiac.rulingPlanet}
**날짜 범위:** ${zodiac.dateRange}

### 주요 성격 특성
${zodiac.traits.map((t) => `- ${t}`).join("\n")}

### 강점
${zodiac.strengths.map((s) => `- ${s}`).join("\n")}

### 약점
${zodiac.weaknesses.map((w) => `- ${w}`).join("\n")}

### 학습 스타일
${zodiac.learningStyle}
`

  // DB 저장
  await upsertZodiacAnalysis(studentId, {
    zodiacSign: zodiac.key,
    zodiacName: zodiac.name,
    element: zodiac.element,
    traits: {
      traits: zodiac.traits,
      strengths: zodiac.strengths,
      weaknesses: zodiac.weaknesses,
      learningStyle: zodiac.learningStyle,
      symbol: zodiac.symbol,
      rulingPlanet: zodiac.rulingPlanet,
      dateRange: zodiac.dateRange,
      elementName: zodiac.elementName,
    },
    interpretation,
  })

  // 이벤트 발행
  eventBus.emitEvent({
    type: 'analysis:complete',
    analysisType: 'zodiac',
    subjectType: 'STUDENT',
    subjectId: studentId,
    subjectName: student.name,
    timestamp: new Date().toISOString(),
  })
  eventBus.emit('analysis.completed', { studentId, analysisType: 'zodiac', subjectType: 'STUDENT', subjectId: studentId, subjectName: student.name, timestamp: new Date().toISOString() })

  revalidatePath(`/students/${studentId}`)

  return ok({
    zodiacSign: zodiac.key,
    zodiacName: zodiac.name,
    element: zodiac.element,
    interpretation,
  })
}

/**
 * 별자리 결과를 LLM으로 재해석
 */
export async function generateZodiacLLMInterpretation(
  studentId: string,
  provider?: string,
  promptId?: string
) {
  const session = await verifySession()
  await ensureStudentAccess(studentId, session)

  // 기존 별자리 결과 조회
  const analysis = await getZodiacAnalysisDb(studentId)
  if (!analysis) {
    throw new Error("별자리 분석 결과가 없습니다. 먼저 분석을 실행해주세요.")
  }

  const student = await db.student.findUnique({
    where: { id: studentId },
    select: { name: true },
  })

  const traits = analysis.traits as { traits?: string[] }

  // 프롬프트 빌드
  let prompt: string
  const zodiacPromptDef = promptId ? getZodiacPrompt(promptId as ZodiacPromptId) : null
  if (zodiacPromptDef) {
    prompt = zodiacPromptDef.buildPrompt(
      analysis.zodiacName,
      analysis.element,
      traits.traits ?? [],
      student?.name
    )
  } else {
    const defaultPrompt = getZodiacPrompt("default")!
    prompt = defaultPrompt.buildPrompt(
      analysis.zodiacName,
      analysis.element,
      traits.traits ?? [],
      student?.name
    )
  }

  const llmResult = (!provider || provider === "auto")
    ? await generateWithProvider({
        featureType: "zodiac_analysis",
        prompt,
        teacherId: session.userId,
        maxOutputTokens: 2048,
      })
    : await generateWithSpecificProvider(provider as ProviderName, {
        featureType: "zodiac_analysis",
        prompt,
        teacherId: session.userId,
        maxOutputTokens: 2048,
      })

  // DB 업데이트
  await db.zodiacAnalysis.update({
    where: { studentId },
    data: { interpretation: llmResult.text },
  })

  revalidatePath(`/students/${studentId}`)

  return ok({ interpretation: llmResult.text })
}
