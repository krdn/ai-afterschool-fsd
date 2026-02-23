import { Prisma } from '@/lib/db'
import { db } from "@/lib/db/client"

// ---------------------------------------------------------------------------
// 선생님 사주 분석 이력
// ---------------------------------------------------------------------------

export type TeacherSajuHistoryPayload = {
  teacherId: string
  promptId: string
  additionalRequest?: string | null
  result: Prisma.InputJsonValue
  interpretation?: string | null
  usedProvider: string
  usedModel?: string | null
  calculatedAt?: Date
}

export async function createTeacherSajuHistory(payload: TeacherSajuHistoryPayload) {
  return db.teacherSajuAnalysisHistory.create({
    data: {
      teacherId: payload.teacherId,
      promptId: payload.promptId,
      additionalRequest: payload.additionalRequest ?? null,
      result: payload.result,
      interpretation: payload.interpretation ?? null,
      usedProvider: payload.usedProvider,
      usedModel: payload.usedModel ?? null,
      calculatedAt: payload.calculatedAt ?? new Date(),
    },
  })
}

export async function getTeacherSajuHistoryList(teacherId: string) {
  return db.teacherSajuAnalysisHistory.findMany({
    where: { teacherId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      promptId: true,
      additionalRequest: true,
      usedProvider: true,
      usedModel: true,
      calculatedAt: true,
      createdAt: true,
      interpretation: true,
    },
  })
}

export async function getTeacherSajuHistoryDetail(historyId: string) {
  return db.teacherSajuAnalysisHistory.findUnique({
    where: { id: historyId },
  })
}
