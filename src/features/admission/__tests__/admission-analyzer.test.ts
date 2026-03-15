import { describe, it, expect } from 'vitest'
import { getProbabilityGrade, PROBABILITY_THRESHOLDS } from '../types'

describe('admission-analyzer', () => {
  describe('getProbabilityGrade', () => {
    it('80 이상이면 안정', () => {
      expect(getProbabilityGrade(80)).toBe('안정')
      expect(getProbabilityGrade(100)).toBe('안정')
    })

    it('50~79이면 적정', () => {
      expect(getProbabilityGrade(50)).toBe('적정')
      expect(getProbabilityGrade(79)).toBe('적정')
    })

    it('30~49이면 도전', () => {
      expect(getProbabilityGrade(30)).toBe('도전')
      expect(getProbabilityGrade(49)).toBe('도전')
    })

    it('30 미만이면 상향도전', () => {
      expect(getProbabilityGrade(0)).toBe('상향도전')
      expect(getProbabilityGrade(29)).toBe('상향도전')
    })
  })

  describe('PROBABILITY_THRESHOLDS', () => {
    it('올바른 기준값', () => {
      expect(PROBABILITY_THRESHOLDS.safe).toBe(80)
      expect(PROBABILITY_THRESHOLDS.moderate).toBe(50)
      expect(PROBABILITY_THRESHOLDS.challenge).toBe(30)
    })
  })
})
