"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db/client"
import { verifySession } from "@/lib/dal"
import { calculateVarkProgress as calculateProgress, scoreVark } from "@/features/analysis"
import {
  deleteVarkDraft,
  getVarkAnalysis as getVarkAnalysisDb,
  getVarkDraft as getVarkDraftDb,
  upsertVarkAnalysis,
  upsertVarkDraft,
} from '@/features/analysis'
import { generateWithProvider, generateWithSpecificProvider } from '@/features/ai-engine'
import { getVarkPrompt, type VarkPromptId } from "@/features/ai-engine/prompts"
import type { ProviderName } from '@/features/ai-engine'
import { eventBus } from "@/lib/events/event-bus"
import { ok, type ActionResult } from "@/lib/errors/action-result"
import questions from "@/data/vark/questions.json"
import descriptions from "@/data/vark/descriptions.json"

function ownerTeacherId(session: { userId: string; role: string }): string | null {
  return session.role === "TEACHER" ? session.userId : null
}

async function ensureStudentAccess(studentId: string, session: { userId: string; role: string }) {
  const where: { id: string; teacherId?: string } = { id: studentId }
  const tid = ownerTeacherId(session)
  if (tid) where.teacherId = tid

  const student = await db.student.findFirst({
    where,
    select: { id: true },
  })

  if (!student) throw new Error("학생을 찾을 수 없어요.")
}

/**
 * VARK 설문 임시 저장 조회
 */
export async function getVarkDraft(studentId: string) {
  const session = await verifySession()
  await ensureStudentAccess(studentId, session)
  return getVarkDraftDb(studentId)
}

/**
 * VARK 설문 임시 저장
 */
export async function saveVarkDraft(
  studentId: string,
  responses: Record<string, number>
) {
  const session = await verifySession()
  await ensureStudentAccess(studentId, session)

  const progress = calculateProgress(responses, 28)
  await upsertVarkDraft(studentId, responses, progress.answeredCount)

  return ok({ progress: progress.answeredCount })
}

/**
 * VARK 설문 최종 제출
 */
export async function submitVarkSurvey(
  studentId: string,
  responses: Record<string, number>
) {
  const session = await verifySession()
  await ensureStudentAccess(studentId, session)

  // 28문항 모두 응답 검증
  const progress = calculateProgress(responses, 28)
  if (progress.answeredCount < 28) {
    throw new Error("모든 문항에 응답해주세요.")
  }

  // VARK 점수 계산
  const result = scoreVark(responses, questions)

  // 유형 설명 조합
  const primaryTypes = result.varkType.split("") as Array<keyof typeof descriptions>
  const typeDescriptions = primaryTypes
    .map(code => descriptions[code])
    .filter(Boolean)

  // 해석 텍스트 생성
  const interpretation = typeDescriptions.map(desc => `## ${desc.name}

${desc.summary}

### 강점
${desc.strengths.map((s: string) => `- ${s}`).join("\n")}

### 주의할 점
${desc.weaknesses.map((w: string) => `- ${w}`).join("\n")}

### 학습 팁
${desc.studyTips.map((t: string) => `- ${t}`).join("\n")}

### 학습 스타일
${desc.learningStyle}

### 관련 직업
${desc.careers.join(", ")}
`).join("\n---\n\n")

  // 저장
  await upsertVarkAnalysis(studentId, {
    responses,
    scores: result.scores,
    varkType: result.varkType,
    percentages: result.percentages,
    interpretation,
  })

  // Draft 삭제
  try {
    await deleteVarkDraft(studentId)
  } catch {
    // Draft가 없으면 무시
  }

  // 이벤트 발행
  const student = await db.student.findUnique({
    where: { id: studentId },
    select: { name: true },
  })
  if (student) {
    eventBus.emitEvent({
      type: 'analysis:complete',
      analysisType: 'vark',
      subjectType: 'STUDENT',
      subjectId: studentId,
      subjectName: student.name,
      timestamp: new Date().toISOString(),
    })
  }

  revalidatePath(`/students/${studentId}`)

  return ok({
    varkType: result.varkType,
    percentages: result.percentages,
    interpretation,
  })
}

/**
 * VARK 분석 결과 조회
 */
export async function getVarkAnalysis(studentId: string) {
  const session = await verifySession()
  await ensureStudentAccess(studentId, session)
  return getVarkAnalysisDb(studentId)
}

/**
 * VARK LLM 해석
 */
export async function generateVarkLLMInterpretation(
  studentId: string,
  provider?: string,
  promptId?: string
) {
  const session = await verifySession()
  await ensureStudentAccess(studentId, session)

  const analysis = await getVarkAnalysisDb(studentId)
  if (!analysis) {
    throw new Error("VARK 분석 결과가 없습니다. 먼저 설문을 완료해주세요.")
  }

  const student = await db.student.findUnique({
    where: { id: studentId },
    select: { name: true },
  })

  const percentages = analysis.percentages as Record<string, number>

  let prompt: string
  const varkPromptDef = promptId ? getVarkPrompt(promptId as VarkPromptId) : null
  if (varkPromptDef) {
    prompt = varkPromptDef.buildPrompt(analysis.varkType, percentages, student?.name)
  } else {
    const defaultPrompt = getVarkPrompt("default")!
    prompt = defaultPrompt.buildPrompt(analysis.varkType, percentages, student?.name)
  }

  const llmResult = (!provider || provider === "auto")
    ? await generateWithProvider({
        featureType: "vark_analysis",
        prompt,
        teacherId: session.userId,
        maxOutputTokens: 2048,
      })
    : await generateWithSpecificProvider(provider as ProviderName, {
        featureType: "vark_analysis",
        prompt,
        teacherId: session.userId,
        maxOutputTokens: 2048,
      })

  await db.varkAnalysis.update({
    where: { studentId },
    data: { interpretation: llmResult.text },
  })

  revalidatePath(`/students/${studentId}`)

  return ok({ interpretation: llmResult.text })
}
