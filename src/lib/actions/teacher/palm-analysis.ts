"use server"

import { revalidatePath } from "next/cache"
import { after } from "next/server"
import { generateWithVision, FailoverError } from '@/features/ai-engine'
import { PALM_READING_PROMPT } from "@/features/ai-engine/prompts"
import { verifySession } from "@/lib/dal"
import { db } from "@/lib/db/client"
import { upsertPalmAnalysis, getPalmAnalysis } from '@/features/analysis'
import { extractJsonFromLLM } from "@/shared"
import { eventBus } from "@/lib/events/event-bus"
import { ok, type ActionResult } from "@/lib/errors/action-result"

/**
 * 선생님 손금 분석 실행 (통합 LLM 라우터 사용)
 *
 * Vision을 지원하는 제공자에서 자동 폴백됩니다.
 * (anthropic, openai, google 순)
 */
export async function runTeacherPalmAnalysis(
  teacherId: string,
  imageUrl: string,
  hand: "left" | "right"
) {
  const session = await verifySession()
  if (!session) throw new Error("Unauthorized")

  // 백그라운드에서 분석 실행
  after(async () => {
    try {
      // Cloudinary에서 이미지 다운로드
      const imageResponse = await fetch(imageUrl)
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())
      const base64Image = imageBuffer.toString('base64')

      // 통합 라우터를 통한 Vision API 호출 (자동 폴백)
      const response = await generateWithVision({
        featureType: 'palm_analysis',
        teacherId: session.userId,
        imageBase64: base64Image,
        mimeType: 'image/jpeg',
        prompt: PALM_READING_PROMPT,
        maxOutputTokens: 2048,
      })

      // JSON 응답 파싱 (마크다운 코드블록 등 LLM 응답 형식 대응)
      const result = extractJsonFromLLM(response.text)

      // 폴백 발생 시 로깅
      if (response.wasFailover) {
        console.info(
          `[Teacher Palm Analysis] Failover occurred: ${response.failoverFrom} -> ${response.provider}`
        )
      }

      // DB 저장 (통합 테이블, subjectType='TEACHER')
      await upsertPalmAnalysis({
        subjectType: 'TEACHER',
        subjectId: teacherId,
        hand,
        imageUrl,
        result,
        status: 'complete'
      })

      // 이벤트 발행
      const teacher = await db.teacher.findUnique({
        where: { id: teacherId },
        select: { name: true },
      })
      if (teacher) {
        eventBus.emitEvent({
          type: 'analysis:complete',
          analysisType: 'palm',
          subjectType: 'TEACHER',
          subjectId: teacherId,
          subjectName: teacher.name,
          timestamp: new Date().toISOString(),
        })
      }

      revalidatePath(`/teachers/${teacherId}`)

    } catch (error) {
      console.error('Teacher palm analysis error:', error)

      // FailoverError인 경우 상세 로깅
      if (error instanceof FailoverError) {
        console.error(
          `[Teacher Palm Analysis] All providers failed (${error.totalAttempts} attempts):`,
          error.errors.map(e => `${e.provider}: ${e.error.message}`).join('; ')
        )
      }

      // 에러 상태 저장
      await upsertPalmAnalysis({
        subjectType: 'TEACHER',
        subjectId: teacherId,
        hand,
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
 * 선생님 손금 분석 결과 조회
 */
export async function getTeacherPalmAnalysisAction(teacherId: string) {
  const session = await verifySession()

  const analysis = await getPalmAnalysis('TEACHER', teacherId)

  // TODO: Add RBAC check based on teacher roles when needed
  // For now, teachers can view their own analysis
  return analysis
}
