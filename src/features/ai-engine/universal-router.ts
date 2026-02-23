/**
 * Universal Router
 *
 * Universal LLM Hub를 사용하는 새로운 라우터입니다.
 * 기존 router.ts의 인터페이스를 유지하면서 남부 구현을 교체합니다.
 */

import { generateText, streamText } from 'ai';
import { db } from '@/lib/db/client';
import { logger } from '@/lib/logger';
import { getProviderRegistry } from './provider-registry';
import { trackUsage, trackFailure } from './usage-tracker';
import { isRetryableError } from './failover';
import {
  type Provider,
  type Model,
  isRefusalResponse,
  setupProviderEnv,
  createLanguageModel,
  getProviderOrder,
} from './router-utils';

// =============================================================================
// 타입 (텍스트 전용)
// =============================================================================

export interface GenerateOptions {
  prompt: string;
  featureType: string;
  teacherId?: string;
  maxOutputTokens?: number;
  temperature?: number;
  system?: string;
  /** 특정 제공자를 지정하여 호출 (지정하지 않으면 FeatureResolver 자동 라우팅) */
  providerId?: string;
  /** 멀티턴 대화용 메시지 배열 (지정 시 prompt 대신 사용) */
  messages?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
}

export interface StreamResult {
  stream: ReturnType<typeof streamText>;
  provider: string;
  model: string;
}

// =============================================================================
// Re-exports (공유 타입, 비전 함수 — 하위 호환)
// =============================================================================

export type { GenerateResult } from './router-utils';
export type { VisionGenerateOptions } from './router-vision';
export { generateWithVision, generateVisionWithSpecificProvider } from './router-vision';
export { FailoverError } from './failover';

// =============================================================================
// Public API - 텍스트 생성 함수
// =============================================================================

/**
 * 텍스트를 생성합니다.
 */
export async function generateWithProvider(options: GenerateOptions): Promise<import('./router-utils').GenerateResult> {
  const { prompt, featureType, teacherId, maxOutputTokens, temperature, system, providerId } = options;

  let providerOrder: Array<{ provider: Provider; model: Model }>;

  if (providerId) {
    // 특정 제공자가 지정된 경우: 해당 제공자의 기본 모델 사용
    const provider = await db.provider.findUnique({
      where: { id: providerId },
      include: { models: true },
    });
    if (!provider || !provider.isEnabled) {
      throw new Error(`Provider "${providerId}" not found or disabled`);
    }
    const defaultModel = provider.models.find((m: Model) => m.isDefault) || provider.models[0];
    if (!defaultModel) {
      throw new Error(`Provider "${provider.name}" has no models configured`);
    }
    providerOrder = [{ provider: provider as unknown as Provider, model: defaultModel as unknown as Model }];
  } else {
    providerOrder = await getProviderOrder(featureType);
  }

  let lastError: Error | null = null;
  let failoverFrom: string | undefined;

  for (let i = 0; i < providerOrder.length; i++) {
    const { provider, model } = providerOrder[i];
    const isFailover = i > 0;

    if (isFailover) {
      failoverFrom = providerOrder[i - 1].provider.providerType;
    }

    const startTime = Date.now();

    try {
      const isReady = await setupProviderEnv(provider);
      if (!isReady) {
        logger.warn({ provider: provider.providerType }, 'Provider not ready, skipping');
        continue;
      }

      const languageModel = createLanguageModel(provider, model);

      const result = await generateText({
        model: languageModel,
        prompt,
        system,
        maxOutputTokens,
        temperature,
        maxRetries: 0,
      });

      // LLM 거부 응답 감지 — 다음 모델로 폴백
      if (isRefusalResponse(result.text)) {
        logger.warn({ modelId: model.modelId }, '[Universal Router] Model refused the request, trying next provider');
        lastError = new Error(`Model ${model.modelId} refused: ${result.text.slice(0, 100)}`);
        continue;
      }

      const responseTimeMs = Date.now() - startTime;

      await trackUsage({
        provider: provider.providerType as import('./providers/types').ProviderName,
        modelId: model.modelId,
        featureType: featureType as import('./providers/types').FeatureType,
        teacherId,
        inputTokens: result.usage?.inputTokens || 0,
        outputTokens: result.usage?.outputTokens || 0,
        responseTimeMs,
        success: true,
        failoverFrom: isFailover ? (failoverFrom as import('./providers/types').ProviderName) : undefined,
      });

      return {
        text: result.text,
        usage: result.usage,
        provider: provider.providerType,
        model: model.modelId,
        wasFailover: isFailover,
        failoverFrom: isFailover ? (failoverFrom as import('./providers/types').ProviderName) : undefined,
      };
    } catch (error) {
      const responseTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error({ detail: errorMessage, provider: provider.providerType }, 'Provider failed');

      await trackFailure({
        provider: provider.providerType as import('./providers/types').ProviderName,
        modelId: model.modelId,
        featureType: featureType as import('./providers/types').FeatureType,
        teacherId,
        errorMessage,
        responseTimeMs,
      });

      lastError = error instanceof Error ? error : new Error(String(error));

      // 재시도 불가능한 에러는 폴 백 체인 중단
      if (!isRetryableError(lastError)) {
        logger.warn({ err: lastError }, '[Universal Router] Error is not retryable, stopping failover chain');
        break;
      }
    }
  }

  throw new Error(
    `All providers failed for feature "${featureType}". Last error: ${lastError?.message || 'Unknown error'}`
  );
}

