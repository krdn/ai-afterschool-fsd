"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db/client"
import { verifySession } from "@/lib/dal"
import { calculateMbtiProgress as calculateProgress, scoreMbti } from "@/features/analysis"
import {
  deleteMbtiDraft,
  getMbtiAnalysis as getMbtiAnalysisDb,
  getMbtiDraft as getMbtiDraftDb,
  upsertMbtiAnalysis,
  upsertMbtiDraft,
} from '@/features/analysis'
import { generateWithProvider, generateWithSpecificProvider } from '@/features/ai-engine'
import { MBTI_INTERPRETATION_PROMPT, getMbtiPrompt, type MbtiPromptId } from "@/features/ai-engine/prompts"
import type { ProviderName } from '@/features/ai-engine'
import { eventBus } from "@/lib/events/event-bus"
import { ok } from "@/lib/errors/action-result"
import questions from "@/data/mbti/questions.json"
import descriptions from "@/data/mbti/descriptions.json"

/**
 * 역할에 따른 teacherId 반환 (TEACHER만 본인 학생으로 제한)
 */
function ownerTeacherId(session: { userId: string; role: string }): string | null {
  return session.role === 'TEACHER' ? session.userId : null
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
 * MBTI 설문 임시 저장 조회
 */
export async function getMbtiDraft(studentId: string) {
  const session = await verifySession()
  await ensureStudentAccess(studentId, session)

  const draft = await getMbtiDraftDb(studentId)
  return draft
}

/**
 * MBTI 설문 임시 저장
 */
export async function saveMbtiDraft(
  studentId: string,
  responses: Record<string, number>
) {
  const session = await verifySession()
  await ensureStudentAccess(studentId, session)

  // 진행도 계산
  const progress = calculateProgress(responses, 60)

  // Draft 저장
  await upsertMbtiDraft(studentId, responses, progress.answeredCount)

  return ok({ progress: progress.answeredCount })
}

/**
 * MBTI 설문 최종 제출
 */
export async function submitMbtiSurvey(
  studentId: string,
  responses: Record<string, number>
) {
  const session = await verifySession()
  await ensureStudentAccess(studentId, session)

  // 60문항 모두 응답했는지 검증
  const progress = calculateProgress(responses, 60)
  if (progress.answeredCount < 60) {
    throw new Error("모든 문항에 응답해주세요.")
  }

  // MBTI 점수 계산
  const result = scoreMbti(responses, questions)

  // 유형 설명 로드
  const typeDescription = descriptions[result.mbtiType as keyof typeof descriptions]

  if (!typeDescription) {
    throw new Error(`MBTI 유형 설명을 찾을 수 없습니다: ${result.mbtiType}`)
  }

  // 해석 텍스트 생성
  const interpretation = `## ${typeDescription.name}

${typeDescription.summary}

### 주요 강점
${typeDescription.strengths.map((s) => `- ${s}`).join("\n")}

### 주의할 점
${typeDescription.weaknesses.map((w) => `- ${w}`).join("\n")}

### 학습 스타일
${typeDescription.learningStyle}

### 추천 직업
${typeDescription.careers.join(", ")}

### 대표 인물
${typeDescription.famousPeople.join(", ")}
`

  // 분석 결과 저장
  const analysis = await upsertMbtiAnalysis(studentId, {
    responses,
    scores: result.scores,
    mbtiType: result.mbtiType,
    percentages: result.percentages,
    interpretation,
  })

  // Draft 삭제
  try {
    await deleteMbtiDraft(studentId)
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
      analysisType: 'mbti',
      subjectType: 'STUDENT',
      subjectId: studentId,
      subjectName: student.name,
      timestamp: new Date().toISOString(),
    })
  }
  eventBus.emit('mbti.submitted', { studentId, resultId: analysis.id })

  // 캐시 무효화
  revalidatePath(`/students/${studentId}`)

  return ok({
    mbtiType: result.mbtiType,
    percentages: result.percentages,
    interpretation,
  })
}

/**
 * MBTI 분석 결과 조회
 */
export async function getMbtiAnalysis(studentId: string) {
  const session = await verifySession()
  await ensureStudentAccess(studentId, session)

  const analysis = await getMbtiAnalysisDb(studentId)
  return analysis
}

