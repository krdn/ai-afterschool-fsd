/**
 * 공정성 메트릭 모듈
 *
 * 알고리즘적 편향을 검증하기 위한 공정성 메트릭을 계산합니다.
 * - Disparity Index: 집단 간 궁합 점수 차이
 * - ABROCA: 궁합 점수 분포 편향 (histogram 기반)
 * - Distribution Balance: 선생님별 배정 균형
 *
 * 모든 함수는 순수 함수입니다 (DB 의존성 없음).
 */

import type { Assignment, FairnessMetrics } from "./types"

/**
 * 공정성 메트릭 계산
 *
 * @param assignments - 배정 목록 (studentId, teacherId, score)
 * @param studentGroupMap - 학생별 그룹 매핑 (학교 등). 없으면 disparity는 0
 */
export function calculateFairnessMetrics(
  assignments: Assignment[],
  studentGroupMap?: Map<string, string>
): FairnessMetrics {
  const disparityIndex = studentGroupMap
    ? calculateDisparityIndex(assignments, studentGroupMap)
    : 0
  const abroca = calculateABROCA(assignments)
  const distributionBalance = calculateDistributionBalance(assignments)

  const recommendations = generateFairnessRecommendations({
    disparityIndex,
    abroca,
    distributionBalance,
  })

  return { disparityIndex, abroca, distributionBalance, recommendations }
}

/**
 * Disparity Index 계산 (집단 간 궁합 점수 차이)
 *
 * 그룹별 평균 궁합 점수의 최대-최소 차이를 계산합니다.
 * 0에 가까울수록 공정, 1에 가까울수록 불공정
 */
export function calculateDisparityIndex(
  assignments: Assignment[],
  studentGroupMap: Map<string, string>
): number {
  if (assignments.length === 0) return 0

  const groupScores = new Map<string, number[]>()
  for (const assignment of assignments) {
    const group = studentGroupMap.get(assignment.studentId)
    if (!group) continue
    const scores = groupScores.get(group) ?? []
    scores.push(assignment.score)
    groupScores.set(group, scores)
  }

  const groupAverages: number[] = []
  for (const [, scores] of groupScores) {
    if (scores.length > 0) {
      groupAverages.push(scores.reduce((sum, s) => sum + s, 0) / scores.length)
    }
  }

  if (groupAverages.length < 2) return 0

  const maxScore = Math.max(...groupAverages)
  const minScore = Math.min(...groupAverages)

  return Math.min(1, Math.max(0, (maxScore - minScore) / 100))
}

/**
 * ABROCA 계산 (점수 분포 편향)
 *
 * 히스토그램 기반 L1 distance로 분포 편향 측정.
 * 0에 가까울수록 공정, 1에 가까울수록 불공정
 */
export function calculateABROCA(assignments: Assignment[]): number {
  if (assignments.length === 0) return 0

  const scores = assignments.map((a) => a.score)
  const bins = 10
  const binSize = 100 / bins

  const histogram = new Array(bins).fill(0)
  for (const score of scores) {
    const binIndex = Math.min(Math.floor(score / binSize), bins - 1)
    histogram[binIndex]++
  }

  const idealCount = scores.length / bins
  let l1Distance = 0
  for (const count of histogram) {
    l1Distance += Math.abs(count - idealCount)
  }

  const maxL1Distance = 2 * scores.length
  return Math.min(1, Math.max(0, l1Distance / maxL1Distance))
}

/**
 * Distribution Balance 계산 (선생님별 배정 균형)
 *
 * 표준편차 기반 배정 분포 균형 측정.
 * 1에 가까울수록 공정, 0에 가까울수록 불공정
 */
export function calculateDistributionBalance(assignments: Assignment[]): number {
  if (assignments.length === 0) return 1

  const teacherCounts = new Map<string, number>()
  for (const assignment of assignments) {
    teacherCounts.set(
      assignment.teacherId,
      (teacherCounts.get(assignment.teacherId) || 0) + 1
    )
  }

  const counts = Array.from(teacherCounts.values())
  if (counts.length === 0) return 1

  const mean = counts.reduce((sum, c) => sum + c, 0) / counts.length
  if (mean === 0) return 1

  const variance =
    counts.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / counts.length
  const stdDev = Math.sqrt(variance)

  return Math.min(1, Math.max(0, 1 - stdDev / mean))
}

function generateFairnessRecommendations(
  metrics: Pick<FairnessMetrics, "disparityIndex" | "abroca" | "distributionBalance">
): string[] {
  const recommendations: string[] = []

  if (metrics.disparityIndex > 0.2) {
    recommendations.push(
      "학교 간 궁합 점수 차이가 큽니다. 가중치 재조정을 검토하세요."
    )
  }
  if (metrics.abroca > 0.3) {
    recommendations.push(
      "궁합 점수 분포가 편향되어 있습니다. 알고리즘 검토가 필요합니다."
    )
  }
  if (metrics.distributionBalance < 0.7) {
    recommendations.push(
      "선생님별 배정 분포가 불균형합니다. 부하 분산 가중치를 높이세요."
    )
  }
  if (recommendations.length === 0) {
    recommendations.push("공정성 메트릭이 정상 범위입니다.")
  }

  return recommendations
}
