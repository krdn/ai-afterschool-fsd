import { Prisma } from '@/lib/db'
import { db } from "@/lib/db/client"

/**
 * VARK 설문 임시 저장 조회
 */
export async function getVarkDraft(studentId: string) {
  return db.varkSurveyDraft.findUnique({
    where: { studentId },
  })
}

/**
 * VARK 설문 임시 저장 생성/업데이트
 */
export async function upsertVarkDraft(
  studentId: string,
  responses: Prisma.InputJsonValue,
  progress: number
) {
  return db.varkSurveyDraft.upsert({
    where: { studentId },
    update: { responses, progress },
    create: { studentId, responses, progress },
  })
}

/**
 * VARK 설문 임시 저장 삭제
 */
export async function deleteVarkDraft(studentId: string) {
  return db.varkSurveyDraft.delete({
    where: { studentId },
  })
}

/**
 * VARK 분석 결과 저장/업데이트
 */
export async function upsertVarkAnalysis(
  studentId: string,
  data: {
    responses: Prisma.InputJsonValue
    scores: Prisma.InputJsonValue
    varkType: string
    percentages: Prisma.InputJsonValue
    interpretation?: string | null
    version?: number
    calculatedAt?: Date
  }
) {
  const calculatedAt = data.calculatedAt ?? new Date()
  const version = data.version ?? 1

  return db.varkAnalysis.upsert({
    where: { studentId },
    update: {
      responses: data.responses,
      scores: data.scores,
      varkType: data.varkType,
      percentages: data.percentages,
      interpretation: data.interpretation ?? null,
      version,
      calculatedAt,
    },
    create: {
      studentId,
      responses: data.responses,
      scores: data.scores,
      varkType: data.varkType,
      percentages: data.percentages,
      interpretation: data.interpretation ?? null,
      version,
      calculatedAt,
    },
  })
}

/**
 * VARK 분석 결과 조회
 */
export async function getVarkAnalysis(studentId: string) {
  return db.varkAnalysis.findUnique({
    where: { studentId },
  })
}
