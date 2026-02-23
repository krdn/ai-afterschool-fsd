import { db as prisma } from '@/lib/db/client'
import { Prisma, SubjectType } from '@/lib/db'

/**
 * 손금 분석 결과 생성
 */
export async function createPalmAnalysis(data: {
  subjectType: SubjectType
  subjectId: string
  hand: 'left' | 'right'
  imageUrl: string
  result: unknown
  status: string
  errorMessage?: string
}) {
  return prisma.palmAnalysis.create({
    data: {
      subjectType: data.subjectType,
      subjectId: data.subjectId,
      hand: data.hand,
      imageUrl: data.imageUrl,
      result: data.result as Prisma.InputJsonValue,
      status: data.status,
      errorMessage: data.errorMessage,
      analyzedAt: new Date()
    }
  })
}

/**
 * 손금 분석 결과 생성/업데이트 (upsert)
 */
export async function upsertPalmAnalysis(data: {
  subjectType: SubjectType
  subjectId: string
  hand: 'left' | 'right'
  imageUrl: string
  result: unknown | null
  status: string
  errorMessage?: string
}) {
  return prisma.palmAnalysis.upsert({
    where: {
      subjectType_subjectId: {
        subjectType: data.subjectType,
        subjectId: data.subjectId,
      }
    },
    create: {
      subjectType: data.subjectType,
      subjectId: data.subjectId,
      hand: data.hand,
      imageUrl: data.imageUrl,
      result: data.result as Prisma.InputJsonValue,
      status: data.status,
      errorMessage: data.errorMessage,
      analyzedAt: new Date()
    },
    update: {
      hand: data.hand,
      imageUrl: data.imageUrl,
      result: data.result as Prisma.InputJsonValue,
      status: data.status,
      errorMessage: data.errorMessage,
      analyzedAt: new Date(),
      version: { increment: 1 }
    }
  })
}

/**
 * subjectType + subjectId로 손금 분석 결과 조회
 */
export async function getPalmAnalysis(subjectType: SubjectType, subjectId: string) {
  return prisma.palmAnalysis.findUnique({
    where: {
      subjectType_subjectId: {
        subjectType,
        subjectId,
      }
    }
  })
}

/**
 * 학생 ID로 손금 분석 결과 조회 (하위 호환)
 */
export async function getPalmAnalysisByStudentId(studentId: string) {
  return getPalmAnalysis('STUDENT', studentId)
}
