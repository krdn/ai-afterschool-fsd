import { Prisma } from '@/lib/db'
import { db } from "@/lib/db/client"

/**
 * 별자리 분석 결과 조회
 */
export async function getZodiacAnalysis(studentId: string) {
  return db.zodiacAnalysis.findUnique({
    where: { studentId },
  })
}

/**
 * 별자리 분석 결과 저장/업데이트
 */
export async function upsertZodiacAnalysis(
  studentId: string,
  data: {
    zodiacSign: string
    zodiacName: string
    element: string
    traits: Prisma.InputJsonValue
    interpretation?: string | null
    version?: number
    calculatedAt?: Date
  }
) {
  const calculatedAt = data.calculatedAt ?? new Date()
  const version = data.version ?? 1

  return db.zodiacAnalysis.upsert({
    where: { studentId },
    update: {
      zodiacSign: data.zodiacSign,
      zodiacName: data.zodiacName,
      element: data.element,
      traits: data.traits,
      interpretation: data.interpretation ?? null,
      version,
      calculatedAt,
    },
    create: {
      studentId,
      zodiacSign: data.zodiacSign,
      zodiacName: data.zodiacName,
      element: data.element,
      traits: data.traits,
      interpretation: data.interpretation ?? null,
      version,
      calculatedAt,
    },
  })
}
