import { Prisma } from '@/lib/db'
import { db } from "@/lib/db/client"

/**
 * 통합 성향 데이터 타입
 * 5개 분석(사주, 성명, MBTI, 관상, 손금)의 결과를 통합하여 반환
 */
export type UnifiedPersonalityData = {
  saju: {
    result: unknown | null
    calculatedAt: Date | null
    interpretation: string | null
  }
  name: {
    result: unknown | null
    calculatedAt: Date | null
    interpretation: string | null
  }
  mbti: {
    result: {
      mbtiType: string
      percentages: Record<string, number>
    } | null
    calculatedAt: Date | null
  }
  face: {
    result: unknown | null
    analyzedAt: Date | null
  }
  palm: {
    result: unknown | null
    analyzedAt: Date | null
  }
}

/**
 * 학생의 모든 성향 분석 데이터를 통합하여 조회
 * 일부 분석이 누락되어도 에러 없이 null 값을 포함하여 반환
 *
 * @param studentId - 학생 ID
 * @param teacherId - 교사 ID (보안 검증용)
 * @returns 통합 성향 데이터 또는 null (학생을 찾지 못한 경우)
 */
export async function getUnifiedPersonalityData(
  studentId: string,
  teacherId: string
): Promise<UnifiedPersonalityData | null> {
  // 학생 소유권 확인
  const student = await db.student.findFirst({
    where: {
      id: studentId,
      teacherId,
    },
    select: { id: true },
  })

  if (!student) return null

  // 분석 데이터 일괄 조회 (통합 테이블)
  const [sajuAnalysis, nameAnalysis, mbtiAnalysis, faceAnalysis, palmAnalysis] = await Promise.all([
    db.sajuAnalysis.findUnique({
      where: { subjectType_subjectId: { subjectType: 'STUDENT', subjectId: studentId } },
    }),
    db.nameAnalysis.findUnique({
      where: { subjectType_subjectId: { subjectType: 'STUDENT', subjectId: studentId } },
    }),
    db.mbtiAnalysis.findUnique({
      where: { subjectType_subjectId: { subjectType: 'STUDENT', subjectId: studentId } },
    }),
    db.faceAnalysis.findUnique({
      where: { subjectType_subjectId: { subjectType: 'STUDENT', subjectId: studentId } },
    }),
    db.palmAnalysis.findUnique({
      where: { subjectType_subjectId: { subjectType: 'STUDENT', subjectId: studentId } },
    }),
  ])

  return {
    saju: {
      result: sajuAnalysis?.result ?? null,
      calculatedAt: sajuAnalysis?.calculatedAt ?? null,
      interpretation: sajuAnalysis?.interpretation ?? null,
    },
    name: {
      result: nameAnalysis?.result ?? null,
      calculatedAt: nameAnalysis?.calculatedAt ?? null,
      interpretation: nameAnalysis?.interpretation ?? null,
    },
    mbti: {
      result: mbtiAnalysis
        ? {
            mbtiType: mbtiAnalysis.mbtiType,
            percentages: mbtiAnalysis.percentages as Record<string, number>,
          }
        : null,
      calculatedAt: mbtiAnalysis?.calculatedAt ?? null,
    },
    face: {
      result: faceAnalysis?.result ?? null,
      analyzedAt: faceAnalysis?.analyzedAt ?? null,
    },
    palm: {
      result: palmAnalysis?.result ?? null,
      analyzedAt: palmAnalysis?.analyzedAt ?? null,
    },
  }
}

/**
 * 학생의 AI 통합 분석 요약을 조회
 *
 * @param studentId - 학생 ID
 * @returns PersonalitySummary 또는 null
 */
export async function getPersonalitySummary(
  studentId: string
) {
  return db.personalitySummary.findUnique({
    where: { studentId },
  })
}

/**
 * 학생의 AI 통합 분석 이력을 조회
 * 최신 순으로 정렬되어 반환
 *
 * @param studentId - 학생 ID
 * @returns PersonalitySummaryHistory 목록 (빈 배열 가능)
 */
export async function getPersonalitySummaryHistory(
  studentId: string
) {
  return db.personalitySummaryHistory.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
  })
}

/**
 * PersonalitySummary upsert 페이로드 타입
 */
export type PersonalitySummaryUpsertPayload = {
  studentId: string
  coreTraits?: string | null
  learningStrategy?: Prisma.InputJsonValue | null
  careerGuidance?: Prisma.InputJsonValue | null
  status?: string
  errorMessage?: string | null
  generatedAt?: Date
}

/**
 * AI 통합 분석 요약을 생성 또는 갱신
 * 업데이트 시 과거 이력을 PersonalitySummaryHistory에 자동 저장
 *
 * @param payload - 업서트 페이로드
 * @returns 생성 또는 갱신된 PersonalitySummary
 */
export async function upsertPersonalitySummary(
  payload: PersonalitySummaryUpsertPayload
) {
  const {
    studentId,
    coreTraits,
    learningStrategy,
    careerGuidance,
    status,
    errorMessage,
    generatedAt,
  } = payload

  // 기존 레코드 조회 (이력 저장용)
  const existing = await db.personalitySummary.findUnique({
    where: { studentId },
  })

  // 업데이트 시 기존 데이터를 이력에 저장
  if (existing && (existing.coreTraits || existing.learningStrategy || existing.careerGuidance)) {
    await db.personalitySummaryHistory.create({
      data: {
        studentId,
        coreTraits: existing.coreTraits,
        learningStrategy: existing.learningStrategy as Prisma.InputJsonValue,
        careerGuidance: existing.careerGuidance as Prisma.InputJsonValue,
        version: existing.version,
        generatedAt: existing.generatedAt,
      },
    })
  }

  // 데이터 매핑
  const data = {
    coreTraits: coreTraits ?? undefined,
    learningStrategy: learningStrategy !== undefined ? learningStrategy as Prisma.InputJsonValue : undefined,
    careerGuidance: careerGuidance !== undefined ? careerGuidance as Prisma.InputJsonValue : undefined,
    status: status ?? undefined,
    errorMessage: errorMessage ?? undefined,
    generatedAt: generatedAt ?? new Date(),
    // 기존 레코드가 있으면 version 증가, 없으면 1
    version: existing ? existing.version + 1 : 1,
  }

  // upsert 실행
  return db.personalitySummary.upsert({
    where: { studentId },
    create: {
      studentId,
      ...data,
    },
    update: data,
  })
}
