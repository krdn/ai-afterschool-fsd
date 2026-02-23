import type { MbtiPercentages } from "@/features/analysis"
import type { SajuResult } from "@/features/analysis"
import type { NameNumerologyResult } from "@/features/analysis"

/**
 * 단일 대상(학생 또는 선생님)의 분석 데이터 조회 결과
 */
export type SubjectAnalyses = {
  mbti: MbtiPercentages | null
  saju: SajuResult | null
  name: NameNumerologyResult | null
}

/**
 * 선생님-학생 쌍의 분석 데이터
 */
export type PairAnalyses = {
  teacher: SubjectAnalyses
  student: SubjectAnalyses
}

/**
 * 배치 조회용: 선생님 정보 + 분석 데이터
 */
export type TeacherWithAnalyses = {
  id: string
  name: string
  role: string
  currentStudentCount: number
  analyses: SubjectAnalyses
}
