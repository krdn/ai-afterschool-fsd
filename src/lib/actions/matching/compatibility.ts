"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db/client"
import { verifySession } from "@/lib/dal"
import { calculateCompatibilityScore, type CompatibilityScore } from "@/features/analysis"
import { upsertCompatibilityResult } from '@/features/matching'
import { fetchPairAnalyses } from '@/features/matching'
import { ok, fail, type ActionResult } from "@/lib/errors/action-result"

/**
 * 선생님-학생 궁합 분석 실행
 *
 * Teacher와 Student의 분석 데이터를 조회하여 궁합 점수를 계산하고 DB에 저장합니다.
 * RBAC: 본인 팀 데이터만 접근 가능 (verifySession의 RLS 필터링 활용)
 *
 * @param teacherId - 선생님 ID
 * @param studentId - 학생 ID
 * @returns 궁합 점수 결과
 */
export async function analyzeCompatibility(
  teacherId: string,
  studentId: string
): Promise<ActionResult<{ score: CompatibilityScore }>> {
  await verifySession()

  const teacher = await db.teacher.findUnique({
    where: { id: teacherId },
    select: {
      id: true,
      _count: {
        select: {
          students: true,
        },
      },
    },
  })

  if (!teacher) {
    return fail("선생님을 찾을 수 없어요.")
  }

  // 공유 함수로 분석 데이터 일괄 조회
  const { teacher: teacherAnalyses, student: studentAnalyses } =
    await fetchPairAnalyses(teacherId, studentId)

  // 궁합 점수 계산
  const score = calculateCompatibilityScore(
    {
      mbti: teacherAnalyses.mbti,
      saju: teacherAnalyses.saju,
      name: teacherAnalyses.name,
      currentLoad: teacher._count.students,
    },
    {
      mbti: studentAnalyses.mbti,
      saju: studentAnalyses.saju,
      name: studentAnalyses.name,
    }
  )

  // DB 저장
  await upsertCompatibilityResult(teacherId, studentId, score)

  // 캐시 무효화
  revalidatePath(`/students/${studentId}`)
  revalidatePath(`/teachers/${teacherId}`)

  return ok({ score })
}

/**
 * 다수 학생에 대해 궁합 분석 일괄 실행
 */
export async function batchAnalyzeCompatibility(
  studentIds: string[]
): Promise<ActionResult<{ results: { studentId: string; results: ActionResult<{ score: CompatibilityScore }>[] }[] }>> {
  await verifySession()

  const teachers = await db.teacher.findMany({
    select: {
      id: true,
    },
  })

  if (teachers.length === 0) {
    return fail("팀에 선생님이 없어요.")
  }

  const results = await Promise.all(
    studentIds.map(async (studentId) => {
      const compatibilityResults = await Promise.all(
        teachers.map((teacher) =>
          analyzeCompatibility(teacher.id, studentId).catch((error) => {
            console.error(
              `궁합 분석 실패 (Teacher: ${teacher.id}, Student: ${studentId}):`,
              error
            )
            return null
          })
        )
      )

      return {
        studentId,
        results: compatibilityResults.filter((r) => r !== null),
      }
    })
  )

  return ok({ results })
}
