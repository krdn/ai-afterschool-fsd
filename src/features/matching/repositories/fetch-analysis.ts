import { db } from "@/lib/db/client"
import type { SubjectType } from '@/lib/db'
import type { SubjectAnalyses } from "./types"
import {
  parseMbtiPercentages,
  parseSajuResult,
  parseNameNumerology,
} from "./type-guards"

/**
 * 단일 대상의 분석 데이터(MBTI, 사주, 이름)를 일괄 조회
 *
 * 3개의 분석 테이블을 Promise.all로 병렬 조회하고,
 * 타입 가드를 통해 안전하게 파싱된 결과를 반환한다.
 *
 * @param subjectId - 대상 ID (학생 또는 선생님)
 * @param subjectType - 대상 타입 ('STUDENT' | 'TEACHER')
 * @returns 파싱된 분석 결과 (없으면 각 필드가 null)
 */
export async function fetchSubjectAnalyses(
  subjectId: string,
  subjectType: SubjectType
): Promise<SubjectAnalyses> {
  const [mbtiRow, sajuRow, nameRow] = await Promise.all([
    db.mbtiAnalysis.findUnique({
      where: { subjectType_subjectId: { subjectType, subjectId } },
      select: { percentages: true },
    }),
    db.sajuAnalysis.findUnique({
      where: { subjectType_subjectId: { subjectType, subjectId } },
      select: { result: true },
    }),
    db.nameAnalysis.findUnique({
      where: { subjectType_subjectId: { subjectType, subjectId } },
      select: { result: true },
    }),
  ])

  return {
    mbti: parseMbtiPercentages(mbtiRow?.percentages),
    saju: parseSajuResult(sajuRow?.result),
    name: parseNameNumerology(nameRow?.result),
  }
}

/**
 * 여러 대상의 분석 데이터를 배치 조회
 *
 * findMany + Map 변환으로 N+1 쿼리를 방지한다.
 *
 * @param subjectIds - 대상 ID 배열
 * @param subjectType - 대상 타입 ('STUDENT' | 'TEACHER')
 * @returns subjectId → SubjectAnalyses 매핑
 */
export async function fetchBatchAnalyses(
  subjectIds: string[],
  subjectType: SubjectType
): Promise<Map<string, SubjectAnalyses>> {
  if (subjectIds.length === 0) return new Map()

  const [mbtis, sajus, names] = await Promise.all([
    db.mbtiAnalysis.findMany({
      where: { subjectType, subjectId: { in: subjectIds } },
      select: { subjectId: true, percentages: true },
    }),
    db.sajuAnalysis.findMany({
      where: { subjectType, subjectId: { in: subjectIds } },
      select: { subjectId: true, result: true },
    }),
    db.nameAnalysis.findMany({
      where: { subjectType, subjectId: { in: subjectIds } },
      select: { subjectId: true, result: true },
    }),
  ])

  const mbtiMap = new Map(mbtis.map((m) => [m.subjectId, m.percentages]))
  const sajuMap = new Map(sajus.map((s) => [s.subjectId, s.result]))
  const nameMap = new Map(names.map((n) => [n.subjectId, n.result]))

  const result = new Map<string, SubjectAnalyses>()

  for (const id of subjectIds) {
    result.set(id, {
      mbti: parseMbtiPercentages(mbtiMap.get(id)),
      saju: parseSajuResult(sajuMap.get(id)),
      name: parseNameNumerology(nameMap.get(id)),
    })
  }

  return result
}

/**
 * 선생님-학생 쌍의 분석 데이터를 일괄 조회
 *
 * 두 대상을 Promise.all로 병렬 조회하여 지연을 최소화한다.
 *
 * @param teacherId - 선생님 ID
 * @param studentId - 학생 ID
 * @returns 선생님과 학생 각각의 분석 결과
 */
export async function fetchPairAnalyses(
  teacherId: string,
  studentId: string
): Promise<{ teacher: SubjectAnalyses; student: SubjectAnalyses }> {
  const [teacher, student] = await Promise.all([
    fetchSubjectAnalyses(teacherId, "TEACHER"),
    fetchSubjectAnalyses(studentId, "STUDENT"),
  ])

  return { teacher, student }
}
