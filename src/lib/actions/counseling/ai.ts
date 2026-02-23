"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { verifySession } from "@/lib/dal"
import { db } from "@/lib/db/client"
import { getUnifiedPersonalityData, upsertPersonalitySummary } from '@/features/analysis'
import { getCompatibilityResult } from '@/features/matching'
import { generateWithProvider, FailoverError } from '@/features/ai-engine'
import { buildCounselingSummaryPrompt, buildPersonalitySummaryPrompt } from "@/features/ai-engine/prompts"
import { ok, fail, okVoid, type ActionResult, type ActionVoidResult } from "@/lib/errors/action-result"

// Validation schemas
// Note: studentId can be CUID or custom format like "student-001" from seed data
const studentIdSchema = z.string().min(1)
const sessionIdSchema = z.string().min(1)

/**
 * 학생 AI 지원 데이터 반환 타입
 */
export type AISupportData = {
  studentName: string
  personalitySummary: string | null
  compatibility: {
    overallScore: number
    breakdown: Record<string, number>
    reasons: string[]
  } | null
  canCalculateCompatibility: boolean
  hasAnalysisData: boolean
}

/**
 * 학생 AI 지원 데이터 조회 Server Action
 *
 * 상담 화면에서 학생의 성향 요약과 궁합 점수를 조회합니다.
 * - 성향 요약: PersonalitySummary.coreTraits 필드
 * - 궁합 점수: CompatibilityResult 테이블
 *
 * @param studentId - 학생 ID
 * @returns AI 지원 데이터 또는 에러
 */
export async function getStudentAISupportDataAction(studentId: string): Promise<ActionResult<AISupportData>> {
  // 1. 인증 확인
  const session = await verifySession()
  if (!session?.userId) {
    return fail("인증되지 않았습니다.")
  }

  // 2. 입력 검증
  const parseResult = studentIdSchema.safeParse(studentId)
  if (!parseResult.success) {
    return fail("유효하지 않은 학생 ID입니다.")
  }

  // 3. 학생 조회 (teacherId로 권한 확인)
  const student = await db.student.findFirst({
    where: {
      id: studentId,
      teacherId: session.userId,
    },
    select: {
      id: true,
      name: true,
      personalitySummary: {
        select: {
          coreTraits: true,
          status: true,
        },
      },
    },
  })

  if (!student) {
    return fail("학생을 찾을 수 없거나 접근 권한이 없습니다.")
  }

  // 4. 궁합 점수 조회
  const compatibilityResult = await getCompatibilityResult(session.userId, studentId)

  // 5. 성향 데이터 존재 여부 확인
  const personalityData = await getUnifiedPersonalityData(studentId, session.userId)

  // 최소 1개 이상의 분석이 있는지 확인
  const hasAnalysisData = personalityData ? [
    personalityData.saju.calculatedAt,
    personalityData.name.calculatedAt,
    personalityData.mbti.calculatedAt,
    personalityData.face.analyzedAt,
    personalityData.palm.analyzedAt,
  ].some(Boolean) : false

  // 6. 궁합 계산 가능 여부 (성향 데이터가 있고 궁합 결과가 없는 경우)
  const canCalculateCompatibility = hasAnalysisData && !compatibilityResult

  // 7. 반환 데이터 구성
  const data: AISupportData = {
    studentName: student.name,
    personalitySummary: student.personalitySummary?.coreTraits ?? null,
    compatibility: compatibilityResult
      ? {
          overallScore: compatibilityResult.overallScore,
          breakdown: compatibilityResult.breakdown as Record<string, number>,
          reasons: (compatibilityResult.reasons as string[]) ?? [],
        }
      : null,
    canCalculateCompatibility,
    hasAnalysisData,
  }

  return ok(data)
}

/**
 * AI 상담 요약 생성 Server Action
 *
 * 상담 세션의 내용을 기반으로 AI가 구조화된 요약을 생성합니다.
 * - 학생 성향 정보 활용
 * - 이전 상담 이력 참조 (최근 3개)
 * - Markdown 형식의 구조화된 요약 생성
 *
 * @param sessionId - 상담 세션 ID
 * @returns 생성된 AI 요약 또는 에러
 */
