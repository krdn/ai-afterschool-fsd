"use server"

import { revalidatePath } from "next/cache"
import { after } from "next/server"
import { generateWithVision, generateVisionWithSpecificProvider, FailoverError } from '@/features/ai-engine'
import { FACE_READING_PROMPT, getFacePrompt, type FacePromptId } from "@/features/ai-engine/prompts"
import { verifySession } from "@/lib/dal"
import { db } from "@/lib/db/client"
import { upsertFaceAnalysis, getFaceAnalysis } from '@/features/analysis'
import { extractJsonFromLLM } from "@/shared"
import type { ProviderName } from '@/features/ai-engine'
import { eventBus } from "@/lib/events/event-bus"
import { ok, fail, type ActionResult } from "@/lib/errors/action-result"

/**
 * 선생님 관상 분석 실행 (통합 LLM 라우터 사용)
 *
 * Vision을 지원하는 제공자에서 자동 폴백됩니다.
 * (anthropic, openai, google 순)
 */
export async function runTeacherFaceAnalysis(teacherId: string, imageUrl: string, provider?: string, promptId?: string) {
  const session = await verifySession()

  // 선생님 접근 권한 확인 (본인 또는 DIRECTOR만 가능)
  const teacher = await db.teacher.findFirst({
    where: {
      id: teacherId,
      OR: [
        { id: session.userId }, // 본인
        { id: teacherId } // DIRECTOR는 verifySession에서 확인됨
      ]
    }
  })

  if (!teacher && session.role !== 'DIRECTOR') {
    return fail("선생님을 찾을 수 없어요.")
  }

  // 분석 시작 전에 pending 상태 기록 (폴링이 이전 결과와 구분할 수 있도록)
  await upsertFaceAnalysis({
    subjectType: 'TEACHER',
    subjectId: teacherId,
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
        maxOutputTokens: 2048,
      }

      const response = (provider && provider !== 'auto')
        ? await generateVisionWithSpecificProvider(provider as ProviderName, visionOptions)
        : await generateWithVision(visionOptions)

      // JSON 응답 파싱 (마크다운 코드블록 등 LLM 응답 형식 대응)
      const result = extractJsonFromLLM(response.text)

      // 폴백 발생 시 로깅
      if (response.wasFailover) {
        console.info(
          `[Teacher Face Analysis] Failover occurred: ${response.failoverFrom} -> ${response.provider}`
        )
      }

      // DB에 저장 (통합 테이블, subjectType='TEACHER')
      await upsertFaceAnalysis({
        subjectType: 'TEACHER',
        subjectId: teacherId,
        imageUrl,
        result,
        status: 'complete',
        usedProvider: response.provider,
        usedModel: response.model,
      })

      // 이벤트 발행
      if (teacher) {
        eventBus.emitEvent({
          type: 'analysis:complete',
          analysisType: 'face',
          subjectType: 'TEACHER',
          subjectId: teacherId,
          subjectName: teacher.name,
          timestamp: new Date().toISOString(),
        })
      }

      revalidatePath(`/teachers/${teacherId}`)

    } catch (error) {
      console.error('Teacher face analysis error:', error)

      // FailoverError인 경우 상세 로깅
      if (error instanceof FailoverError) {
        console.error(
          `[Teacher Face Analysis] All providers failed (${error.totalAttempts} attempts):`,
          error.errors.map(e => `${e.provider}: ${e.error.message}`).join('; ')
        )
      }

      // 에러 상태 저장
      await upsertFaceAnalysis({
        subjectType: 'TEACHER',
        subjectId: teacherId,
        imageUrl,
        result: null,
        status: 'failed',
        errorMessage: error instanceof FailoverError
          ? error.userMessage
          : error instanceof Error ? error.message : '알 수 없는 에러'
      })

      revalidatePath(`/teachers/${teacherId}`)
    }
  })

  return ok({ message: "분석을 시작했어요. 잠시 후 결과가 표시됩니다." })
}

/**
 * 선생님 관상 분석 결과 조회
 */
export async function getTeacherFaceAnalysisAction(teacherId: string) {
  const session = await verifySession()

  const analysis = await getFaceAnalysis('TEACHER', teacherId)

  // 본인 또는 DIRECTOR만 조회 가능
  if (!analysis || (teacherId !== session.userId && session.role !== 'DIRECTOR')) {
    return null
  }

  return analysis
}
