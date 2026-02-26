/**
 * OCR 검증기 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  validateTranscriptResult,
  validateMockExamResult,
  calculateOverallConfidence,
} from '../ocr-validator';

// =============================================================================
// 테스트 데이터
// =============================================================================

const validTranscriptData = {
  documentInfo: {
    school: '서울고등학교',
    studentName: '김철수',
    grade: 2,
    academicYear: 2025,
    semester: 1,
  },
  subjects: [
    {
      name: '국어',
      rawScore: 85,
      classAverage: 72.5,
      standardDev: 12.3,
      gradeRank: 2,
      classRank: 5,
      totalStudents: 35,
      category: '국어',
      confidence: 0.95,
    },
    {
      name: '수학',
      rawScore: 92,
      classAverage: 68.0,
      standardDev: 15.1,
      gradeRank: 1,
      classRank: 2,
      totalStudents: 35,
      category: '수학',
      confidence: 0.98,
    },
  ],
};

const validMockExamData = {
  examInfo: {
    examName: '2025학년도 6월 모의고사',
    examDate: '2025-06-05',
    studentName: '김철수',
  },
  subjects: [
    {
      name: '국어',
      rawScore: 88,
      standardScore: 135,
      percentile: 96,
      gradeRank: 1,
      confidence: 0.97,
    },
    {
      name: '수학',
      rawScore: 92,
      standardScore: 140,
      percentile: 98,
      gradeRank: 1,
      confidence: 0.95,
    },
  ],
};

// =============================================================================
// 성적통지표 검증 테스트
// =============================================================================

describe('validateTranscriptResult', () => {
  it('유효한 데이터는 검증을 통과해야 함', () => {
    const result = validateTranscriptResult(validTranscriptData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.documentInfo.school).toBe('서울고등학교');
      expect(result.data.subjects).toHaveLength(2);
    }
  });

  it('원점수가 100을 초과하면 검증에 실패해야 함', () => {
    const invalidData = {
      ...validTranscriptData,
      subjects: [
        {
          name: '국어',
          rawScore: 150,
          confidence: 0.9,
        },
      ],
    };
    const result = validateTranscriptResult(invalidData);
    expect(result.success).toBe(false);
  });

  it('원점수가 0 미만이면 검증에 실패해야 함', () => {
    const invalidData = {
      ...validTranscriptData,
      subjects: [
        {
          name: '국어',
          rawScore: -10,
          confidence: 0.9,
        },
      ],
    };
    const result = validateTranscriptResult(invalidData);
    expect(result.success).toBe(false);
  });

  it('과목이 빈 배열이면 검증에 실패해야 함', () => {
    const invalidData = {
      ...validTranscriptData,
      subjects: [],
    };
    const result = validateTranscriptResult(invalidData);
    expect(result.success).toBe(false);
  });

  it('학교명이 없으면 검증에 실패해야 함', () => {
    const invalidData = {
      documentInfo: {
        ...validTranscriptData.documentInfo,
        school: '',
      },
      subjects: validTranscriptData.subjects,
    };
    const result = validateTranscriptResult(invalidData);
    expect(result.success).toBe(false);
  });

  it('선택 필드가 없어도 검증을 통과해야 함', () => {
    const minimalData = {
      documentInfo: {
        school: '서울고등학교',
        studentName: '김철수',
        grade: 2,
        academicYear: 2025,
        semester: 1,
      },
      subjects: [
        {
          name: '국어',
          rawScore: 85,
          confidence: 0.9,
        },
      ],
    };
    const result = validateTranscriptResult(minimalData);
    expect(result.success).toBe(true);
  });
});

// =============================================================================
// 모의고사 검증 테스트
// =============================================================================

describe('validateMockExamResult', () => {
  it('유효한 데이터는 검증을 통과해야 함', () => {
    const result = validateMockExamResult(validMockExamData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.examInfo.examName).toBe('2025학년도 6월 모의고사');
      expect(result.data.subjects).toHaveLength(2);
    }
  });

  it('시험명이 없으면 검증에 실패해야 함', () => {
    const invalidData = {
      examInfo: {
        ...validMockExamData.examInfo,
        examName: '',
      },
      subjects: validMockExamData.subjects,
    };
    const result = validateMockExamResult(invalidData);
    expect(result.success).toBe(false);
  });

  it('원점수가 100을 초과하면 검증에 실패해야 함', () => {
    const invalidData = {
      ...validMockExamData,
      subjects: [
        {
          name: '국어',
          rawScore: 101,
          confidence: 0.9,
        },
      ],
    };
    const result = validateMockExamResult(invalidData);
    expect(result.success).toBe(false);
  });

  it('학생 이름이 선택적이어도 검증을 통과해야 함', () => {
    const dataWithoutStudent = {
      examInfo: {
        examName: '2025학년도 6월 모의고사',
        examDate: '2025-06-05',
      },
      subjects: [
        {
          name: '국어',
          rawScore: 88,
          confidence: 0.97,
        },
      ],
    };
    const result = validateMockExamResult(dataWithoutStudent);
    expect(result.success).toBe(true);
  });
});

// =============================================================================
// 신뢰도 계산 테스트
// =============================================================================

describe('calculateOverallConfidence', () => {
  it('과목별 신뢰도의 평균을 계산해야 함', () => {
    const subjects = [
      { confidence: 0.9 },
      { confidence: 0.8 },
      { confidence: 1.0 },
    ];
    const result = calculateOverallConfidence(subjects);
    expect(result).toBeCloseTo(0.9, 5);
  });

  it('빈 배열이면 0을 반환해야 함', () => {
    const result = calculateOverallConfidence([]);
    expect(result).toBe(0);
  });

  it('단일 과목이면 해당 신뢰도를 반환해야 함', () => {
    const subjects = [{ confidence: 0.85 }];
    const result = calculateOverallConfidence(subjects);
    expect(result).toBeCloseTo(0.85, 5);
  });

  it('다양한 신뢰도에서 정확한 평균을 계산해야 함', () => {
    const subjects = [
      { confidence: 0.95 },
      { confidence: 0.98 },
      { confidence: 0.92 },
      { confidence: 0.88 },
    ];
    const expected = (0.95 + 0.98 + 0.92 + 0.88) / 4;
    const result = calculateOverallConfidence(subjects);
    expect(result).toBeCloseTo(expected, 5);
  });
});
