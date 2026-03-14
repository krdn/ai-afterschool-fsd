"use server"

import { revalidatePath } from "next/cache"
import { Prisma } from '@/lib/db'
import { db } from "@/lib/db/client"
import { verifySession } from "@/lib/dal"
import { calculateNameNumerology, generateNameInterpretation } from "@/features/analysis"
import { getNameAnalysis as getNameAnalysisDb } from '@/features/analysis'
import { upsertNameAnalysis } from '@/features/analysis'
import { eventBus } from "@/lib/events/event-bus"
import { generateWithProvider, generateWithSpecificProvider } from '@/features/ai-engine'
import { getNamePrompt, type NamePromptId } from "@/features/ai-engine/prompts"
import type { ProviderName } from '@/features/ai-engine'
import { ok } from "@/lib/errors/action-result"

/**
 * 역할에 따른 teacherId 반환
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
 * 이름풀이 분석 실행 (내장 성명학 + 기본 해석)
 */
export async function runNameAnalysis(studentId: string) {
  const session = await verifySession()
  await ensureStudentAccess(studentId, session)

  const student = await db.student.findUnique({
    where: { id: studentId },
    select: { name: true, nameHanja: true, birthDate: true },
  })

  if (!student) throw new Error("학생을 찾을 수 없습니다.")

  // 한자 이름이 있으면 성명학 수리 계산 시도
  const hanjaName = student.nameHanja
    ? (student.nameHanja as { full?: string })?.full ?? null
    : null

  const numerologyOutcome = calculateNameNumerology({
    name: student.name,
    hanjaName,
  })

  let interpretation: string
  let result: Record<string, unknown>

  if (numerologyOutcome.status === "ok") {
    // 한자 기반 수리 결과 포함
    const numResult = numerologyOutcome.result
    interpretation = generateNameInterpretation(numResult)
    result = {
      hasHanja: true,
      numerology: numResult,
    }
  } else {
    // 한자 없음 — 한글 이름 기본 분석
    interpretation = `## ${student.name} 이름풀이

한자 정보가 등록되지 않아 성명학 수리 분석은 생략되었습니다.
AI 해석을 통해 이름의 음운과 의미를 분석해보세요.`
    result = {
      hasHanja: false,
      reason: numerologyOutcome.status,
    }
  }

  await upsertNameAnalysis(studentId, {
    inputSnapshot: {
      name: student.name,
      hanjaName,
      birthDate: student.birthDate.toISOString(),
    } as unknown as Prisma.JsonValue,
    result: result as unknown as Prisma.JsonValue,
    interpretation,
  })

  // 이벤트 발행
  eventBus.emitEvent({
    type: 'analysis:complete',
    analysisType: 'name',
    subjectType: 'STUDENT',
    subjectId: studentId,
    subjectName: student.name,
    timestamp: new Date().toISOString(),
  })
  eventBus.emit('analysis.completed', { studentId, analysisType: 'name', subjectType: 'STUDENT', subjectId: studentId, subjectName: student.name, timestamp: new Date().toISOString() })

  revalidatePath(`/students/${studentId}`)

  return ok({
    interpretation,
    hasHanja: numerologyOutcome.status === "ok",
  })
}

/**
 * 이름풀이 LLM 해석
 */
export async function generateNameLLMInterpretation(
  studentId: string,
  provider?: string,
  promptId?: string
) {
  const session = await verifySession()
  await ensureStudentAccess(studentId, session)

  const analysis = await getNameAnalysisDb('STUDENT', studentId)
  if (!analysis) {
    throw new Error("이름 분석 결과가 없습니다. 먼저 분석을 실행해주세요.")
  }

  const student = await db.student.findUnique({
    where: { id: studentId },
    select: { name: true, nameHanja: true, birthDate: true },
  })

  if (!student) throw new Error("학생을 찾을 수 없습니다.")

  const hanjaName = student.nameHanja
    ? (student.nameHanja as { full?: string })?.full ?? null
    : null

  const result = analysis.result as { hasHanja?: boolean; numerology?: unknown }
  const numerologyText = result.numerology ? analysis.interpretation ?? "" : ""

  // 프롬프트 빌드
  let prompt: string
  const namePromptDef = promptId ? getNamePrompt(promptId as NamePromptId) : null
  if (namePromptDef) {
    prompt = namePromptDef.buildPrompt(student.name, {
      birthDate: student.birthDate.toISOString().split("T")[0],
      hanjaName: hanjaName ?? undefined,
      numerologyResult: numerologyText || undefined,
    })
  } else {
    const defaultPrompt = getNamePrompt("default")!
    prompt = defaultPrompt.buildPrompt(student.name, {
      birthDate: student.birthDate.toISOString().split("T")[0],
      hanjaName: hanjaName ?? undefined,
      numerologyResult: numerologyText || undefined,
    })
  }

  const llmResult = (!provider || provider === "auto")
    ? await generateWithProvider({
        featureType: "name_analysis",
        prompt,
        teacherId: session.userId,
        maxOutputTokens: 2048,
      })
    : await generateWithSpecificProvider(provider as ProviderName, {
        featureType: "name_analysis",
        prompt,
        teacherId: session.userId,
        maxOutputTokens: 2048,
      })

  await db.nameAnalysis.update({
    where: { subjectType_subjectId: { subjectType: 'STUDENT', subjectId: studentId } },
    data: { interpretation: llmResult.text },
  })

  revalidatePath(`/students/${studentId}`)

  return ok({ interpretation: llmResult.text })
}
