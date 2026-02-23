/**
 * AI SDK Adapter - Base Class
 * 
 * 모든 LLM 제공자 어댑터의 기반 클래스입니다.
 * Vercel AI SDK와의 통합을 표준화합니다.
 */

import type { LanguageModel } from 'ai';
import { decryptApiKey as decryptApiKeyFn } from '../encryption';
import type {
  ProviderConfig,
  GenerateOptions,
  GenerateResult,
  StreamResult,
  ValidationResult,
  ModelInfo,
  ModelParams,
} from '../types';

/**
 * BaseAdapter - 모든 제공자 어댑터의 추상 기반 클래스
 */
export abstract class BaseAdapter {
  /**
   * 제공자 타입 식별자
   */
  abstract readonly providerType: string;

  /**
   * Vision 지원 여부
   */
  abstract readonly supportsVision: boolean;

  /**
   * Streaming 지원 여부
   */
  abstract readonly supportsStreaming: boolean;

  /**
   * Tools/Function calling 지원 여부
   */
  abstract readonly supportsTools: boolean;

  /**
   * JSON 모드 지원 여부
   */
  abstract readonly supportsJsonMode: boolean;

  /**
   * LanguageModel 인스턴스를 생성합니다.
   * 
   * @param modelId - 모델 ID
   * @param config - 제공자 설정
   * @returns LanguageModel 인스턴스
   */
  abstract createModel(modelId: string, config?: ProviderConfig): LanguageModel;

  /**
   * 텍스트를 생성합니다.
   * 
   * @param options - 생성 옵션
   * @returns 생성 결과
   */
  abstract generate(options: GenerateOptions): Promise<GenerateResult>;

  /**
   * 텍스트를 스트리밍합니다.
   * 
   * @param options - 생성 옵션
   * @returns 스트림 결과
   */
  abstract stream(options: GenerateOptions): Promise<StreamResult>;

  /**
   * 제공자 설정을 검증합니다.
   * 
   * @param config - 제공자 설정
   * @returns 검증 결과
   */
  abstract validate(config: ProviderConfig): Promise<ValidationResult>;

  /**
   * 제공자에서 사용 가능한 모델 목록을 조회합니다.
   * 
   * @param config - 제공자 설정
   * @returns 모델 정보 배열
   */
  abstract listModels(config: ProviderConfig): Promise<ModelInfo[]>;

  /**
   * 모델 파라미터를 제공자에 맞게 변환합니다.
   * 
   * @param params - 범용 파라미터
   * @returns 제공자별 파라미터
   */
  abstract normalizeParams(params?: ModelParams): Record<string, unknown>;

  /**
   * API 키를 설정합니다.
   * 
   * @param apiKey - API 키
   */
  abstract setApiKey(apiKey: string): void;

  /**
   * Base URL을 설정합니다.
   * 
   * @param baseUrl - 기본 URL
   */
  abstract setBaseUrl(baseUrl: string): void;

  /**
   * 헤더를 구성합니다.
   * 
   * @param config - 제공자 설정
   * @returns 헤더 객체
   */
  protected abstract buildHeaders(config: ProviderConfig): Record<string, string>;

  /**
   * 요청 URL을 구성합니다.
   * 
   * @param config - 제공자 설정
   * @param endpoint - API 엔드포인트
   * @returns 전체 URL
   */
  protected buildUrl(config: ProviderConfig, endpoint: string): string {
    const baseUrl = config.baseUrl?.replace(/\/$/, '') || this.getDefaultBaseUrl();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${baseUrl}${cleanEndpoint}`;
  }

  /**
   * 기본 Base URL을 반환합니다.
   * 
   * @returns 기본 Base URL
   */
  protected abstract getDefaultBaseUrl(): string;

  /**
   * 에러를 처리합니다.
   * 
   * @param error - 원본 에러
   * @param context - 컨텍스트 정보
   * @returns 표준화된 에러
   */
  protected handleError(error: unknown, context?: string): Error {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const contextStr = context ? `[${context}] ` : '';

    return new Error(`${contextStr}${this.providerType}: ${errorMessage}`);
  }

  /**
   * 암호화된 API 키를 복호화합니다.
   *
   * @param encrypted - 암호화된 API 키
   * @returns 복호화된 API 키 (실패 시 빈 문자열)
   */
  protected decryptApiKey(encrypted: string | null): string {
    if (!encrypted) return '';
    try {
      return decryptApiKeyFn(encrypted);
    } catch {
      return '';
    }
  }
}
