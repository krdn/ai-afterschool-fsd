/**
 * Universal LLM Hub - Core Types
 * 
 * DB 스키마에 맞는 타입 정의와 함께 기존 타입과의 호환성을 유지합니다.
 */

import type { Provider, Model, FeatureMapping } from '@prisma/client';

// =============================================================================
// 기본 타입 (Enums)
// =============================================================================

export type ProviderType =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'ollama'
  | 'deepseek'
  | 'mistral'
  | 'cohere'
  | 'xai'
  | 'zhipu'
  | 'moonshot'
  | 'openrouter'
  | 'custom';

export type AuthType = 'none' | 'api_key' | 'bearer' | 'custom_header';

export type CostTier = 'free' | 'low' | 'medium' | 'high';

export type QualityTier = 'fast' | 'balanced' | 'premium';

export type Capability =
  | 'vision'
  | 'function_calling'
  | 'json_mode'
  | 'streaming'
  | 'tools';

export type MatchMode = 'auto_tag' | 'specific_model';

export type FallbackMode = 'next_priority' | 'any_available' | 'fail';

// =============================================================================
// Provider 관련 타입
// =============================================================================

/**
 * DB Provider 모델의 TypeScript 타입
 * Prisma 타입에서 파생
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ProviderConfig extends Provider { }

/**
 * Provider 생성/수정 시 입력 타입
 */
export interface ProviderInput {
  name: string;
  providerType: ProviderType;
  baseUrl?: string | null;
  apiKey?: string | null;
  authType: AuthType;
  customAuthHeader?: string | null;
  capabilities?: Capability[];
  costTier: CostTier;
  qualityTier: QualityTier;
  isEnabled?: boolean;
}

/**
 * Provider와 포함된 Models
 */
export interface ProviderWithModels extends Provider {
  models: Model[];
  hasApiKey?: boolean; // API 응답에서 추가되는 필드
}

// =============================================================================
// Model 관련 타입
// =============================================================================

/**
 * DB Model 모델의 TypeScript 타입
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ModelConfig extends Model { }

/**
 * Model 생성/수정 시 입력 타입
 */
export interface ModelInput {
  providerId: string;
  modelId: string;
  displayName: string;
  contextWindow?: number | null;
  supportsVision?: boolean;
  supportsTools?: boolean;
  defaultParams?: ModelParams | null;
  isDefault?: boolean;
}

/**
 * 모델 파라미터
 */
export interface ModelParams {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  [key: string]: unknown;
}

// =============================================================================
// FeatureMapping 관련 타입
// =============================================================================

/**
 * DB FeatureMapping 모델의 TypeScript 타입
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface FeatureMappingConfig extends FeatureMapping { }

/**
 * FeatureMapping 생성/수정 시 입력 타입
 */
export interface FeatureMappingInput {
  featureType: string;
  matchMode: MatchMode;
  requiredTags?: string[];
  excludedTags?: string[];
  specificModelId?: string | null;
  priority?: number;
  fallbackMode: FallbackMode;
}

/**
 * 해상도 요구사항
 * 모델 선택 시 추가 필터링 조건
 */
export interface ResolutionRequirements {
  needsVision?: boolean;
  needsTools?: boolean;
  preferredCost?: CostTier;
  preferredQuality?: QualityTier;
  minContextWindow?: number;
}

// =============================================================================
// 레지스트리 관련 타입
// =============================================================================

import type { BaseAdapter } from './adapters/base';

/**
 * 레지스트리 엔트리 - Provider와 Adapter 연결
 */
export interface RegistryEntry {
  provider: ProviderConfig;
  adapter: BaseAdapter;
}

/**
 * 해상도 결과 - 라우팅 결과
 */
export interface ResolutionResult {
  provider: ProviderConfig;
  model: ModelConfig;
}

/**
 * 검증 결과
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  details?: Record<string, unknown>;
}

/**
 * 모델 정보
 */
export interface ModelInfo {
  id: string;
  modelId: string;
  displayName: string;
  contextWindow?: number;
  supportsVision: boolean;
  supportsTools: boolean;
}

// =============================================================================
// 기존 타입과의 호환성
// =============================================================================

import type { ProviderName as LegacyProviderName, FeatureType as LegacyFeatureType } from './providers/types';

export type ProviderName = LegacyProviderName;
export type FeatureType = LegacyFeatureType;

export { PROVIDER_CONFIGS, COST_PER_MILLION_TOKENS, type FeatureConfig } from './providers/types';

/**
 * Legacy ProviderName을 새로운 ProviderType으로 매핑
 */
export const PROVIDER_NAME_TO_TYPE: Record<LegacyProviderName, ProviderType> = {
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

/**
 * ProviderType을 Legacy ProviderName으로 매핑
 */
export function providerTypeToName(type: ProviderType): LegacyProviderName | null {
  const entries = Object.entries(PROVIDER_NAME_TO_TYPE) as [LegacyProviderName, ProviderType][];
  const found = entries.find(([, t]) => t === type);
  return found ? found[0] : null;
}

/**
 * Legacy ProviderName을 ProviderType으로 변환
 */
export function providerNameToType(name: LegacyProviderName): ProviderType {
  return PROVIDER_NAME_TO_TYPE[name];
}

// =============================================================================
// 어댑터 관련 타입
// =============================================================================

import type { ModelMessage, LanguageModel, LanguageModelUsage } from 'ai';

export type { LanguageModelUsage };

/**
 * 생성 옵션
 */
export interface GenerateOptions {
  model: LanguageModel;
  messages?: ModelMessage[];
  prompt?: string;
  system?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  [key: string]: unknown;
}

/**
 * 생성 결과
 */
export interface GenerateResult {
  text: string;
  usage: LanguageModelUsage;
}

/**
 * 스트림 결과
 */
export interface StreamResult {
  stream: AsyncIterable<string>;
  provider: string;
  model: string;
}
