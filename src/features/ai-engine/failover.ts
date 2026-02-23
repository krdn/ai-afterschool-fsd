/**
 * LLM Failover 유틸리티
 *
 * 제공자 장애 시 자동으로 다음 제공자로 폴백하는 로직을 제공합니다.
 * 모든 제공자가 실패하면 FailoverError를 발생시킵니다.
 */

import type { ProviderName, FeatureType } from './providers';
import { trackFailure } from './usage-tracker';

/**
 * 제공자 오류 세부 정보
 */
export interface ProviderError {
  provider: ProviderName;
  error: Error;
  timestamp: Date;
  durationMs: number;
}

/**
 * Failover 컨텍스트 - 폴백 체인에서 사용되는 메타데이터
 */
export interface FailoverContext {
  featureType: FeatureType;
  teacherId?: string;
  attempt: number;
  previousProvider?: ProviderName;
  errors: ProviderError[];
}

/**
 * Failover 결과 - 성공 시 반환되는 데이터
 */
export interface FailoverResult<T> {
  data: T;
  provider: ProviderName;
  wasFailover: boolean;
  failoverFrom?: ProviderName;
  totalAttempts: number;
  totalDurationMs: number;
}

/**
 * 모든 제공자가 실패했을 때 발생하는 에러
 */
export class FailoverError extends Error {
  public readonly errors: ProviderError[];
  public readonly featureType: FeatureType;
  public readonly totalAttempts: number;

  constructor(
    featureType: FeatureType,
    errors: ProviderError[],
    message?: string
  ) {
    const defaultMessage = `All ${errors.length} providers failed for feature "${featureType}". ` +
      `Errors: ${errors.map(e => `${e.provider}: ${e.error.message}`).join('; ')}`;

    super(message || defaultMessage);
    this.name = 'FailoverError';
    this.featureType = featureType;
    this.errors = errors;
    this.totalAttempts = errors.length;

    // Error prototype chain fix for instanceof checks
    Object.setPrototypeOf(this, FailoverError.prototype);
  }

  /**
   * 마지막 에러를 반환
   */
  get lastError(): ProviderError | undefined {
    return this.errors[this.errors.length - 1];
  }

  /**
   * 사용자 친화적 에러 메시지
   */
  get userMessage(): string {
    return 'AI 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.';
  }
}

/**
 * 재시도 가능한 에러인지 판단
 * - 429 (Rate Limit), 503 (Service Unavailable), 네트워크 오류는 재시도 가능
 * - 400 (Bad Request), 401 (Unauthorized)은 재시도 불가
 */
export function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();

  // Rate limit
  if (message.includes('rate limit') || message.includes('429')) {
    return true;
  }

  // Service unavailable
  if (message.includes('503') || message.includes('service unavailable')) {
    return true;
  }

  // Network errors
  if (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('econnrefused') ||
    message.includes('enotfound') ||
    message.includes('fetch failed')
  ) {
    return true;
  }

  // Server errors (5xx)
  if (message.includes('500') || message.includes('502') || message.includes('504')) {
    return true;
  }

  // Bad request, auth errors - not retryable
  if (message.includes('400') || message.includes('401') || message.includes('403')) {
    return false;
  }

  // Default to retryable for unknown errors
  return true;
}

/**
 * 제공자 오류를 로깅
 */
export function logProviderError(
  provider: ProviderName,
  error: Error,
  context: Partial<FailoverContext>
): void {
  const { featureType, attempt = 1, previousProvider } = context;

  const logData = {
    timestamp: new Date().toISOString(),
    provider,
    featureType,
    attempt,
    previousProvider,
    error: {
      name: error.name,
      message: error.message,
    },
    isRetryable: isRetryableError(error),
  };

  console.error(`[LLM Failover] Provider ${provider} failed:`, JSON.stringify(logData, null, 2));
}

/**
 * 폴백 체인 로깅
 */
export function logFailoverChain(
  fromProvider: ProviderName,
  toProvider: ProviderName,
  featureType: FeatureType
): void {
  console.warn(
    `[LLM Failover] Switching from ${fromProvider} to ${toProvider} for feature "${featureType}"`
  );
}

/**
 * Failover 성공 로깅
 */