export async function generateCounselingSummaryAction(sessionId: string): Promise<ActionResult<string>> {
  // 1. 인증 확인
  const session = await verifySession()
  if (!session?.userId) {
    return fail("인증되지 않았습니다.")
  }

  // 2. 입력 검증
  const parseResult = sessionIdSchema.safeParse(sessionId)
  if (!parseResult.success) {
    return fail("유효하지 않은 세션 ID입니다.")
  }

  // 3. 상담 세션 조회 (teacherId로 권한 확인)
  const counselingSession = await db.counselingSession.findFirst({
    where: {
      id: sessionId,
      teacherId: session.userId,
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  if (!counselingSession) {
    return fail("상담 세션을 찾을 수 없거나 접근 권한이 없습니다.")
  }

  // 4. 학생 성향 정보 조회
  const personalityData = await getUnifiedPersonalityData(
    counselingSession.studentId,
    session.userId
  )

  // 5. 이전 상담 이력 조회 (최근 3개)
  const previousSessions = await db.counselingSession.findMany({
    where: {
      studentId: counselingSession.studentId,
      teacherId: session.userId,
      sessionDate: {
        lt: counselingSession.sessionDate,
      },
    },
    orderBy: {
      sessionDate: "desc",
    },
    take: 3,
    select: {
      summary: true,
      sessionDate: true,
      type: true,
    },
  })

  // 6. 프롬프트 빌더로 프롬프트 생성
  const prompt = buildCounselingSummaryPrompt({
    currentSummary: counselingSession.summary,
    sessionDate: counselingSession.sessionDate,
    sessionType: counselingSession.type,
    personality: personalityData,
    previousSessions: previousSessions.map((s) => ({
      summary: s.summary,
      sessionDate: s.sessionDate,
      type: s.type,
    })),
    studentName: counselingSession.student.name,
  })

  // 7. generateWithProvider로 요약 생성
  try {
    const response = await generateWithProvider({
      featureType: "counseling_suggest",
      teacherId: session.userId,
      prompt,
      maxOutputTokens: 500,
      temperature: 0.3,
    })

    // 폴백 발생 시 로깅
    if (response.wasFailover) {
      console.info(
        `[Counseling Summary] Failover occurred: ${response.failoverFrom} -> ${response.provider}`
      )
    }

    return ok(response.text)
  } catch (error) {
    console.error("Failed to generate counseling summary:", error)

    // FailoverError인 경우 상세 로깅
    if (error instanceof FailoverError) {
      console.error(
        `[Counseling Summary] All providers failed (${error.totalAttempts} attempts):`,
        error.errors.map((e) => `${e.provider}: ${e.error.message}`).join("; ")
      )
      return fail(error.userMessage)
    }

    return fail(error instanceof Error ? error.message : "AI 요약 생성에 실패했습니다.")
  }
}

/**
 * AI 상담 요약 생성 (새 상담용) Server Action
 *
 * 아직 저장되지 않은 새 상담에서 content를 직접 받아 요약을 생성합니다.
 * - sessionId가 없는 경우 사용
 * - 학생 성향 정보만 참조 (이전 상담 이력은 제외)
 *
 * @param studentId - 학생 ID
 * @param content - 상담 내용
 * @param sessionType - 상담 유형
 * @returns 생성된 AI 요약 또는 에러
 */
export async function generateCounselingSummaryFromContentAction(
  studentId: string,
  content: string,
  sessionType: string = "ACADEMIC"
): Promise<ActionResult<string>> {
  // 1. 인증 확인
  const session = await verifySession()
  if (!session?.userId) {
    return fail("인증되지 않았습니다.")
  }

  // 2. 입력 검증
  const parseResult = studentIdSchema.safeParse(studentId)
  if (!parseResult.success) {
    return fail("유효하지 않은 학생 ID입니다.")
  }

  if (!content || content.trim().length < 10) {
    return fail("상담 내용이 너무 짧습니다. (최소 10자)")
  }

  // 3. 학생 조회 (teacherId로 권한 확인)
  const student = await db.student.findFirst({
    where: {
      id: studentId,
      teacherId: session.userId,
    },
    select: {
      id: true,
      name: true,
    },
  })

  if (!student) {
    return fail("학생을 찾을 수 없거나 접근 권한이 없습니다.")
  }

  // 4. 학생 성향 정보 조회 (선택적)
  const personalityData = await getUnifiedPersonalityData(studentId, session.userId)

  // 5. 프롬프트 빌더로 프롬프트 생성
  const prompt = buildCounselingSummaryPrompt({
    currentSummary: content,
    sessionDate: new Date(),
    sessionType,
    personality: personalityData,
    previousSessions: [], // 새 상담이므로 이전 이력 없음
    studentName: student.name,
  })

  // 6. generateWithProvider로 요약 생성
  try {
    const response = await generateWithProvider({
      featureType: "counseling_suggest",
      teacherId: session.userId,
      prompt,
      maxOutputTokens: 500,
      temperature: 0.3,
    })

    // 폴백 발생 시 로깅
    if (response.wasFailover) {
      console.info(
        `[Counseling Summary] Failover occurred: ${response.failoverFrom} -> ${response.provider}`
      )
    }

    return ok(response.text)
  } catch (error) {
    console.error("Failed to generate counseling summary:", error)

    // FailoverError인 경우 상세 로깅
    if (error instanceof FailoverError) {
      console.error(
        `[Counseling Summary] All providers failed (${error.totalAttempts} attempts):`,
        error.errors.map((e) => `${e.provider}: ${e.error.message}`).join("; ")
      )
      return fail(error.userMessage)
    }

    return fail(error instanceof Error ? error.message : "AI 요약 생성에 실패했습니다.")
  }
}

/**
 * AI 요약 저장 Server Action
 *
 * 생성된 AI 요약을 상담 세션에 저장합니다.
 *
 * @param sessionId - 상담 세션 ID
 * @param aiSummary - 저장할 AI 요약 텍스트
 * @returns 성공 여부
 */
export async function saveAISummaryAction(
  sessionId: string,
  aiSummary: string
): Promise<ActionVoidResult> {
  // 1. 인증 확인
  const session = await verifySession()
  if (!session?.userId) {
    return fail("인증되지 않았습니다.")
  }

  // 2. 입력 검증
  const parseResult = sessionIdSchema.safeParse(sessionId)
  if (!parseResult.success) {
    return fail("유효하지 않은 세션 ID입니다.")
  }

  if (!aiSummary || aiSummary.trim().length === 0) {
    return fail("AI 요약 내용이 비어있습니다.")
  }

  // 3. 상담 세션 조회 (teacherId로 권한 확인)
  const counselingSession = await db.counselingSession.findFirst({
    where: {
      id: sessionId,
      teacherId: session.userId,
    },
  })

  if (!counselingSession) {
    return fail("상담 세션을 찾을 수 없거나 접근 권한이 없습니다.")
  }

  // 4. aiSummary 필드 업데이트
  try {
    await db.counselingSession.update({
      where: { id: sessionId },
      data: { aiSummary: aiSummary.trim() },
    })

    // 5. 페이지 갱신
    revalidatePath(`/students/${counselingSession.studentId}`)

    return okVoid()
  } catch (error) {
    console.error("Failed to save AI summary:", error)
    return fail(error instanceof Error ? error.message : "AI 요약 저장에 실패했습니다.")
  }
}

/**
 * 성향 요약 생성 Server Action
 *
 * 학생의 성향 분석 데이터를 기반으로 1-2문장의 요약을 생성하고 저장합니다.
 * - MBTI, 사주, 성명학, 관상, 손금 분석 결과 종합
 * - PersonalitySummary.coreTraits 필드에 저장
 *
 * @param studentId - 학생 ID
 * @returns 생성된 성향 요약 또는 에러
 */
export async function generatePersonalitySummaryAction(studentId: string): Promise<ActionResult<string>> {
  // 1. 인증 확인
  const session = await verifySession()
  if (!session?.userId) {
    return fail("인증되지 않았습니다.")
  }

  // 2. 입력 검증
  const parseResult = studentIdSchema.safeParse(studentId)
  if (!parseResult.success) {
    return fail("유효하지 않은 학생 ID입니다.")
  }

  // 3. 학생 조회 (teacherId로 권한 확인)
  const student = await db.student.findFirst({
    where: {
      id: studentId,
      teacherId: session.userId,
    },
    select: {
      id: true,
      name: true,
    },
  })

  if (!student) {
    return fail("학생을 찾을 수 없거나 접근 권한이 없습니다.")
  }

  // 4. 학생 성향 데이터 조회
  const personalityData = await getUnifiedPersonalityData(studentId, session.userId)

  if (!personalityData) {
    return fail("성향 데이터를 찾을 수 없습니다.")
  }

  // 최소 1개 이상의 분석이 있는지 확인
  const hasAnalysisData = [
    personalityData.saju.calculatedAt,
    personalityData.name.calculatedAt,
    personalityData.mbti.calculatedAt,
    personalityData.face.analyzedAt,
    personalityData.palm.analyzedAt,
  ].some(Boolean)

  if (!hasAnalysisData) {
    return fail("최소 1개 이상의 분석이 필요합니다.")
  }

  // 5. 프롬프트 빌더로 프롬프트 생성
  const prompt = buildPersonalitySummaryPrompt({
    personality: personalityData,
    studentName: student.name,
  })

  // 6. generateWithProvider로 요약 생성
  try {
    const response = await generateWithProvider({
      featureType: "personality_summary",
      teacherId: session.userId,
      prompt,
      maxOutputTokens: 500,
      temperature: 0.3,
    })

    // 폴백 발생 시 로깅
    if (response.wasFailover) {
      console.info(
        `[Personality Summary] Failover occurred: ${response.failoverFrom} -> ${response.provider}`
      )
    }

    const summary = response.text.trim()

    // 7. PersonalitySummary.coreTraits 필드 업데이트
    await upsertPersonalitySummary({
      studentId,
      coreTraits: summary,
      status: "complete",
    })

    // 8. 페이지 갱신
    revalidatePath(`/students/${studentId}`)

    return ok(summary)
  } catch (error) {
    console.error("Failed to generate personality summary:", error)

    // FailoverError인 경우 상세 로깅
    if (error instanceof FailoverError) {
      console.error(
        `[Personality Summary] All providers failed (${error.totalAttempts} attempts):`,
        error.errors.map((e) => `${e.provider}: ${e.error.message}`).join("; ")
      )

      // 에러 상태 저장
      await upsertPersonalitySummary({
        studentId,
        status: "failed",
        errorMessage: error.userMessage,
      })

      return fail(error.userMessage)
    }

    // 에러 상태 저장
    await upsertPersonalitySummary({
      studentId,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "알 수 없는 오류",
    })

    return fail(error instanceof Error ? error.message : "성향 요약 생성에 실패했습니다.")
  }
}
