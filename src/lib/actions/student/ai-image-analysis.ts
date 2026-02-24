"use server"

import { revalidatePath } from "next/cache"
import { after } from "next/server"
import { generateWithVision, generateVisionWithSpecificProvider, FailoverError } from '@/features/ai-engine'
import { FACE_READING_PROMPT, PALM_READING_PROMPT, getFacePrompt, type FacePromptId, getPalmPrompt, type PalmPromptId } from "@/features/ai-engine/prompts"
import { verifySession } from "@/lib/dal"
import { db } from "@/lib/db/client"
import { extractJsonFromLLM } from "@/shared"
import { upsertFaceAnalysis } from '@/features/analysis'
import { upsertPalmAnalysis } from '@/features/analysis'
import type { ProviderName } from '@/features/ai-engine'
import { eventBus } from "@/lib/events/event-bus"
import { ok, fail } from "@/lib/errors/action-result"
import { logger } from "@/lib/logger"

/**
 * 학생 관상 분석 (통합 LLM 라우터 사용)
 *
 * Vision을 지원하는 제공자에서 자동 폴백됩니다.
 * (anthropic, openai, google 순)
 */
export async function analyzeFaceImage(studentId: string, imageUrl: string, provider?: string, promptId?: string) {
  const session = await verifySession()

  // 학생 접근 권한 확인 (TEACHER는 본인 학생만, DIRECTOR/ADMIN은 전체)
  const where: { id: string; teacherId?: string } = { id: studentId }
  if (session.role === 'TEACHER') where.teacherId = session.userId
  const student = await db.student.findFirst({ where })

  if (!student) {
    return fail("학생을 찾을 수 없어요.")
  }

  // 분석 시작 전에 pending 상태 기록 (폴링이 이전 결과와 구분할 수 있도록)
  await upsertFaceAnalysis({
    subjectType: 'STUDENT',
    subjectId: studentId,
    imageUrl,
    result: null,
    status: 'pending',
  })

  // 즉시 응답하고 백그라운드에서 분석 실행
  after(async () => {
    try {
      // Cloudinary에서 이미지 다운로드
      const imageResponse = await fetch(imageUrl)
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())
      const base64Image = imageBuffer.toString('base64')

      // 선택된 프롬프트 또는 기본 프롬프트 사용
      const selectedPrompt = promptId && promptId !== 'default'
        ? getFacePrompt(promptId as FacePromptId)?.promptTemplate ?? FACE_READING_PROMPT
        : FACE_READING_PROMPT

      // Vision API 호출 — provider 분기
      const visionOptions = {
        featureType: 'face_analysis' as const,
        teacherId: session.userId,
        imageBase64: base64Image,
        mimeType: 'image/jpeg' as const,
        prompt: selectedPrompt,
        maxOutputTokens: 4096,
      }

      const response = (provider && provider !== 'auto')
        ? await generateVisionWithSpecificProvider(provider as ProviderName, visionOptions)
        : await generateWithVision(visionOptions)

      // JSON 응답 파싱 (마크다운 코드블록 등 LLM 응답 형식 대응)
      const result = extractJsonFromLLM(response.text)

      // 폴백 발생 시 로깅
      if (response.wasFailover) {
        logger.info(
          { failoverFrom: response.failoverFrom, provider: response.provider },
          '[Face Analysis] Failover occurred'
        )
      }

      // DB에 저장
      await upsertFaceAnalysis({
        subjectType: 'STUDENT',
        subjectId: studentId,
        imageUrl,
        result,
        status: 'complete',
        usedProvider: response.provider,
        usedModel: response.model,
      })

      // 이벤트 발행
      eventBus.emitEvent({
        type: 'analysis:complete',
        analysisType: 'face',
        subjectType: 'STUDENT',
        subjectId: studentId,
        subjectName: student.name,
        timestamp: new Date().toISOString(),
      })

      revalidatePath(`/students/${studentId}`)

    } catch (error) {
      logger.error({ err: error }, 'Face analysis error')

      // FailoverError인 경우 상세 로깅
      if (error instanceof FailoverError) {
        logger.error(
          { totalAttempts: error.totalAttempts, errors: error.errors.map(e => `${e.provider}: ${e.error.message}`).join('; ') },
          '[Face Analysis] All providers failed'
        )
      }

      // 에러 상태 저장
      await upsertFaceAnalysis({
        subjectType: 'STUDENT',
        subjectId: studentId,
        imageUrl,
        result: null,
        status: 'failed',
        errorMessage: error instanceof FailoverError
          ? error.userMessage
          : error instanceof Error ? error.message : '알 수 없는 에러'
      })

      revalidatePath(`/students/${studentId}`)
    }
  })

  return ok({ message: "분석을 시작했어요. 잠시 후 결과가 표시됩니다." })
}