/**
 * MBTI 직접 입력 (설문 없이 유형과 백분율 직접 저장)
 */
export async function saveMbtiDirectInput(
  studentId: string,
  data: {
    mbtiType: string
    percentages: {
      E: number
      I: number
      S: number
      N: number
      T: number
      F: number
      J: number
      P: number
    }
  }
) {
  const session = await verifySession()
  await ensureStudentAccess(studentId, session)

  // 유형 설명 로드
  const typeDescription = descriptions[data.mbtiType as keyof typeof descriptions]

  if (!typeDescription) {
    throw new Error(`MBTI 유형 설명을 찾을 수 없습니다: ${data.mbtiType}`)
  }

  // 해석 텍스트 생성
  const interpretation = `## ${typeDescription.name}

${typeDescription.summary}

### 주요 강점
${typeDescription.strengths.map((s) => `- ${s}`).join("\n")}

### 주의할 점
${typeDescription.weaknesses.map((w) => `- ${w}`).join("\n")}

### 학습 스타일
${typeDescription.learningStyle}

### 추천 직업
${typeDescription.careers.join(", ")}

### 대표 인물
${typeDescription.famousPeople.join(", ")}
`

  // 빈 scores 생성 (직접 입력이므로 응답 없음)
  const scores = {
    e: 0,
    i: 0,
    s: 0,
    n: 0,
    t: 0,
    f: 0,
    j: 0,
    p: 0,
  }

  // 분석 결과 저장
  const analysis = await upsertMbtiAnalysis(studentId, {
    responses: {}, // 직접 입력이므로 빈 응답
    scores,
    mbtiType: data.mbtiType,
    percentages: data.percentages,
    interpretation,
  })

  // Draft 삭제 (있을 경우)
  try {
    await deleteMbtiDraft(studentId)
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
      analysisType: 'mbti',
      subjectType: 'STUDENT',
      subjectId: studentId,
      subjectName: student.name,
      timestamp: new Date().toISOString(),
    })
  }
  eventBus.emit('mbti.submitted', { studentId, resultId: analysis.id })

  // 캐시 무효화
  revalidatePath(`/students/${studentId}`)

  return ok({
    mbtiType: data.mbtiType,
    percentages: data.percentages,
    interpretation,
  })
}

/**
 * MBTI 결과를 LLM으로 재해석
 * 기존 MBTI 결과(유형+비율)를 기반으로 LLM이 풍부한 해석을 생성
 */
export async function generateMbtiLLMInterpretation(
  studentId: string,
  provider?: string,
  promptId?: string
) {
  const session = await verifySession()
  await ensureStudentAccess(studentId, session)

  // 기존 MBTI 결과 조회
  const analysis = await getMbtiAnalysisDb(studentId)
  if (!analysis) {
    throw new Error("MBTI 분석 결과가 없습니다. 먼저 설문을 완료해주세요.")
  }

  const percentages = analysis.percentages as Record<string, number>

  // 선택된 프롬프트가 있으면 해당 프롬프트의 buildPrompt 사용
  let prompt: string
  if (promptId && promptId !== 'default') {
    const mbtiPromptDef = getMbtiPrompt(promptId as MbtiPromptId)
    prompt = mbtiPromptDef
      ? mbtiPromptDef.buildPrompt(analysis.mbtiType, percentages)
      : MBTI_INTERPRETATION_PROMPT(analysis.mbtiType, percentages)
  } else {
    prompt = MBTI_INTERPRETATION_PROMPT(analysis.mbtiType, percentages)
  }

  const llmResult = (!provider || provider === 'auto')
    ? await generateWithProvider({
        featureType: 'mbti_analysis',
        prompt,
        teacherId: session.userId,
        maxOutputTokens: 2048,
      })
    : await generateWithSpecificProvider(provider as ProviderName, {
        featureType: 'mbti_analysis',
        prompt,
        teacherId: session.userId,
        maxOutputTokens: 2048,
      })

  // DB의 interpretation 필드 업데이트
  await db.mbtiAnalysis.update({
    where: { subjectType_subjectId: { subjectType: 'STUDENT', subjectId: studentId } },
    data: { interpretation: llmResult.text },
  })

  revalidatePath(`/students/${studentId}`)

  return ok({ interpretation: llmResult.text })
}
