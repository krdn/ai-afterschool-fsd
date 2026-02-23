'use server';

/**
 * Feature Mapping Server Actions
 *
 * 서버 액션 기반 기능 매핑 관리
 */

import { revalidatePath } from 'next/cache';
import { FeatureResolver } from '@/features/ai-engine';
import { verifySession } from '@/lib/dal';
import { logger } from '@/lib/logger';
import { db } from '@/lib/db/client';
import type {
  FeatureMappingInput,
  FeatureMappingConfig,
  ResolutionRequirements,
  ResolutionResult,
} from '@/features/ai-engine';
import { ok, fail, okVoid, type ActionResult, type ActionVoidResult } from "@/lib/errors/action-result";

// ============================================================================
// Permission Check Helper
// ============================================================================

/**
 * DIRECTOR 권한 확인
 */
async function checkDirectorPermission(): Promise<void> {
  const session = await verifySession();
  if (!session || session.role !== 'DIRECTOR') {
    throw new Error('DIRECTOR 권한이 필요합니다.');
  }
}

// ============================================================================
// Read Actions
// ============================================================================

/**
 * 기능 매핑 규칙 목록을 조회합니다.
 * 
 * @param featureType - 특정 기능 타입으로 필터링 (optional)
 * @returns 매핑 규칙 목록
 */
export async function getFeatureMappingsAction(
  featureType?: string
): Promise<ActionResult<FeatureMappingConfig[]>> {
  try {
    await checkDirectorPermission();

    const resolver = new FeatureResolver(db);
    const mappings = await resolver.getMappings(featureType);

    return ok(mappings as FeatureMappingConfig[]);
  } catch (error) {
    const message = error instanceof Error ? error.message : '조회에 실패했습니다.';
    logger.error({ error, featureType }, 'Failed to get feature mappings');
    return fail(message);
  }
}

/**
 * 기능에 적합한 모델을 해상도합니다.
 * 
 * @param featureType - 기능 타입
 * @param requirements - 해상도 요구사항 (optional)
 * @returns 해상도 결과
 */
type ResolvedFeature = {
  provider: { id: string; name: string; providerType: string };
  model: {
    id: string;
    modelId: string;
    displayName: string;
    contextWindow: number | null;
    supportsVision: boolean;
    supportsTools: boolean;
  };
  priority: number;
}

