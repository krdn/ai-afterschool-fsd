import { db as prisma } from '@/lib/db/client'
import { Prisma, SubjectType } from '@/lib/db'

/**
 * 관상 분석 결과 생성
 */
export async function createFaceAnalysis(data: {
  subjectType: SubjectType
  subjectId: string
  imageUrl: string
  result: unknown
  status: string
  errorMessage?: string
}) {
  return prisma.faceAnalysis.create({
    data: {
      subjectType: data.subjectType,
      subjectId: data.subjectId,
      imageUrl: data.imageUrl,
      result: data.result as Prisma.InputJsonValue,
      status: data.status,
      errorMessage: data.errorMessage,
      analyzedAt: new Date()
    }
  })
}

/**
 * 관상 분석 결과 생성/업데이트 (upsert)
 */
export async function upsertFaceAnalysis(data: {
  subjectType: SubjectType
  subjectId: string
  imageUrl: string
  result: unknown | null
  status: string
  errorMessage?: string
  usedProvider?: string
  usedModel?: string
}) {
  return prisma.faceAnalysis.upsert({
    where: {
      subjectType_subjectId: {
        subjectType: data.subjectType,
        subjectId: data.subjectId,
      }
    },
    create: {
      subjectType: data.subjectType,
      subjectId: data.subjectId,
      imageUrl: data.imageUrl,
      result: data.result as Prisma.InputJsonValue,
      status: data.status,
      errorMessage: data.errorMessage,
      usedProvider: data.usedProvider,
      usedModel: data.usedModel,
      analyzedAt: new Date()
    },
    update: {
      imageUrl: data.imageUrl,
      result: data.result as Prisma.InputJsonValue,
      status: data.status,
      errorMessage: data.errorMessage,
      usedProvider: data.usedProvider,
      usedModel: data.usedModel,
      analyzedAt: new Date(),
      version: { increment: 1 }
    }
  })
}

/**
 * subjectType + subjectId로 관상 분석 결과 조회
 */
export async function getFaceAnalysis(subjectType: SubjectType, subjectId: string) {
  return prisma.faceAnalysis.findUnique({
    where: {
      subjectType_subjectId: {
        subjectType,
        subjectId,
      }
    }
  })
}

/**
 * 학생 ID로 관상 분석 결과 조회 (하위 호환)
 */
export async function getFaceAnalysisByStudentId(studentId: string) {
  return getFaceAnalysis('STUDENT', studentId)
}
