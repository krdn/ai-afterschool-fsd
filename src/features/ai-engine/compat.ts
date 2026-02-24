/**
 * Compatibility Layer (compat.ts)
 * 
 * 기존 코드가 기존 타입을 계속 사용할 수 있도록 브리지 역할을 합니다.
 * 
 * 주의: 이 파일은 기존 코드를 수정하지 않기 위한 임시 레이어입니다.
 * 장기적으로는 모든 코드를 새 타입으로 마이그레이션하는 것을 권장합니다.
 */

import { db } from '@/lib/db/client';
import { getProviderRegistry } from './provider-registry';
import { FeatureResolver } from './feature-resolver';
import type {
  ProviderName as LegacyProviderName,
  FeatureType as LegacyFeatureType,
  ProviderConfig as LegacyProviderConfig,
  FeatureConfig as LegacyFeatureConfig,
} from './providers/types';

// =============================================================================
// 타입 별칭 (기존 union type -> string)
// =============================================================================

/**
 * @deprecated 새 코드에서는 string을 직접 사용하세요
 */
export type ProviderNameString = string;

/**
 * @deprecated 새 코드에서는 string을 직접 사용하세요
 */
export type FeatureTypeString = string;

// =============================================================================
// 레거시 타입에서 새 타입으로 변환
// =============================================================================

/**
 * 레거시 ProviderName을 새로운 ProviderType 문자열로 변환
 * 
 * @param provider - 레거시 ProviderName
 * @returns 새로운 ProviderType 문자열
 */
export function legacyProviderToNew(provider: LegacyProviderName): string {
  const mapping: Record<LegacyProviderName, string> = {
    anthropic: 'anthropic',
    openai: 'openai',
    google: 'google',
    ollama: 'ollama',
    deepseek: 'deepseek',
    mistral: 'mistral',
    cohere: 'cohere',
    xai: 'xai',
    zhipu: 'zhipu',
    moonshot: 'moonshot',
    openrouter: 'openrouter',
  };
  return mapping[provider] ?? provider;
}

/**
 * 새로운 ProviderType 문자열을 레거시 ProviderName으로 변환
 * 
 * @param providerType - 새로운 ProviderType 문자열
 * @returns 레거시 ProviderName 또는 null
 */
export function newProviderToLegacy(providerType: string): LegacyProviderName | null {
  const validProviders: LegacyProviderName[] = [
    'anthropic', 'openai', 'google', 'ollama', 'deepseek',
    'mistral', 'cohere', 'xai', 'zhipu', 'moonshot'
  ];
  return validProviders.find(p => p === providerType) ?? null;
}

/**
 * 레거시 FeatureType을 그대로 반환 (이미 문자열 호환)
 * 
 * @param feature - 레거시 FeatureType
 * @returns 기능 타입 문자열
 */
export function legacyFeatureToNew(feature: LegacyFeatureType): string {
  return feature;
}

// =============================================================================
// Config 어댑터
// =============================================================================

/**
 * 레거시 형식으로 제공자 설정을 조회합니다.
 * 
 * @param provider - 제공자 이름
 * @returns 레거시 형식의 제공자 설정
 */
export async function getLLMConfigAdapter(provider: string): Promise<LegacyProviderConfig | null> {
  const registry = getProviderRegistry(db);
  const providers = await registry.list();
  const found = providers.find(p => 
    (p as unknown as { providerType: string }).providerType === provider
  );

  if (!found) {
    return null;
  }

  const typedProvider = found as unknown as {
    id: string;
    name: string;
    providerType: string;
    baseUrl: string | null;
    apiKeyEncrypted: string | null;
    isEnabled: boolean;
    models: Array<{
      modelId: string;
      isDefault: boolean;
    }>;
  };

  const defaultModel = typedProvider.models.find(m => m.isDefault)?.modelId ?? 
                       typedProvider.models[0]?.modelId ??
                       'default';

  // 레거시 형식으로 변환
  return {
    name: provider as LegacyProviderName,
    displayName: typedProvider.name,
    requiresApiKey: !!typedProvider.apiKeyEncrypted,
    supportsVision: true, // 새 시스템에서는 모델 레벨에서 관리
    defaultModel,
    models: typedProvider.models.map(m => m.modelId),
  };
}

/**
 * 레거시 형식으로 기능 설정을 조회합니다.
 * 
 * @param featureType - 기능 타입
 * @returns 레거시 형식의 기능 설정
 */
