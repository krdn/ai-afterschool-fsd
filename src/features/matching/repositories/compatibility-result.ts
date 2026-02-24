import { Prisma } from '@/lib/db'
import { db } from "@/lib/db/client"
import type { CompatibilityScore } from "@/features/analysis"

/**
 * CompatibilityResult 생성/업데이트 페이로드
 */
/**
 * 선생님-학생 궁합 결과 생성/업데이트
 *
 * @@unique([teacherId, studentId]) 제약조건을 활용하여
 * upsert로 중복 없이 저장합니다.
 *
 * @param teacherId - 선생님 ID
 * @param studentId - 학생 ID
 * @param score - calculateCompatibilityScore 반환값
 * @returns 생성/업데이트된 CompatibilityResult
 */
export async function upsertCompatibilityResult(
  teacherId: string,
  studentId: string,
  score: CompatibilityScore
) {
  const calculatedAt = new Date()

  return db.compatibilityResult.upsert({
    where: {
      teacherId_studentId: {
        teacherId,
        studentId,
      },
    },
    update: {
      overallScore: score.overall,
      breakdown: score.breakdown as Prisma.InputJsonValue,
      reasons: score.reasons as Prisma.InputJsonValue,
      calculatedAt,
    },
    create: {
      teacherId,
      studentId,
      overallScore: score.overall,
      breakdown: score.breakdown as Prisma.InputJsonValue,
      reasons: score.reasons as Prisma.InputJsonValue,
      calculatedAt,
    },
  })
}

/**
 * 선생님-학생 궁합 결과 조회
 *
 * @param teacherId - 선생님 ID
 * @param studentId - 학생 ID
 * @returns CompatibilityResult 또는 null
 */
export async function getCompatibilityResult(
  teacherId: string,
  studentId: string
) {
  return db.compatibilityResult.findUnique({
    where: {
      teacherId_studentId: {
        teacherId,
        studentId,
      },
    },
  })
}

/**
 * 학생의 모든 선생님과의 궁합 결과 조회
 *
 * @param studentId - 학생 ID
 * @returns overallScore 내림차순 정렬된 CompatibilityResult 배열
 */
export async function getAllCompatibilityResultsForStudent(studentId: string) {
  return db.compatibilityResult.findMany({
    where: {
      studentId,
    },
    orderBy: {
      overallScore: "desc",
    },
    include: {
      teacher: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  })
}

/**
 * 선생님의 모든 학생과의 궁합 결과 조회
 *
 * @param teacherId - 선생님 ID
 * @returns overallScore 내림차순 정렬된 CompatibilityResult 배열
 */
export async function getAllCompatibilityResultsForTeacher(teacherId: string) {
  return db.compatibilityResult.findMany({
    where: {
      teacherId,
    },
    orderBy: {
      overallScore: "desc",
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          school: true,
          grade: true,
        },
      },
    },
  })
}

/**
 * 팀 내 모든 선생님-학생 궁합 결과 조회
 *
 * @param teamId - 팀 ID
 * @returns overallScore 내림차순 정렬된 CompatibilityResult 배열
 */
export async function getAllCompatibilityResultsForTeam(teamId: string) {
  return db.compatibilityResult.findMany({
    where: {
      OR: [
        {
          teacher: {
            teamId,
          },
        },
        {
          student: {
            teamId,
          },
        },
      ],
    },
    orderBy: {
      overallScore: "desc",
    },
    include: {
      teacher: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      student: {
        select: {
          id: true,
          name: true,
          school: true,
          grade: true,
        },
      },
    },
  })
}

/**
 * 궁합 결과 삭제
 *
 * @param teacherId - 선생님 ID
 * @param studentId - 학생 ID
 * @returns 삭제된 CompatibilityResult
 */
export async function deleteCompatibilityResult(
  teacherId: string,
  studentId: string
) {
  return db.compatibilityResult.delete({
    where: {
      teacherId_studentId: {
        teacherId,
        studentId,
      },
    },
  })
}
