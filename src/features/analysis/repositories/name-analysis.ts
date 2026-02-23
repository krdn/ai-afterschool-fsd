import { Prisma, SubjectType } from '@/lib/db'
import { db } from "@/lib/db/client"

/**
 * 이름 분석 결과 조회
 */
export async function getNameAnalysis(subjectType: SubjectType, subjectId: string) {
  return db.nameAnalysis.findUnique({
    where: {
      subjectType_subjectId: {
        subjectType,
        subjectId,
      }
    },
  })
}

/**
 * 학생 ID로 이름 분석 결과 조회 (하위 호환)
 */
export async function getNameAnalysisByStudentId(studentId: string) {
  return getNameAnalysis('STUDENT', studentId)
}

/**
 * 이름 분석 결과 저장/업데이트
 */
export async function upsertNameAnalysisGeneric(
  subjectType: SubjectType,
  subjectId: string,
  data: {
    inputSnapshot: Prisma.InputJsonValue
    result: Prisma.InputJsonValue
    interpretation?: string | null
    version?: number
    calculatedAt?: Date
  }
) {
  const calculatedAt = data.calculatedAt ?? new Date()
  const version = data.version ?? 1

  return db.nameAnalysis.upsert({
    where: {
      subjectType_subjectId: {
        subjectType,
        subjectId,
      }
    },
    update: {
      inputSnapshot: data.inputSnapshot,
      result: data.result,
      interpretation: data.interpretation ?? null,
      version,
      calculatedAt,
    },
    create: {
      subjectType,
      subjectId,
      inputSnapshot: data.inputSnapshot,
      result: data.result,
      interpretation: data.interpretation ?? null,
      version,
      calculatedAt,
    },
  })
}
