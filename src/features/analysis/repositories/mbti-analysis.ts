import { Prisma, SubjectType } from '@/lib/db'
import { db } from "@/lib/db/client"

/**
 * MBTI 설문 임시 저장 조회
 */
export async function getMbtiDraft(studentId: string) {
  return db.mbtiSurveyDraft.findUnique({
    where: { studentId },
  })
}

/**
 * MBTI 설문 임시 저장 생성/업데이트
 */
export async function upsertMbtiDraft(
  studentId: string,
  responses: Prisma.InputJsonValue,
  progress: number
) {
  return db.mbtiSurveyDraft.upsert({
    where: { studentId },
    update: {
      responses,
      progress,
    },
    create: {
      studentId,
      responses,
      progress,
    },
  })
}

/**
 * MBTI 설문 임시 저장 삭제
 */
export async function deleteMbtiDraft(studentId: string) {
  return db.mbtiSurveyDraft.delete({
    where: { studentId },
  })
}

/**
 * MBTI 분석 결과 저장/업데이트 (통합)
 */
export async function upsertMbtiAnalysisGeneric(
  subjectType: SubjectType,
  subjectId: string,
  data: {
    responses: Prisma.InputJsonValue
    scores: Prisma.InputJsonValue
    mbtiType: string
    percentages: Prisma.InputJsonValue
    interpretation?: string | null
    version?: number
    calculatedAt?: Date
  }
) {
  const calculatedAt = data.calculatedAt ?? new Date()
  const version = data.version ?? 1

  return db.mbtiAnalysis.upsert({
    where: {
      subjectType_subjectId: {
        subjectType,
        subjectId,
      }
    },
    update: {
      responses: data.responses,
      scores: data.scores,
      mbtiType: data.mbtiType,
      percentages: data.percentages,
      interpretation: data.interpretation ?? null,
      version,
      calculatedAt,
    },
    create: {
      subjectType,
      subjectId,
      responses: data.responses,
      scores: data.scores,
      mbtiType: data.mbtiType,
      percentages: data.percentages,
      interpretation: data.interpretation ?? null,
      version,
      calculatedAt,
    },
  })
}

/**
 * 학생 MBTI 분석 결과 저장/업데이트 (하위 호환)
 */
export async function upsertMbtiAnalysis(
  studentId: string,
  data: {
    responses: Prisma.InputJsonValue
    scores: Prisma.InputJsonValue
    mbtiType: string
    percentages: Prisma.InputJsonValue
    interpretation?: string | null
    version?: number
    calculatedAt?: Date
  }
) {
  return upsertMbtiAnalysisGeneric('STUDENT', studentId, data)
}

/**
 * MBTI 분석 결과 조회 (통합)
 */
export async function getMbtiAnalysisGeneric(subjectType: SubjectType, subjectId: string) {
  return db.mbtiAnalysis.findUnique({
    where: {
      subjectType_subjectId: {
        subjectType,
        subjectId,
      }
    },
  })
}

/**
 * 학생 MBTI 분석 결과 조회 (하위 호환)
 */
export async function getMbtiAnalysis(studentId: string) {
  return getMbtiAnalysisGeneric('STUDENT', studentId)
}
