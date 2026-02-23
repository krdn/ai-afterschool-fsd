"use server"

import { revalidatePath } from "next/cache"
import { after } from "next/server"
import { verifySession } from "@/lib/dal"
import { db } from "@/lib/db/client"
import {
  getUnifiedPersonalityData,
  getPersonalitySummary,
  upsertPersonalitySummary,
} from '@/features/analysis'
import { generateWithProvider, FailoverError } from '@/features/ai-engine'
import { buildLearningStrategyPrompt, buildCareerGuidancePrompt } from "@/features/ai-engine/prompts"
import { LearningStrategySchema, CareerGuidanceSchema } from "@/lib/validations/personality"
import { extractJsonFromLLM } from "@/shared"
import { ok, fail, type ActionResult } from "@/lib/errors/action-result"

/**
 * AI 기반 학습 전략 생성 Server Action (통합 LLM 라우터 사용)
 *
 * 최소 3개 이상의 분석이 완료된 경우에만 실행 가능합니다.
 * 설정된 제공자 순서에 따라 자동 폴백됩니다.
 *
 * @param studentId - 학생 ID
 * @returns 성공/실패 메시지
 */
export async function generateLearningStrategy(studentId: string) {
  // 1. 교사 인증
  const session = await verifySession()
  if (!session?.userId) {
    return fail("인증되지 않았습니다.")
  }

  // 2. 학생 소속 검증
  const student = await db.student.findFirst({
    where: {
      id: studentId,
      teacherId: session.userId,
    },
  })

  if (!student) {
    return fail("학생을 찾을 수 없습니다.")
  }

  // 3. 통합 데이터 조회
  const data = await getUnifiedPersonalityData(studentId, session.userId)
  if (!data) {
    return fail("성향 데이터를 찾을 수 없습니다.")
  }

  // 4. 최소 3개 분석 확인
  const availableCount = [
    data.saju.calculatedAt,
    data.name.calculatedAt,
    data.mbti.calculatedAt,
    data.face.analyzedAt,
    data.palm.analyzedAt,
  ].filter(Boolean).length

  if (availableCount < 3) {
    return fail("최소 3개 이상의 분석이 필요합니다.")
  }

  // 5. 기존 생성 중인 작업 확인
  const existing = await getPersonalitySummary(studentId)

  if (existing?.status === "pending") {
    return fail("이미 생성 중입니다.")
  }

  // 6. pending 상태로 저장
  await upsertPersonalitySummary({
    studentId,
    status: "pending",
    coreTraits: null,
    learningStrategy: null,
    careerGuidance: null,
  })

  // 7. 비동기 AI 호출 (통합 라우터 사용)
  after(async () => {
    try {
      // 프롬프트 생성
      const prompt = buildLearningStrategyPrompt(data, {
        name: student.name,
        grade: student.grade,
        targetMajor: student.targetMajor,
      })

      // 통합 라우터를 통한 LLM 호출 (자동 폴백)
      const response = await generateWithProvider({
        featureType: 'learning_analysis',
        teacherId: session.userId,
        prompt,
        maxOutputTokens: 3000,
      })

      // 폴백 발생 시 로깅
      if (response.wasFailover) {
        console.info(
          `[Learning Strategy] Failover occurred: ${response.failoverFrom} -> ${response.provider}`
        )
      }

      // JSON 파싱 (마크다운 코드블록 등 LLM 응답 형식 대응)
      const result = extractJsonFromLLM(response.text)

      // Zod 스키마 검증
      const validatedResult = LearningStrategySchema.parse(result)

      // 8. 결과 저장
      await upsertPersonalitySummary({
        studentId,
        status: "complete",
        coreTraits: validatedResult.coreTraits,
        learningStrategy: validatedResult,
        careerGuidance: null,
      })

      // 9. 페이지 갱신
      revalidatePath(`/students/${studentId}`)
    } catch (error) {
      console.error("Failed to generate learning strategy:", error)

      // FailoverError인 경우 상세 로깅
      if (error instanceof FailoverError) {
        console.error(
          `[Learning Strategy] All providers failed (${error.totalAttempts} attempts):`,
          error.errors.map(e => `${e.provider}: ${e.error.message}`).join('; ')
        )
      }

      // 에러 저장
      await upsertPersonalitySummary({
        studentId,
        status: "failed",
        errorMessage: error instanceof FailoverError
          ? error.userMessage
          : error instanceof Error ? error.message : "알 수 없는 오류",
      })

      revalidatePath(`/students/${studentId}`)
    }
  })

  return ok({ message: "AI 분석을 시작했습니다. 완료되면 자동으로 표시됩니다." })
}

