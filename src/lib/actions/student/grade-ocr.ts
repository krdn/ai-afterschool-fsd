'use server';

import { db as prisma } from '@/lib/db/client';
import { revalidatePath } from 'next/cache';
import { getCurrentTeacher } from '@/lib/dal';
import { logger } from '@/lib/logger';
import { processGradeImage } from '@/features/grade-management/ocr/ocr-processor';
import type { TranscriptOcrResult, MockExamOcrResult } from '@/features/grade-management/types';
import type { OcrDocumentType, Prisma } from '@/lib/db';

// =============================================================================
// 타입
// =============================================================================

/** OCR 업로드 결과 */
interface UploadAndProcessResult {
  success: boolean;
  scanId?: string;
  extractedData?: TranscriptOcrResult | MockExamOcrResult | Record<string, unknown>;
  confidence?: number;
  errors?: string[];
  message: string;
}

/** OCR 확인 결과 */
interface ConfirmOcrResultResponse {
  success: boolean;
  message: string;
}

// =============================================================================
// Server Actions
// =============================================================================

/**
 * 이미지를 업로드하고 OCR 처리를 수행합니다.
 *
 * 1. FormData에서 이미지 및 메타데이터 추출
 * 2. GradeOcrScan 레코드 생성 (status: PROCESSING)
 * 3. OCR 프로세서로 이미지 분석
 * 4. 결과로 스캔 레코드 업데이트
 */
export async function uploadAndProcessGradeImage(
  formData: FormData
): Promise<UploadAndProcessResult> {
  try {
    const teacher = await getCurrentTeacher();

    // FormData에서 필드 추출
    const imageBase64 = formData.get('imageBase64') as string;
    const mimeType = formData.get('mimeType') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    const documentType = formData.get('documentType') as string;
    const studentId = formData.get('studentId') as string | null;
    const imageUrl = formData.get('imageUrl') as string;

    if (!imageBase64 || !mimeType || !documentType || !imageUrl) {
      return { success: false, message: '필수 필드가 누락되었습니다.' };
    }

    // GradeOcrScan 레코드 생성
    const scan = await prisma.gradeOcrScan.create({
      data: {
        teacherId: teacher.id,
        studentId: studentId || undefined,
        imageUrl,
        documentType: documentType as OcrDocumentType,
        extractedData: {},
        status: 'PROCESSING',
      },
    });

    // OCR 처리
    const ocrResult = await processGradeImage(
      imageBase64,
      mimeType,
      documentType,
      teacher.id
    );

    // 스캔 레코드 업데이트
    await prisma.gradeOcrScan.update({
      where: { id: scan.id },
      data: {
        extractedData: ocrResult.extractedData as unknown as Prisma.InputJsonValue,
        confidence: ocrResult.confidence,
        status: ocrResult.isValid ? 'REVIEWED' : 'FAILED',
        errorMessage: ocrResult.errors?.join('; ') || null,
      },
    });

    logger.info(
      { scanId: scan.id, confidence: ocrResult.confidence, isValid: ocrResult.isValid },
      'OCR 이미지 처리 완료'
    );

    return {
      success: true,
      scanId: scan.id,
      extractedData: ocrResult.extractedData,
      confidence: ocrResult.confidence,
      errors: ocrResult.errors,
      message: ocrResult.isValid
        ? 'OCR 처리가 완료되었습니다. 결과를 확인해주세요.'
        : 'OCR 처리 중 일부 오류가 발생했습니다. 결과를 확인해주세요.',
    };
  } catch (error) {
    logger.error({ err: error }, 'OCR 이미지 업로드 및 처리 실패');
    return { success: false, message: 'OCR 처리 중 오류가 발생했습니다.' };
  }
}

/**
 * OCR 추출 결과를 확인하고 성적 데이터로 저장합니다.
 *
 * - TRANSCRIPT/CUSTOM → GradeHistory에 createMany
 * - MOCK_EXAM → MockExamResult에 createMany
 */
export async function confirmOcrResult(
  scanId: string,
  confirmedData: TranscriptOcrResult | MockExamOcrResult,
  studentId: string
): Promise<ConfirmOcrResultResponse> {
  try {
    const teacher = await getCurrentTeacher();

    // 스캔 레코드 조회
    const scan = await prisma.gradeOcrScan.findUnique({
      where: { id: scanId },
    });

    if (!scan) {
      return { success: false, message: '스캔 레코드를 찾을 수 없습니다.' };
    }

    if (scan.teacherId !== teacher.id) {
      return { success: false, message: '권한이 없습니다.' };
    }

    const documentType = scan.documentType;

    if (documentType === 'MOCK_EXAM') {
      // 모의고사 결과 저장
      const mockExamData = confirmedData as MockExamOcrResult;
      const examDate = new Date(mockExamData.examInfo.examDate);
      const academicYear = examDate.getFullYear();

      await prisma.mockExamResult.createMany({
        data: mockExamData.subjects.map((subject) => ({
          studentId,
          teacherId: teacher.id,
          examName: mockExamData.examInfo.examName,
          examDate,
          subject: subject.name,
          rawScore: subject.rawScore,
          standardScore: subject.standardScore,
          percentile: subject.percentile,
          gradeRank: subject.gradeRank,
          academicYear,
          ocrSourceId: scanId,
        })),
      });
    } else {
      // TRANSCRIPT 또는 CUSTOM → GradeHistory에 저장
      const transcriptData = confirmedData as TranscriptOcrResult;
      const { documentInfo, subjects } = transcriptData;

      await prisma.gradeHistory.createMany({
        data: subjects.map((subject) => ({
          studentId,
          teacherId: teacher.id,
          subject: subject.name,
          gradeType: 'MIDTERM' as const,
          score: subject.rawScore,
          maxScore: 100,
          normalizedScore: subject.rawScore,
          testDate: new Date(),
          academicYear: documentInfo.academicYear,
          semester: documentInfo.semester,
          classAverage: subject.classAverage,
          classStdDev: subject.standardDev,
          gradeRank: subject.gradeRank,
          classRank: subject.classRank,
          totalStudents: subject.totalStudents,
          category: subject.category,
        })),
      });
    }

    // 스캔 상태를 CONFIRMED로 업데이트
    await prisma.gradeOcrScan.update({
      where: { id: scanId },
      data: {
        status: 'CONFIRMED',
        processedData: confirmedData as unknown as Prisma.InputJsonValue,
      },
    });

    revalidatePath(`/students/${studentId}`);
    logger.info({ scanId, studentId, documentType }, 'OCR 결과 확인 및 성적 저장 완료');

    return {
      success: true,
      message: documentType === 'MOCK_EXAM'
        ? '모의고사 성적이 저장되었습니다.'
        : '성적이 저장되었습니다.',
    };
  } catch (error) {
    logger.error({ err: error, scanId }, 'OCR 결과 확인 실패');
    return { success: false, message: 'OCR 결과 저장 중 오류가 발생했습니다.' };
  }
}

/**
 * OCR 스캔 이력을 조회합니다.
 *
 * 현재 교사의 스캔 이력을 최근 20건까지 반환합니다.
 * studentId가 제공되면 해당 학생의 스캔만 필터링합니다.
 */
export async function getOcrScans(studentId?: string) {
  try {
    const teacher = await getCurrentTeacher();

    const scans = await prisma.gradeOcrScan.findMany({
      where: {
        teacherId: teacher.id,
        ...(studentId ? { studentId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        student: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return scans;
  } catch (error) {
    logger.error({ err: error }, 'OCR 스캔 이력 조회 실패');
    return [];
  }
}