/**
 * 학생 손금 분석 (통합 LLM 라우터 사용)
 *
 * Vision을 지원하는 제공자에서 자동 폴백됩니다.
 */
export async function analyzePalmImage(
  studentId: string,
  imageUrl: string,
  hand: 'left' | 'right',
  provider?: string,
  promptId?: string
) {
  const session = await verifySession()

  // 학생 접근 권한 확인 (TEACHER는 본인 학생만, DIRECTOR/ADMIN은 전체)
  const where: { id: string; teacherId?: string } = { id: studentId }
  if (session.role === 'TEACHER') where.teacherId = session.userId
  const student = await db.student.findFirst({ where })

  if (!student) {
    return fail("학생을 찾을 수 없어요.")
  }

  after(async () => {
    try {
      const imageResponse = await fetch(imageUrl)
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())
      const base64Image = imageBuffer.toString('base64')

      // 선택된 프롬프트 또는 기본 프롬프트 사용
      const selectedPrompt = promptId && promptId !== 'default'
        ? getPalmPrompt(promptId as PalmPromptId)?.promptTemplate ?? PALM_READING_PROMPT
        : PALM_READING_PROMPT

      // Vision API 호출 — provider 분기
      const visionOptions = {
        featureType: 'palm_analysis' as const,
        teacherId: session.userId,
        imageBase64: base64Image,
        mimeType: 'image/jpeg' as const,
        prompt: selectedPrompt,
        maxOutputTokens: 4096,
      }

      const response = (provider && provider !== 'auto')
        ? await generateVisionWithSpecificProvider(provider as ProviderName, visionOptions)
        : await generateWithVision(visionOptions)

      const result = extractJsonFromLLM(response.text)

      // 폴백 발생 시 로깅
      if (response.wasFailover) {
        logger.info(
          { failoverFrom: response.failoverFrom, provider: response.provider },
          '[Palm Analysis] Failover occurred'
        )
      }

      await upsertPalmAnalysis({
        subjectType: 'STUDENT',
        subjectId: studentId,
        hand,
        imageUrl,
        result,
        status: 'complete'
      })

      // 이벤트 발행
      eventBus.emitEvent({
        type: 'analysis:complete',
        analysisType: 'palm',
        subjectType: 'STUDENT',
        subjectId: studentId,
        subjectName: student.name,
        timestamp: new Date().toISOString(),
      })

      revalidatePath(`/students/${studentId}`)

    } catch (error) {
      logger.error({ err: error }, 'Palm analysis error')

      // FailoverError인 경우 상세 로깅
      if (error instanceof FailoverError) {
        logger.error(
          { totalAttempts: error.totalAttempts, errors: error.errors.map(e => `${e.provider}: ${e.error.message}`).join('; ') },
          '[Palm Analysis] All providers failed'
        )
      }

      await upsertPalmAnalysis({
        subjectType: 'STUDENT',
        subjectId: studentId,
        hand,
        imageUrl,
        result: null,
        status: 'failed',
        errorMessage: error instanceof FailoverError
          ? error.userMessage
          : error instanceof Error ? error.message : '알 수 없는 에러'
      })

      revalidatePath(`/students/${studentId}`)
    }
  })

  return ok({ message: "분석을 시작했어요. 잠시 후 결과가 표시됩니다." })
}

/**
 * 학생 관상 분석 결과 조회
 */
export async function getFaceAnalysis(studentId: string) {
  const session = await verifySession()

  const analysis = await db.faceAnalysis.findUnique({
    where: {
      subjectType_subjectId: {
        subjectType: 'STUDENT',
        subjectId: studentId,
      }
    },
  })

  if (!analysis) return null

  // TEACHER는 본인 학생만, DIRECTOR/ADMIN은 전체 접근
  if (session.role === 'TEACHER') {
    const student = await db.student.findFirst({
      where: { id: studentId, teacherId: session.userId },
      select: { id: true },
    })
    if (!student) return null
  }

  return analysis
}

/**
 * 학생 손금 분석 결과 조회
 */
export async function getPalmAnalysis(studentId: string) {
  const session = await verifySession()

  const analysis = await db.palmAnalysis.findUnique({
    where: {
      subjectType_subjectId: {
        subjectType: 'STUDENT',
        subjectId: studentId,
      }
    },
  })

  if (!analysis) return null

  // TEACHER는 본인 학생만, DIRECTOR/ADMIN은 전체 접근
  if (session.role === 'TEACHER') {
    const student = await db.student.findFirst({
      where: { id: studentId, teacherId: session.userId },
      select: { id: true },
    })
    if (!student) return null
  }

  return analysis
}
