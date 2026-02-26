/**
 * OCR 결과 검증기
 *
 * Zod 스키마를 사용하여 OCR 추출 결과의 유효성을 검증합니다.
 * 성적통지표(Transcript)와 모의고사(MockExam) 결과를 각각 검증합니다.
 */

import { z } from 'zod';

// =============================================================================
// 성적통지표 검증 스키마
// =============================================================================

const TranscriptSubjectSchema = z.object({
  name: z.string().min(1, '과목명은 필수입니다'),
  rawScore: z.number().min(0, '원점수는 0 이상이어야 합니다').max(100, '원점수는 100 이하여야 합니다'),
  classAverage: z.number().min(0).max(100).optional(),
  standardDev: z.number().min(0).optional(),
  gradeRank: z.number().int().min(1).max(9).optional(),
  classRank: z.number().int().min(1).optional(),
  totalStudents: z.number().int().min(1).optional(),
  category: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

const TranscriptDocumentInfoSchema = z.object({
  school: z.string().min(1, '학교명은 필수입니다'),
  studentName: z.string().min(1, '학생 이름은 필수입니다'),
  grade: z.number().int().min(1).max(6),
  academicYear: z.number().int().min(2000).max(2100),
  semester: z.number().int().min(1).max(2),
});

export const TranscriptResultSchema = z.object({
  documentInfo: TranscriptDocumentInfoSchema,
  subjects: z.array(TranscriptSubjectSchema).min(1, '최소 1개 이상의 과목이 필요합니다'),
});

// =============================================================================
// 모의고사 검증 스키마
// =============================================================================

const MockExamSubjectSchema = z.object({
  name: z.string().min(1, '과목명은 필수입니다'),
  rawScore: z.number().min(0, '원점수는 0 이상이어야 합니다').max(100, '원점수는 100 이하여야 합니다'),
  standardScore: z.number().min(0).optional(),
  percentile: z.number().min(0).max(100).optional(),
  gradeRank: z.number().int().min(1).max(9).optional(),
  confidence: z.number().min(0).max(1),
});

const MockExamInfoSchema = z.object({
  examName: z.string().min(1, '시험명은 필수입니다'),
  examDate: z.string().min(1, '시험 일자는 필수입니다'),
  studentName: z.string().optional(),
});

export const MockExamResultSchema = z.object({
  examInfo: MockExamInfoSchema,
  subjects: z.array(MockExamSubjectSchema).min(1, '최소 1개 이상의 과목이 필요합니다'),
});

// =============================================================================
// 검증 함수
// =============================================================================

/**
 * 성적통지표 OCR 결과를 검증합니다.
 *
 * @param data - 검증할 데이터
 * @returns Zod safeParse 결과
 */
export function validateTranscriptResult(data: unknown) {
  return TranscriptResultSchema.safeParse(data);
}

/**
 * 모의고사 OCR 결과를 검증합니다.
 *
 * @param data - 검증할 데이터
 * @returns Zod safeParse 결과
 */
export function validateMockExamResult(data: unknown) {
  return MockExamResultSchema.safeParse(data);
}

/**
 * 과목별 신뢰도의 가중 평균을 계산합니다.
 *
 * @param subjects - confidence 필드를 가진 과목 배열
 * @returns 평균 신뢰도 (0~1), 빈 배열이면 0
 */
export function calculateOverallConfidence(
  subjects: { confidence: number }[]
): number {
  if (subjects.length === 0) return 0;

  const sum = subjects.reduce((acc, subject) => acc + subject.confidence, 0);
  return sum / subjects.length;
}
