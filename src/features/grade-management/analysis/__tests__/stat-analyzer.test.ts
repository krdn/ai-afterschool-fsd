import { describe, it, expect } from 'vitest';
import {
  analyzeSubjectStrengths,
  analyzeCategoryWeakness,
  calculateConsistencyScore,
} from '../stat-analyzer';

describe('StatAnalyzer', () => {
  describe('analyzeSubjectStrengths', () => {
    it('평균 점수 기준으로 강점/약점 과목을 분류한다', () => {
      const grades = [
        { subject: '국어', normalizedScore: 90, testDate: new Date() },
        { subject: '국어', normalizedScore: 88, testDate: new Date() },
        { subject: '수학', normalizedScore: 60, testDate: new Date() },
        { subject: '수학', normalizedScore: 55, testDate: new Date() },
        { subject: '영어', normalizedScore: 75, testDate: new Date() },
      ];

      const result = analyzeSubjectStrengths(grades);
      const korean = result.find(s => s.name === '국어');
      const math = result.find(s => s.name === '수학');

      expect(korean?.strength).toBe(true);
      expect(math?.strength).toBe(false);
    });
  });

  describe('analyzeCategoryWeakness', () => {
    it('category별 평균을 계산하여 약한 단원을 식별한다', () => {
      const grades = [
        { subject: '수학', category: '미적분', normalizedScore: 90 },
        { subject: '수학', category: '확률통계', normalizedScore: 50 },
        { subject: '수학', category: '확률통계', normalizedScore: 55 },
      ];

      const result = analyzeCategoryWeakness(grades, '수학');
      expect(result.weakCategories).toContain('확률통계');
      expect(result.strongCategories).toContain('미적분');
    });
  });

  describe('calculateConsistencyScore', () => {
    it('매일 균등하게 공부하면 높은 점수를 준다', () => {
      const logs = Array.from({ length: 25 }, (_, i) => ({
        studyDate: new Date(2026, 1, i + 1),
        durationMin: 60,
      }));

      const score = calculateConsistencyScore(logs, 30);
      expect(score).toBeGreaterThan(70);
    });

    it('공부 기록이 없으면 0점이다', () => {
      const score = calculateConsistencyScore([], 30);
      expect(score).toBe(0);
    });
  });
});