/**
 * 텍스트를 스트리밍합니다.
 */
export async function streamWithProvider(options: GenerateOptions): Promise<StreamResult> {
  const { prompt, featureType, teacherId, maxOutputTokens, temperature, system, providerId, messages } = options;

  let providerOrder: Array<{ provider: Provider; model: Model }>;

  if (providerId) {
    // 특정 제공자가 지정된 경우: 해당 제공자의 기본 모델 사용
    const provider = await db.provider.findUnique({
      where: { id: providerId },
      include: { models: true },
    });
    if (!provider || !provider.isEnabled) {
      throw new Error(`Provider "${providerId}" not found or disabled`);
    }
    const defaultModel = provider.models.find((m: Model) => m.isDefault) || provider.models[0];
    if (!defaultModel) {
      throw new Error(`Provider "${provider.name}" has no models configured`);
    }
    providerOrder = [{ provider: provider as unknown as Provider, model: defaultModel as unknown as Model }];
  } else {
    providerOrder = await getProviderOrder(featureType);
  }

  let lastError: Error | null = null;

  for (const { provider, model } of providerOrder) {
    const startTime = Date.now();

    try {
      const isReady = await setupProviderEnv(provider);
      if (!isReady) {
        continue;
      }

      const languageModel = createLanguageModel(provider, model);

      const onFinishCallback = async ({ usage }: { usage?: { inputTokens?: number; outputTokens?: number } }) => {
        const responseTimeMs = Date.now() - startTime;
        await trackUsage({
          provider: provider.providerType as import('./providers/types').ProviderName,
          modelId: model.modelId,
          featureType: featureType as import('./providers/types').FeatureType,
          teacherId,
          inputTokens: usage?.inputTokens || 0,
          outputTokens: usage?.outputTokens || 0,
          responseTimeMs,
          success: true,
        });
      };

      // 멀티턴 메시지가 있으면 messages 사용, 없으면 단일 prompt 사용
      const result = messages && messages.length > 0
        ? streamText({
            model: languageModel,
            messages,
            system,
            maxOutputTokens,
            temperature,
            maxRetries: 0,
            onFinish: onFinishCallback,
          })
        : streamText({
            model: languageModel,
            prompt,
            system,
            maxOutputTokens,
            temperature,
            maxRetries: 0,
            onFinish: onFinishCallback,
          });

      return {
        stream: result,
        provider: provider.providerType,
        model: model.modelId,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.error({ err: lastError, provider: provider.providerType }, 'Provider failed');
    }
  }

  throw new Error(
    `All providers failed for feature "${featureType}". Last error: ${lastError?.message || 'Unknown error'}`
  );
}

/**
 * 특정 제공자로 텍스트를 생성합니다.
 */
export async function generateWithSpecificProvider(
  providerType: string,
  options: Omit<GenerateOptions, 'featureType'> & { featureType?: string }
): Promise<import('./router-utils').GenerateResult> {
  const { prompt, featureType = 'learning_analysis', teacherId, maxOutputTokens, temperature, system } = options;

  const registry = getProviderRegistry(db);
  const providers = await registry.list({ enabledOnly: true });
  const provider = providers.find(p => (p as unknown as Provider).providerType === providerType);

  if (!provider) {
    throw new Error(`Provider ${providerType} is not configured or enabled`);
  }

  const typedProvider = provider as unknown as Provider;
  const model = provider.models.find(m => m.isDefault) || provider.models[0];
  if (!model) {
    throw new Error(`No models available for provider ${providerType}`);
  }

  const startTime = Date.now();

  const isReady = await setupProviderEnv(typedProvider);
  if (!isReady) {
    throw new Error(`Provider ${providerType} is not configured or enabled`);
  }

  const languageModel = createLanguageModel(typedProvider, model as unknown as Model);

  const result = await generateText({
    model: languageModel,
    prompt,
    system,
    maxOutputTokens,
    temperature,
    maxRetries: 2,
  });

  const responseTimeMs = Date.now() - startTime;

  await trackUsage({
    provider: typedProvider.providerType as import('./providers/types').ProviderName,
    modelId: model.modelId,
    featureType: featureType as import('./providers/types').FeatureType,
    teacherId,
    inputTokens: result.usage?.inputTokens || 0,
    outputTokens: result.usage?.outputTokens || 0,
    responseTimeMs,
    success: true,
  });

  return {
    text: result.text,
    usage: result.usage,
    provider: typedProvider.providerType,
    model: model.modelId,
    wasFailover: false,
  };
}
