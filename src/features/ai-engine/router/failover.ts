import type { ProviderName, FeatureType } from "../types"
import { logger } from "@/lib/logger"

export interface ProviderError {
  provider: ProviderName
  error: Error
  timestamp: Date
  durationMs: number
}

export interface FailoverContext {
  featureType: FeatureType
  teacherId?: string
  attempt: number
  previousProvider?: ProviderName
  errors: ProviderError[]
}

export interface FailoverResult<T> {
  data: T
  provider: ProviderName
  wasFailover: boolean
  failoverFrom?: ProviderName
  totalAttempts: number
  totalDurationMs: number
}

export class FailoverError extends Error {
  public readonly errors: ProviderError[]
  public readonly featureType: FeatureType
  public readonly totalAttempts: number

  constructor(
    featureType: FeatureType,
    errors: ProviderError[],
    message?: string
  ) {
    const defaultMessage =
      `All ${errors.length} providers failed for feature "${featureType}". ` +
      `Errors: ${errors.map((e) => `${e.provider}: ${e.error.message}`).join("; ")}`

    super(message || defaultMessage)
    this.name = "FailoverError"
    this.featureType = featureType
    this.errors = errors
    this.totalAttempts = errors.length
    Object.setPrototypeOf(this, FailoverError.prototype)
  }

  get lastError(): ProviderError | undefined {
    return this.errors[this.errors.length - 1]
  }

  get userMessage(): string {
    return "AI 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해주세요."
  }
}

export function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase()

  if (message.includes("rate limit") || message.includes("429")) return true
  if (message.includes("503") || message.includes("service unavailable")) return true
  if (
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("econnrefused") ||
    message.includes("enotfound") ||
    message.includes("fetch failed")
  ) return true
  if (message.includes("500") || message.includes("502") || message.includes("504")) return true
  if (message.includes("400") || message.includes("401") || message.includes("403")) return false

  return true
}

export function logProviderError(
  provider: ProviderName,
  error: Error,
  context: Partial<FailoverContext>
): void {
  const { featureType, attempt = 1, previousProvider } = context
  logger.error({ detail: { timestamp: new Date().toISOString(), provider, featureType, attempt, previousProvider, error: { name: error.name, message: error.message }, isRetryable: isRetryableError(error) } }, `[LLM Failover] Provider ${provider} failed`)
}

export function logFailoverChain(
  fromProvider: ProviderName,
  toProvider: ProviderName,
  featureType: FeatureType
): void {
  logger.warn({ fromProvider, toProvider, featureType }, '[LLM Failover] Switching provider')
}

export function logFailoverSuccess(result: FailoverResult<unknown>): void {
  if (result.wasFailover) {
    logger.info({ provider: result.provider, failoverFrom: result.failoverFrom, totalAttempts: result.totalAttempts }, '[LLM Failover] Successfully recovered')
  }
}

export type TrackFailureFn = (input: {
  provider: ProviderName
  modelId: string
  featureType: FeatureType
  teacherId?: string
  errorMessage: string
  responseTimeMs: number
}) => Promise<void>

export async function withFailover<T>(
  providers: ProviderName[],
  fn: (provider: ProviderName, attempt: number) => Promise<T>,
  context: Omit<FailoverContext, "attempt" | "errors">,
  trackFailure?: TrackFailureFn
): Promise<FailoverResult<T>> {
  const errors: ProviderError[] = []
  const startTime = Date.now()
  let previousProvider: ProviderName | undefined

  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i]
    const attempt = i + 1
    const attemptStartTime = Date.now()

    if (i > 0) logFailoverChain(providers[i - 1], provider, context.featureType)

    try {
      const data = await fn(provider, attempt)
      const result: FailoverResult<T> = {
        data,
        provider,
        wasFailover: i > 0,
        failoverFrom: previousProvider,
        totalAttempts: attempt,
        totalDurationMs: Date.now() - startTime,
      }
      logFailoverSuccess(result)
      return result
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      const durationMs = Date.now() - attemptStartTime
      errors.push({ provider, error: err, timestamp: new Date(), durationMs })
      logProviderError(provider, err, { ...context, attempt, previousProvider })

      if (trackFailure) {
        await trackFailure({
          provider,
          modelId: "unknown",
          featureType: context.featureType,
          teacherId: context.teacherId,
          errorMessage: err.message,
          responseTimeMs: durationMs,
        }).catch((err) => {
          logger.error({ err }, '[LLM Failover] Failed to track failure')
        })
      }

      previousProvider = provider
      if (!isRetryableError(err)) {
        logger.warn({ err }, '[LLM Failover] Error is not retryable, stopping failover chain')
        break
      }
    }
  }

  throw new FailoverError(context.featureType, errors)
}

export function createFailoverExecutor(
  defaultProviders: ProviderName[],
  defaultContext: Omit<FailoverContext, "attempt" | "errors">,
  trackFailure?: TrackFailureFn
) {
  return async <T>(
    fn: (provider: ProviderName, attempt: number) => Promise<T>,
    overrideProviders?: ProviderName[],
    overrideContext?: Partial<Omit<FailoverContext, "attempt" | "errors">>
  ): Promise<FailoverResult<T>> => {
    return withFailover(
      overrideProviders || defaultProviders,
      fn,
      { ...defaultContext, ...overrideContext },
      trackFailure
    )
  }
}