export async function getFeatureConfigAdapter(featureType: string): Promise<LegacyFeatureConfig> {
  const resolver = new FeatureResolver(db);
  
  // 해당 기능의 모든 매핑을 조회
  const mappings = await resolver.getMappings(featureType);
  
  if (mappings.length === 0) {
    // 기본값 반환
    return {
      featureType: featureType as LegacyFeatureType,
      primaryProvider: 'ollama',
      fallbackOrder: ['anthropic', 'openai', 'google'],
    };
  }

  // 우선순위 순으로 정렬
  const sortedMappings = mappings.sort((a, b) => (b as unknown as { priority: number }).priority - (a as unknown as { priority: number }).priority);
  
  // 첫 번째 매핑의 제공자를 primary로 사용
  const primaryMapping = sortedMappings[0];
  const primaryProvider = newProviderToLegacy(
    primaryMapping.specificModel?.provider.providerType ?? 'ollama'
  ) ?? 'ollama';

  // 나머지를 fallback으로 사용
  const fallbackOrder = sortedMappings
    .slice(1)
    .map(m => newProviderToLegacy(m.specificModel?.provider.providerType ?? 'ollama'))
    .filter((p): p is LegacyProviderName => p !== null);

  return {
    featureType: featureType as LegacyFeatureType,
    primaryProvider,
    fallbackOrder: fallbackOrder.length > 0 
      ? fallbackOrder 
      : ['anthropic', 'openai', 'google'],
    modelOverride: primaryMapping.specificModel?.modelId ?? undefined,
  };
}

// =============================================================================
// 옵션 변환
// =============================================================================

/**
 * 레거시 GenerateOptions를 새로운 형식으로 변환
 * 
 * @param options - 레거시 GenerateOptions
 * @returns 새로운 형식의 옵션
 */
export function adaptOptions(options: {
  prompt: string;
  featureType: string;
  teacherId?: string;
  maxOutputTokens?: number;
  temperature?: number;
  system?: string;
}): import('./universal-router').GenerateOptions {
  return options;
}

/**
 * 새로운 GenerateResult를 레거시 형식으로 변환
 * 
 * @param result - 새로운 GenerateResult
 * @returns 레거시 형식의 결과
 */
export function adaptResult(result: import('./universal-router').GenerateResult): {
  text: string;
  usage: { inputTokens: number; outputTokens: number; totalTokens: number };
  provider: LegacyProviderName;
  model: string;
  wasFailover: boolean;
  failoverFrom?: LegacyProviderName;
} {
  return {
    text: result.text,
    usage: {
      inputTokens: result.usage.inputTokens ?? 0,
      outputTokens: result.usage.outputTokens ?? 0,
      totalTokens: (result.usage.inputTokens ?? 0) + (result.usage.outputTokens ?? 0),
    },
    provider: newProviderToLegacy(result.provider) ?? 'ollama',
    model: result.model,
    wasFailover: result.wasFailover,
    failoverFrom: result.failoverFrom 
      ? (newProviderToLegacy(result.failoverFrom) ?? undefined)
      : undefined,
  };
}

// =============================================================================
// Provider 설정 호환성
// =============================================================================

/**
 * 기존 코드가 PROVIDER_CONFIGS를 참조할 때 사용할 수 있는 어댑터
 * DB에서 ProviderTemplate을 조회하여 동적으로 생성합니다.
 * 
 * 주의: 이 함수는 비동기이므로 PROVIDER_CONFIGS_COMPAT의 동기 사용과는 다릅니다.
 * 동기 사용이 필요한 경우 미리 캐싱하세요.
 */
export async function getProviderConfigsCompat(): Promise<
  Record<LegacyProviderName, LegacyProviderConfig>
> {
  const registry = getProviderRegistry(db);
  const providers = await registry.list();

  const configs = {} as Record<LegacyProviderName, LegacyProviderConfig>;

  for (const provider of providers) {
    const typedProvider = provider as unknown as {
      providerType: string;
      name: string;
      models: Array<{ modelId: string; isDefault: boolean }>;
    };

    const legacyName = newProviderToLegacy(typedProvider.providerType);
    if (!legacyName) continue;

    const defaultModel = typedProvider.models.find(m => m.isDefault)?.modelId ??
                         typedProvider.models[0]?.modelId ??
                         'default';

    configs[legacyName] = {
      name: legacyName,
      displayName: typedProvider.name,
      requiresApiKey: true,
      supportsVision: true,
      defaultModel,
      models: typedProvider.models.map(m => m.modelId),
    };
  }

  return configs;
}

// =============================================================================
// Re-exports for convenience
// =============================================================================

export type { ProviderName, FeatureType } from './providers/types';
export { PROVIDER_CONFIGS, COST_PER_MILLION_TOKENS } from './providers/types';
