import { describe, it, expect } from 'vitest';
import { buildCondition } from '../condition-builder';
import type { NeuroscienceCondition } from '../types';

describe('buildCondition', () => {
  it('프로필만 있을 때 컨텍스트 문자열에 학생 정보가 포함된다', () => {
    const condition: NeuroscienceCondition = {
      profile: {
        studentId: 'stu-1',
        name: '김철수',
        age: 10,
        grade: 3,
        varkType: 'A',
        mbtiType: 'ENFP',
        sajuTraits: null,
        personalitySummary: '활발하고 창의적',
      },
    };

    const result = buildCondition(condition);

    expect(result.contextString).toContain('김철수');
    expect(result.contextString).toContain('3학년');
    expect(result.contextString).toContain('청각형');
    expect(result.contextString).toContain('ENFP');
    expect(result.hash).toBeTruthy();
  });

  it('모든 조건이 있을 때 4개 섹션이 모두 포함된다', () => {
    const condition: NeuroscienceCondition = {
      profile: {
        studentId: 'stu-1', name: '이영희', age: 16, grade: 2,
        varkType: 'V', mbtiType: 'INTJ', sajuTraits: null, personalitySummary: null,
      },
      situation: {
        subject: '수학', difficulty: 'hard', timeOfDay: 'afternoon',
        fatigueLevel: 'high', concentrationLevel: 'low', studyDuration: 60,
      },
      goal: { type: 'problem_solving', specificTopic: '이차방정식' },
      gradeContext: {
        recentTrend: 'declining', weakSubjects: ['수학'], strongSubjects: ['영어'],
        averageScore: 72,
      },
    };

    const result = buildCondition(condition);

    expect(result.contextString).toContain('학생 프로필');
    expect(result.contextString).toContain('학습 상황');
    expect(result.contextString).toContain('학습 목표');
    expect(result.contextString).toContain('성적');
  });

  it('빈 조건일 때도 에러 없이 동작한다', () => {
    const result = buildCondition({});
    expect(result.contextString).toBeTruthy();
    expect(result.hash).toBeTruthy();
  });

  it('같은 조건은 같은 해시를 생성한다', () => {
    const condition: NeuroscienceCondition = {
      situation: { subject: '영어', difficulty: 'easy', timeOfDay: 'morning' },
    };
    const r1 = buildCondition(condition);
    const r2 = buildCondition(condition);
    expect(r1.hash).toBe(r2.hash);
  });

  it('다른 조건은 다른 해시를 생성한다', () => {
    const r1 = buildCondition({ situation: { subject: '영어', difficulty: 'easy', timeOfDay: 'morning' } });
    const r2 = buildCondition({ situation: { subject: '수학', difficulty: 'easy', timeOfDay: 'morning' } });
    expect(r1.hash).not.toBe(r2.hash);
  });
});