/**
 * AI 기반 진로 가이드 생성 Server Action (통합 LLM 라우터 사용)
 *
 * 최소 3개 이상의 분석이 완료된 경우에만 실행 가능합니다.
 * 설정된 제공자 순서에 따라 자동 폴백됩니다.
 *
 * @param studentId - 학생 ID
 * @returns 성공/실패 메시지
 */
export async function generateCareerGuidance(studentId: string) {
  // 1. 교사 인증
  const session = await verifySession()
  if (!session?.userId) {
    return fail("인증되지 않았습니다.")
  }

  // 2. 학생 소속 검증
  const student = await db.student.findFirst({
    where: {
      id: studentId,
      teacherId: session.userId,
    },
  })

  if (!student) {
    return fail("학생을 찾을 수 없습니다.")
  }

  // 3. 통합 데이터 조회
  const data = await getUnifiedPersonalityData(studentId, session.userId)
  if (!data) {
    return fail("성향 데이터를 찾을 수 없습니다.")
  }

  // 4. 최소 3개 분석 확인
  const availableCount = [
    data.saju.calculatedAt,
    data.name.calculatedAt,
    data.mbti.calculatedAt,
    data.face.analyzedAt,
    data.palm.analyzedAt,
  ].filter(Boolean).length

  if (availableCount < 3) {
    return fail("최소 3개 이상의 분석이 필요합니다.")
  }

  // 5. 기존 생성 중인 작업 확인
  const existing = await getPersonalitySummary(studentId)

  if (existing?.status === "pending") {
    return fail("이미 생성 중입니다.")
  }

  // 6. pending 상태로 저장
  await upsertPersonalitySummary({
    studentId,
    status: "pending",
  })

  // 7. 비동기 AI 호출 (통합 라우터 사용)
  after(async () => {
    try {
      // 프롬프트 생성
      const prompt = buildCareerGuidancePrompt(data, {
        name: student.name,
        grade: student.grade,
        targetMajor: student.targetMajor,
      })

      // 통합 라우터를 통한 LLM 호출 (자동 폴백)
      const response = await generateWithProvider({
        featureType: 'counseling_suggest',
        teacherId: session.userId,
        prompt,
        maxOutputTokens: 3000,
      })

      // 폴백 발생 시 로깅
      if (response.wasFailover) {
        console.info(
          `[Career Guidance] Failover occurred: ${response.failoverFrom} -> ${response.provider}`
        )
      }

      // JSON 파싱 (마크다운 코드블록 등 LLM 응답 형식 대응)
      const result = extractJsonFromLLM(response.text)

      // Zod 스키마 검증
      const validatedResult = CareerGuidanceSchema.parse(result)

      // 8. 결과 저장
      await upsertPersonalitySummary({
        studentId,
        status: "complete",
        coreTraits: validatedResult.coreTraits,
        learningStrategy: null,
        careerGuidance: validatedResult,
      })

      // 9. 페이지 갱신
      revalidatePath(`/students/${studentId}`)
    } catch (error) {
      console.error("Failed to generate career guidance:", error)

      // FailoverError인 경우 상세 로깅
      if (error instanceof FailoverError) {
        console.error(
          `[Career Guidance] All providers failed (${error.totalAttempts} attempts):`,
          error.errors.map(e => `${e.provider}: ${e.error.message}`).join('; ')
        )
      }

      // 에러 저장
      await upsertPersonalitySummary({
        studentId,
        status: "failed",
        errorMessage: error instanceof FailoverError
          ? error.userMessage
          : error instanceof Error ? error.message : "알 수 없는 오류",
      })

      revalidatePath(`/students/${studentId}`)
    }
  })

  return ok({ message: "AI 분석을 시작했습니다. 완료되면 자동으로 표시됩니다." })
}

/**
 * 학생의 AI 통합 분석 요약 조회
 *
 * @param studentId - 학생 ID
 * @returns PersonalitySummary 또는 null
 */
export async function getPersonalitySummaryAction(studentId: string) {
  const session = await verifySession()

  // 학생 소속 검증
  const student = await db.student.findFirst({
    where: { id: studentId, teacherId: session.userId }
  })

  if (!student) {
    return null
  }

  return getPersonalitySummary(studentId)
}
