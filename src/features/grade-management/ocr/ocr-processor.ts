/**
 * OCR 프로세서
 *
 * Vision LLM을 호출하여 이미지에서 성적 데이터를 추출하고,
 * 검증한 뒤 구조화된 결과를 반환합니다.
 */

import { generateWithVision } from '@/features/ai-engine/router-vision';
import { extractJsonFromLLM } from '@/shared/utils/extract-json';
import { logger } from '@/lib/logger';
import type { TranscriptOcrResult, MockExamOcrResult } from '../types';
import { getOcrPrompt } from './ocr-prompts';
import {
  validateTranscriptResult,
  validateMockExamResult,
  calculateOverallConfidence,
} from './ocr-validator';

// =============================================================================
// 타입
// =============================================================================

/** OCR 처리 결과 */
export interface OcrProcessResult {
  /** 추출된 데이터 */
  extractedData: TranscriptOcrResult | MockExamOcrResult | Record<string, unknown>;
  /** 전체 신뢰도 (0~1) */
  confidence: number;
  /** 검증 통과 여부 */
  isValid: boolean;
  /** 검증 오류 메시지 목록 */
  errors?: string[];
  /** 사용된 AI 제공자 */
  provider?: string;
  /** 사용된 AI 모델 */
  model?: string;
}

// =============================================================================
// 시스템 프롬프트
// =============================================================================

const SYSTEM_PROMPT =
  '당신은 한국 교육 문서 전문 OCR 시스템입니다. 이미지에서 성적 데이터를 정확하게 추출하여 지정된 JSON 형식으로 반환합니다.';

// =============================================================================
// Public API
// =============================================================================

/**
 * 이미지에서 성적 데이터를 추출합니다.
 *
 * 1. 문서 유형별 프롬프트 생성
 * 2. Vision LLM 호출
 * 3. JSON 파싱 및 검증
 * 4. 신뢰도 계산
 *
 * @param imageBase64 - Base64 인코딩된 이미지 데이터
 * @param mimeType - 이미지 MIME 타입
 * @param documentType - 문서 유형 ('TRANSCRIPT' | 'MOCK_EXAM' | 'CUSTOM')
 * @param teacherId - 선생님 ID (사용량 추적용)
 * @returns OCR 처리 결과
 */
export async function processGradeImage(
  imageBase64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
  documentType: string,
  teacherId?: string
): Promise<OcrProcessResult> {
  logger.info({ documentType, teacherId }, '[OCR] 성적 이미지 처리 시작');

  // 1. 프롬프트 생성
  const prompt = getOcrPrompt(documentType);

  // 2. Vision LLM 호출
  const visionResult = await generateWithVision({
    imageBase64,
    mimeType,
    prompt,
    system: SYSTEM_PROMPT,
    featureType: 'grade_ocr',
    teacherId,
  });

  logger.info(
    { provider: visionResult.provider, model: visionResult.model },
    '[OCR] Vision LLM 응답 수신'
  );

  // 3. JSON 추출
  let extractedData: unknown;
  try {
    extractedData = extractJsonFromLLM(visionResult.text);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'JSON 파싱 실패';
    logger.error({ detail: errorMessage }, '[OCR] JSON 추출 실패');

    return {
      extractedData: {} as Record<string, unknown>,
      confidence: 0,
      isValid: false,
      errors: [errorMessage],
      provider: visionResult.provider,
      model: visionResult.model,
    };
  }

  // 4. 문서 유형별 검증
  const validationResult = validateByDocumentType(
    documentType,
    extractedData
  );

  // 5. 결과 반환
  logger.info(
    {
      isValid: validationResult.isValid,
      confidence: validationResult.confidence,
      errorCount: validationResult.errors?.length ?? 0,
    },
    '[OCR] 성적 이미지 처리 완료'
  );

  return {
    extractedData: validationResult.extractedData,
    confidence: validationResult.confidence,
    isValid: validationResult.isValid,
    errors: validationResult.errors,
    provider: visionResult.provider,
    model: visionResult.model,
  };
}

// =============================================================================
// 내부 헬퍼
// =============================================================================

/**
 * 문서 유형별 검증을 수행합니다.
 */
function validateByDocumentType(
  documentType: string,
  data: unknown
): Omit<OcrProcessResult, 'provider' | 'model'> {
  switch (documentType) {
    case 'TRANSCRIPT': {
      const result = validateTranscriptResult(data);
      if (result.success) {
        const confidence = calculateOverallConfidence(result.data.subjects);
        return {
          extractedData: result.data as unknown as TranscriptOcrResult,
          confidence,
          isValid: true,
        };
      }

      return {
        extractedData: (data as Record<string, unknown>) ?? {},
        confidence: 0,
        isValid: false,
        errors: extractZodErrors(result.error),
      };
    }

    case 'MOCK_EXAM': {
      const result = validateMockExamResult(data);
      if (result.success) {
        const confidence = calculateOverallConfidence(result.data.subjects);
        return {
          extractedData: result.data as unknown as MockExamOcrResult,
          confidence,
          isValid: true,
        };
      }

      return {
        extractedData: (data as Record<string, unknown>) ?? {},
        confidence: 0,
        isValid: false,
        errors: extractZodErrors(result.error),
      };
    }

    default: {
      // CUSTOM이나 기타 유형은 구조 검증 없이 반환
      return {
        extractedData: (data as Record<string, unknown>) ?? {},
        confidence: 0.5,
        isValid: true,
      };
    }
  }
}

/**
 * Zod 에러에서 메시지를 추출합니다.
 */
function extractZodErrors(error: { issues: Array<{ message: string; path: Array<string | number> }> }): string[] {
  return error.issues.map(
    (issue) => `${issue.path.join('.')}: ${issue.message}`
  );
}
