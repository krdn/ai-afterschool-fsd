'use server';

import { db as prisma } from '@/lib/db/client';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getCurrentTeacher } from '@/lib/dal';
import { okVoid, fail, type ActionVoidResult } from '@/lib/errors/action-result';
import { logger } from '@/lib/logger';

// =============================================================================
// 검증 스키마
// =============================================================================

// 빈 문자열을 undefined로 변환하는 전처리 함수
const emptyToUndefined = (value: unknown) => value === '' || value === null ? undefined : value;

const MockExamSchema = z.object({
  studentId: z.string().min(1, '학생 ID가 필요합니다.'),
  examName: z.string().min(1, '시험명을 입력해주세요.'),
  examDate: z.coerce.date(),
  subject: z.string().min(1, '과목명을 입력해주세요.'),
  rawScore: z.coerce.number().min(0, '0 이상의 점수를 입력해주세요.'),
  standardScore: z.preprocess(emptyToUndefined, z.coerce.number().min(0).optional()),
  percentile: z.preprocess(emptyToUndefined, z.coerce.number().min(0).max(100).optional()),
  gradeRank: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(9).optional()),
  academicYear: z.coerce.number().int().min(2000).default(new Date().getFullYear()),
  notes: z.preprocess(emptyToUndefined, z.string().optional()),
});

// =============================================================================
// Server Actions
// =============================================================================

/**
 * 모의고사 성적을 추가합니다.
 */
export async function addMockExamResult(prevState: unknown, formData: FormData) {
  try {
    const teacher = await getCurrentTeacher();

    const rawData = {
      studentId: formData.get('studentId'),
      examName: formData.get('examName'),
      examDate: formData.get('examDate'),
      subject: formData.get('subject'),
      rawScore: formData.get('rawScore'),
      standardScore: formData.get('standardScore'),
      percentile: formData.get('percentile'),
      gradeRank: formData.get('gradeRank'),
      academicYear: formData.get('academicYear') || new Date().getFullYear(),
      notes: formData.get('notes'),
    };

    const validatedData = MockExamSchema.parse(rawData);

    await prisma.mockExamResult.create({
      data: {
        ...validatedData,
        teacherId: teacher.id,
      },
    });

    revalidatePath(`/students/${validatedData.studentId}`);
    return { success: true, message: '모의고사 성적이 등록되었습니다.' };
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      'digest' in error &&
      typeof (error as { digest?: string }).digest === 'string' &&
      (error as { digest: string }).digest.startsWith('NEXT_REDIRECT')
    ) {
      throw error;
    }
    logger.error({ err: error }, 'Failed to add mock exam result');
    return { success: false, message: '모의고사 성적 등록 중 오류가 발생했습니다.' };
  }
}

/**
 * 특정 학생의 모의고사 성적 목록을 조회합니다.
 */
export async function getMockExamResults(studentId: string) {
  try {
    const results = await prisma.mockExamResult.findMany({
      where: { studentId },
      orderBy: { examDate: 'desc' },
    });
    return results;
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch mock exam results');
    return [];
  }
}

/**
 * 모의고사 성적을 삭제합니다.
 */
export async function deleteMockExamResult(
  id: string,
  studentId: string
): Promise<ActionVoidResult> {
  try {
    await prisma.mockExamResult.delete({
      where: { id },
    });
    revalidatePath(`/students/${studentId}`);
    return okVoid();
  } catch {
    return fail('모의고사 성적 삭제 실패');
  }
}
