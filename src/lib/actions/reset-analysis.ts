'use server'

import { db } from "@/lib/db/client"
import { verifySession } from "@/lib/dal"
import { revalidatePath } from "next/cache"
import { okVoid, fail, type ActionVoidResult } from "@/lib/errors/action-result"
import { logger } from "@/lib/logger"

export type AnalysisType = "saju" | "face" | "palm" | "mbti" | "vark" | "name" | "zodiac"
export type SubjectType = "STUDENT" | "TEACHER"

/**
 * 분석 결과 초기화 (이력은 유지)
 * - 현재 결과 테이블 레코드만 삭제
 * - MBTI, VARK는 SurveyDraft도 함께 삭제
 */
export async function resetAnalysis(
  analysisType: AnalysisType,
  subjectType: SubjectType,
  subjectId: string,
): Promise<ActionVoidResult> {
  const session = await verifySession()

  // 권한 체크: TEACHER는 본인 학생만, STUDENT는 본인만
  if (subjectType === "STUDENT" && session.role === "TEACHER") {
    const student = await db.student.findFirst({
      where: { id: subjectId, teacherId: session.userId },
      select: { id: true },
    })
    if (!student) return fail("접근 권한이 없어요.")
  }

  if (subjectType === "TEACHER" && session.role === "TEACHER") {
    if (subjectId !== session.userId) return fail("접근 권한이 없어요.")
  }

  // VARK, 별자리는 학생만 지원
  if (subjectType === "TEACHER" && (analysisType === "vark" || analysisType === "zodiac")) {
    return fail("선생님은 해당 분석을 지원하지 않아요.")
  }

  try {
    switch (analysisType) {
      case "saju":
        await db.sajuAnalysis.deleteMany({ where: { subjectType, subjectId } })
        break
      case "face":
        await db.faceAnalysis.deleteMany({ where: { subjectType, subjectId } })
        break
      case "palm":
        await db.palmAnalysis.deleteMany({ where: { subjectType, subjectId } })
        break
      case "mbti":
        await db.mbtiAnalysis.deleteMany({ where: { subjectType, subjectId } })
        if (subjectType === "STUDENT") {
          await db.mbtiSurveyDraft.deleteMany({ where: { studentId: subjectId } })
        }
        break
      case "vark":
        await db.varkAnalysis.deleteMany({ where: { studentId: subjectId } })
        await db.varkSurveyDraft.deleteMany({ where: { studentId: subjectId } })
        break
      case "name":
        await db.nameAnalysis.deleteMany({ where: { subjectType, subjectId } })
        break
      case "zodiac":
        await db.zodiacAnalysis.deleteMany({ where: { studentId: subjectId } })
        break
    }

    // 캐시 무효화
    if (subjectType === "STUDENT") {
      revalidatePath(`/students/${subjectId}`)
    } else {
      revalidatePath(`/teachers/${subjectId}`)
    }

    return okVoid()
  } catch (e) {
    logger.error({ err: e }, 'resetAnalysis error')
    return fail("초기화 중 오류가 발생했어요.")
  }
}
