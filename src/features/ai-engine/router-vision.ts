/**
 * Router Vision
 *
 * Vision(이미지 분석) 기능을 위한 함수를 모아 둔 파일입니다.
 * universal-router.ts에서 분리되었습니다.
 */

import { generateText, type ModelMessage } from 'ai';
import { db } from '@/lib/db/client';
import { logger } from '@/lib/logger';
import { getProviderRegistry } from './provider-registry';
import { trackUsage, trackFailure } from './usage-tracker';
import { FailoverError, isRetryableError } from './failover';
import {
  type Provider,
  type Model,
  type GenerateResult,
  isRefusalResponse,
  setupProviderEnv,
  createLanguageModel,
  getProviderOrder,
} from './router-utils';

// =============================================================================
// 타입
// =============================================================================

/**
 * Vision 분석 옵션 - 이미지를 포함한 요청
 */
export interface VisionGenerateOptions {
  featureType: string;
  teacherId?: string;
  maxOutputTokens?: number;
  temperature?: number;
  system?: string;
  /** base64 인코딩된 이미지 데이터 */
  imageBase64: string;
  /** 이미지 MIME 타입 (예: 'image/jpeg', 'image/png') */
  mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
  /** 이미지와 함께 별낼 프롬프트 */
  prompt: string;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Vision 기반 텍스트 생성 (이미지 분석)
 */
export async function generateWithVision(
  options: VisionGenerateOptions
): Promise<GenerateResult> {
  const {
    featureType,
    teacherId,
    maxOutputTokens = 2048,
    temperature,
    system,
    imageBase64,
    mimeType,
    prompt,
  } = options;

  const providerOrder = await getProviderOrder(featureType, true);

  let lastError: Error | null = null;
  let failoverFrom: string | undefined;

  for (let i = 0; i < providerOrder.length; i++) {
    const { provider, model } = providerOrder[i];
    const isFailover = i > 0;

    if (isFailover) {
      failoverFrom = providerOrder[i - 1].provider.providerType;
      logger.warn({ from: failoverFrom, to: provider.providerType, featureType }, '[Universal Router] Vision failover');
    }

    const startTime = Date.now();

    try {
      const isReady = await setupProviderEnv(provider);
      if (!isReady) {
        logger.warn({ provider: provider.providerType }, 'Provider not ready for vision, skipping');
        continue;
      }

      // Vision 지원 확인
      if (!model.supportsVision) {
        logger.warn({ modelId: model.modelId }, 'Model does not support vision, skipping');
        continue;
      }

      const languageModel = createLanguageModel(provider, model);

      // Vercel AI SDK messages format with image
      const messages: ModelMessage[] = [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              image: `data:${mimeType};base64,${imageBase64}`,
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ];

      const result = await generateText({
        model: languageModel,
        messages,
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

      logger.error({ detail: errorMessage, provider: provider.providerType }, '[Universal Router] Vision provider failed');

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
        logger.warn({ err: lastError }, '[Universal Router] Vision error is not retryable, stopping');
        break;
      }
    }
  }

  throw new FailoverError(featureType as import('./providers/types').FeatureType, [
    {
      provider: providerOrder[providerOrder.length - 1]?.provider.providerType as import('./providers/types').ProviderName || 'unknown',
      error: lastError || new Error('Unknown error'),
      timestamp: new Date(),
      durationMs: 0,
    },
  ]);
}

/**
 * 특정 Vision 제공자로 이미지 분석
 */
export async function generateVisionWithSpecificProvider(
  providerType: string,
  options: Omit<VisionGenerateOptions, 'featureType'> & { featureType?: string }
): Promise<GenerateResult> {
  const {
    featureType = 'face_analysis',
    teacherId,
    maxOutputTokens = 2048,
    temperature,
    system,
    imageBase64,
    mimeType,
    prompt,
  } = options;

  const registry = getProviderRegistry(db);
  const providers = await registry.list({ enabledOnly: true });
  const provider = providers.find(p => (p as unknown as Provider).providerType === providerType);

  if (!provider) {
    throw new Error(`Provider ${providerType} is not configured or enabled`);
  }

  const typedProvider = provider as unknown as Provider;

  // Vision 지원 모델 찾기
  const model = provider.models.find(m => m.supportsVision && m.isDefault) ||
                provider.models.find(m => m.supportsVision);

  if (!model) {
    throw new Error(`Provider ${providerType} does not have a vision-capable model`);
  }

  const startTime = Date.now();

  const isReady = await setupProviderEnv(typedProvider);
  if (!isReady) {
    throw new Error(`Provider ${providerType} is not configured or enabled`);
  }

  const languageModel = createLanguageModel(typedProvider, model as unknown as Model);

  const messages: ModelMessage[] = [
    {
      role: 'user',
      content: [
        {
          type: 'image',
          image: `data:${mimeType};base64,${imageBase64}`,
        },
        {
          type: 'text',
          text: prompt,
        },
      ],
    },
  ];

  const result = await generateText({
    model: languageModel,
    messages,
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
