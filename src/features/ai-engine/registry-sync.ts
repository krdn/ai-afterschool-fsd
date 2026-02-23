/**
 * Provider Registry - Sync & Validation
 *
 * 제공자 연결 검증과 모델 동기화 로직입니다.
 * provider-registry.ts의 validate/syncModels 메서드에서 위임(delegate)하여 사용합니다.
 */

import type { PrismaClient } from '@prisma/client';
import { getAdapter } from './adapters';
import type {
  ProviderType,
  ProviderWithModels,
  ModelConfig,
  ValidationResult,
} from './types';

/**
 * 제공자 연결을 검증합니다.
 *
 * @param db - Prisma 클라이언트
 * @param provider - 검증할 제공자 (모델 포함)
 * @param invalidateCache - 캐시 무효화 콜백
 * @returns 검증 결과
 */
export async function validateProvider(
  db: PrismaClient,
  provider: ProviderWithModels,
  invalidateCache: (id: string) => void
): Promise<ValidationResult> {
  try {
    const adapter = getAdapter(provider.providerType as ProviderType);
    const result = await adapter.validate(provider);

    // 검증 결과 DB에 업데이트
    await db.provider.update({
      where: { id: provider.id },
      data: {
        isValidated: result.isValid,
        validatedAt: result.isValid ? new Date() : null,
      },
    });

    // 캐시 무효화
    invalidateCache(provider.id);

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // 검증 실패 DB에 업데이트
    await db.provider.update({
      where: { id: provider.id },
      data: {
        isValidated: false,
        validatedAt: null,
      },
    });

    // 캐시 무효화
    invalidateCache(provider.id);

    return {
      isValid: false,
      error: errorMessage,
    };
  }
}

/**
 * 제공자의 모델 목록을 동기화합니다.
 *
 * @param db - Prisma 클라이언트
 * @param provider - 동기화할 제공자 (모델 포함)
 * @param invalidateCache - 캐시 무효화 콜백
 * @param getProvider - 제공자 재조회 함수 (캐시 무효화 후 최신 데이터 조회)
 * @returns 동기화된 모델 목록
 */
export async function syncProviderModels(
  db: PrismaClient,
  provider: ProviderWithModels,
  invalidateCache: (id: string) => void,
  getProvider: (id: string) => Promise<ProviderWithModels | null>
): Promise<ModelConfig[]> {
  const adapter = getAdapter(provider.providerType as ProviderType);
  const models = await adapter.listModels(provider);

  // 기존 모델 목록
  const existingModels = await db.model.findMany({
    where: { providerId: provider.id },
  });

  const existingModelIds = new Set(existingModels.map((m) => m.modelId));
  const newModelIds = new Set(models.map((m) => m.modelId));

  // 새 모델 추가
  for (const model of models) {
    if (!existingModelIds.has(model.modelId)) {
      await db.model.create({
        data: {
          providerId: provider.id,
          modelId: model.modelId,
          displayName: model.displayName,
          contextWindow: model.contextWindow,
          supportsVision: model.supportsVision,
          supportsTools: model.supportsTools,
        },
      });
    }
  }

  // Ollama/동적 제공자: 서버에 없는 모델은 DB에서 제거
  // (단, 기본 모델(isDefault)은 제거하지 않음 - 수동 등록된 모델 보호)
  if (models.length > 0) {
    const modelsToRemove = existingModels.filter(
      (m) => !newModelIds.has(m.modelId) && !m.isDefault
    );
    for (const model of modelsToRemove) {
      await db.model.delete({ where: { id: model.id } });
    }
  }

  // 캐시 무효화
  invalidateCache(provider.id);

  // 업데이트된 모델 목록 반환
  const updatedProvider = await getProvider(provider.id);
  return updatedProvider?.models || [];
}