export function logFailoverSuccess(result: FailoverResult<unknown>): void {
  if (result.wasFailover) {
    console.info(
      `[LLM Failover] Successfully recovered using ${result.provider} ` +
      `(failed over from ${result.failoverFrom}, attempts: ${result.totalAttempts})`
    );
  }
}

/**
 * withFailover - 함수를 failover 지원으로 래핑
 *
 * 제공자 순서대로 시도하며, 실패 시 다음 제공자로 폴백합니다.
 *
 * @param providers - 시도할 제공자 순서
 * @param fn - 각 제공자로 실행할 함수
 * @param context - Failover 컨텍스트 (featureType, teacherId 등)
 * @returns FailoverResult with data and metadata
 * @throws FailoverError when all providers fail
 *
 * @example
 * ```ts
 * const result = await withFailover(
 *   ['ollama', 'anthropic', 'openai'],
 *   async (provider) => {
 *     const model = getProvider(provider);
 *     return generateText({ model, prompt });
 *   },
 *   { featureType: 'learning_analysis' }
 * );
 * ```
 */
export async function withFailover<T>(
  providers: ProviderName[],
  fn: (provider: ProviderName, attempt: number) => Promise<T>,
  context: Omit<FailoverContext, 'attempt' | 'errors'>
): Promise<FailoverResult<T>> {
  const errors: ProviderError[] = [];
  const startTime = Date.now();
  let previousProvider: ProviderName | undefined;

  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    const attempt = i + 1;
    const attemptStartTime = Date.now();

    if (i > 0) {
      logFailoverChain(providers[i - 1], provider, context.featureType);
    }

    try {
      const data = await fn(provider, attempt);

      const result: FailoverResult<T> = {
        data,
        provider,
        wasFailover: i > 0,
        failoverFrom: previousProvider,
        totalAttempts: attempt,
        totalDurationMs: Date.now() - startTime,
      };

      logFailoverSuccess(result);
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const durationMs = Date.now() - attemptStartTime;

      const providerError: ProviderError = {
        provider,
        error: err,
        timestamp: new Date(),
        durationMs,
      };

      errors.push(providerError);
      logProviderError(provider, err, {
        ...context,
        attempt,
        previousProvider,
      });

      // Track failure in usage tracker
      await trackFailure({
        provider,
        modelId: 'unknown',
        featureType: context.featureType,
        teacherId: context.teacherId,
        errorMessage: err.message,
        responseTimeMs: durationMs,
      }).catch(trackErr => {
        console.error('[LLM Failover] Failed to track failure:', trackErr);
      });

      previousProvider = provider;

      // If error is not retryable, don't try other providers for the same request type
      // (e.g., bad request format won't be fixed by changing provider)
      if (!isRetryableError(err)) {
        console.warn(
          `[LLM Failover] Error is not retryable, stopping failover chain: ${err.message}`
        );
        break;
      }
    }
  }

  // All providers failed
  throw new FailoverError(context.featureType, errors);
}

/**
 * createFailoverExecutor - 재사용 가능한 failover executor 생성
 *
 * 동일한 설정으로 여러 요청에 사용할 수 있는 executor를 생성합니다.
 *
 * @param defaultProviders - 기본 제공자 순서
 * @param defaultContext - 기본 컨텍스트
 * @returns Executor function
 *
 * @example
 * ```ts
 * const executor = createFailoverExecutor(
 *   ['ollama', 'anthropic'],
 *   { featureType: 'face_analysis' }
 * );
 *
 * const result1 = await executor(async (provider) => analyze(image1, provider));
 * const result2 = await executor(async (provider) => analyze(image2, provider));
 * ```
 */
export function createFailoverExecutor(
  defaultProviders: ProviderName[],
  defaultContext: Omit<FailoverContext, 'attempt' | 'errors'>
) {
  return async <T>(
    fn: (provider: ProviderName, attempt: number) => Promise<T>,
    overrideProviders?: ProviderName[],
    overrideContext?: Partial<Omit<FailoverContext, 'attempt' | 'errors'>>
  ): Promise<FailoverResult<T>> => {
    return withFailover(
      overrideProviders || defaultProviders,
      fn,
      { ...defaultContext, ...overrideContext }
    );
  };
}