export async function resolveFeatureAction(
  featureType: string,
  requirements?: ResolutionRequirements
): Promise<ActionResult<ResolvedFeature>> {
  try {
    await checkDirectorPermission();

    const resolver = new FeatureResolver(db);
    const result = await resolver.resolve(featureType, requirements);

    if (!result) {
      return fail('해당 기능에 적합한 모델을 찾을 수 없습니다.');
    }

    return ok({
      provider: {
        id: result.provider.id,
        name: result.provider.name,
        providerType: result.provider.providerType,
      },
      model: {
        id: result.model.id,
        modelId: result.model.modelId,
        displayName: result.model.displayName,
        contextWindow: result.model.contextWindow ?? null,
        supportsVision: result.model.supportsVision,
        supportsTools: result.model.supportsTools,
      },
      priority: result.priority,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '해상도에 실패했습니다.';
    logger.error({ error, featureType }, 'Failed to resolve feature');
    return fail(message);
  }
}

/**
 * 폴 백 체인 전체를 조회합니다.
 * 
 * @param featureType - 기능 타입
 * @returns 우선순위 순으로 정렬된 해상도 결과 배열
 */
type ResolutionChainItem = {
  provider: { id: string; name: string; providerType: string };
  model: {
    id: string;
    modelId: string;
    displayName: string;
    contextWindow: number | null;
    supportsVision: boolean;
    supportsTools: boolean;
  };
  priority: number;
  fallbackMode: string;
}

export async function getResolutionChainAction(
  featureType: string
): Promise<ActionResult<ResolutionChainItem[]>> {
  try {
    await checkDirectorPermission();

    const resolver = new FeatureResolver(db);
    const results = await resolver.resolveWithFallback(featureType);

    return ok(results.map((r) => ({
      provider: {
        id: r.provider.id,
        name: r.provider.name,
        providerType: r.provider.providerType,
      },
      model: {
        id: r.model.id,
        modelId: r.model.modelId,
        displayName: r.model.displayName,
        contextWindow: r.model.contextWindow ?? null,
        supportsVision: r.model.supportsVision,
        supportsTools: r.model.supportsTools,
      },
      priority: r.priority,
      fallbackMode: r.fallbackMode,
    })));
  } catch (error) {
    const message = error instanceof Error ? error.message : '체인 조회에 실패했습니다.';
    logger.error({ error, featureType }, 'Failed to get resolution chain');
    return fail(message);
  }
}

// ============================================================================
// Write Actions
// ============================================================================

/**
 * 새로운 매핑 규칙을 생성합니다.
 * 
 * @param input - 매핑 입력 데이터
 * @returns 생성된 매핑 설정
 */
export async function createFeatureMappingAction(
  input: FeatureMappingInput
): Promise<ActionResult<FeatureMappingConfig>> {
  try {
    await checkDirectorPermission();

    // 검증
    if (!input.featureType || !input.matchMode || !input.fallbackMode) {
      return fail('필수 필드가 누락되었습니다.');
    }

    if (input.matchMode === 'specific_model' && !input.specificModelId) {
      return fail('specific_model 모드에는 specificModelId가 필요합니다.');
    }

    const resolver = new FeatureResolver(db);
    const mapping = await resolver.createOrUpdateMapping(input);

    revalidatePath('/admin/llm-features');

    logger.info(
      { featureType: input.featureType, matchMode: input.matchMode },
      'Feature mapping created via action'
    );

    return ok(mapping);
  } catch (error) {
    const message = error instanceof Error ? error.message : '생성에 실패했습니다.';
    logger.error({ error, input }, 'Failed to create feature mapping');
    return fail(message);
  }
}

/**
 * 매핑 규칙을 수정합니다.
 * 
 * @param id - 매핑 ID
 * @param input - 업데이트할 데이터
 * @returns 업데이트된 매핑 설정
 */
export async function updateFeatureMappingAction(
  id: string,
  input: Partial<FeatureMappingInput>
): Promise<ActionResult<FeatureMappingConfig>> {
  try {
    await checkDirectorPermission();

    // matchMode 변경 시 검증
    if (input.matchMode === 'specific_model' && input.specificModelId === undefined) {
      // 기존 값 확인 필요
      const existing = await db.featureMapping.findUnique({
        where: { id },
      });

      if (!existing || !existing.specificModelId) {
        return fail('specific_model 모드에는 specificModelId가 필요합니다.');
      }
    }

    const updateData: Partial<{
      matchMode: string;
      requiredTags: string[];
      excludedTags: string[];
      specificModelId: string | null;
      priority: number;
      fallbackMode: string;
    }> = {};

    if (input.matchMode !== undefined) updateData.matchMode = input.matchMode;
    if (input.requiredTags !== undefined) updateData.requiredTags = input.requiredTags;
    if (input.excludedTags !== undefined) updateData.excludedTags = input.excludedTags;
    if (input.specificModelId !== undefined) updateData.specificModelId = input.specificModelId;
    if (input.priority !== undefined) updateData.priority = input.priority;
    if (input.fallbackMode !== undefined) updateData.fallbackMode = input.fallbackMode;

    const updated = await db.featureMapping.update({
      where: { id },
      data: updateData,
    });

    revalidatePath('/admin/llm-features');

    logger.info({ mappingId: id }, 'Feature mapping updated via action');

    return ok(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : '수정에 실패했습니다.';
    logger.error({ error, id, input }, 'Failed to update feature mapping');
    return fail(message);
  }
}

/**
 * 매핑 규칙을 삭제합니다.
 * 
 * @param id - 매핑 ID
 */
export async function deleteFeatureMappingAction(
  id: string
): Promise<ActionVoidResult> {
  try {
    await checkDirectorPermission();

    await db.featureMapping.delete({
      where: { id },
    });

    revalidatePath('/admin/llm-features');

    logger.info({ mappingId: id }, 'Feature mapping deleted via action');

    return okVoid();
  } catch (error) {
    const message = error instanceof Error ? error.message : '삭제에 실패했습니다.';
    logger.error({ error, id }, 'Failed to delete feature mapping');
    return fail(message);
  }
}
