import { describe, it, expect } from 'vitest'
import { analyzeTrend } from '../services/trend-analyzer'

describe('trend-analyzer', () => {
  it('연도별 커트라인을 추세 데이터로 변환', () => {
    const cutoffs = [
      { academicYear: 2023, admissionType: '수시_학생부교과', cutoffGrade: 2.0, cutoffScore: null, competitionRate: 4.5, enrollmentCount: 30 },
      { academicYear: 2024, admissionType: '수시_학생부교과', cutoffGrade: 1.8, cutoffScore: null, competitionRate: 5.0, enrollmentCount: 28 },
      { academicYear: 2025, admissionType: '수시_학생부교과', cutoffGrade: 1.5, cutoffScore: null, competitionRate: 5.5, enrollmentCount: 25 },
    ]
    const result = analyzeTrend(cutoffs, '수시_학생부교과')
    expect(result.trends).toHaveLength(3)
    expect(result.trends[0].academicYear).toBe(2023)
    expect(result.direction).toBe('HARDER')
  })

  it('데이터 없으면 빈 추세', () => {
    const result = analyzeTrend([], '정시_가군')
    expect(result.trends).toHaveLength(0)
    expect(result.direction).toBe('UNKNOWN')
  })

  it('데이터 1개면 UNKNOWN', () => {
    const cutoffs = [
      { academicYear: 2025, admissionType: '정시_가군', cutoffGrade: null, cutoffScore: 290, competitionRate: 3.0, enrollmentCount: 20 },
    ]
    const result = analyzeTrend(cutoffs, '정시_가군')
    expect(result.trends).toHaveLength(1)
    expect(result.direction).toBe('UNKNOWN')
  })

  it('수능 점수 기준 추세 분석', () => {
    const cutoffs = [
      { academicYear: 2023, admissionType: '정시_가군', cutoffGrade: null, cutoffScore: 280, competitionRate: 3.0, enrollmentCount: 20 },
      { academicYear: 2025, admissionType: '정시_가군', cutoffGrade: null, cutoffScore: 290, competitionRate: 3.5, enrollmentCount: 20 },
    ]
    const result = analyzeTrend(cutoffs, '정시_가군')
    expect(result.direction).toBe('HARDER')
  })
})
