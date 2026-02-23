/**
 * Router Utilities
 *
 * Universal Router와 Vision Router에서 공유하는
 * 내부 유틸리티 함수, 타입, 상수를 모아 둔 파일입니다.
 */

import type { LanguageModelUsage } from 'ai';
import { db } from '@/lib/db/client';
import { FeatureResolver } from './feature-resolver';
import { getAdapter } from './adapters';
import { decryptApiKey } from './encryption';

// =============================================================================
// 상수
// =============================================================================

// LLM 거부 응답 패턴 감지
export const REFUSAL_PATTERNS = [
  /^I('m| am) sorry,? I (can't|cannot|won't|will not)/i,
  /^I('m| am) not able to/i,
  /^I (can't|cannot) assist with/i,
  /^I('m| am) unable to/i,
  /^Sorry,? (but )?I (can't|cannot)/i,
  /^As an AI,? I (can't|cannot|don't)/i,
  /^I apologize,? but I (can't|cannot)/i,
];

// =============================================================================
// 타입
// =============================================================================

// Prisma 모델은 마이그레이션 후 생성됨 - 임시 타입 정의
export type Provider = {
  id: string;
  name: string;
  providerType: string;
  baseUrl: string | null;
  apiKeyEncrypted: string | null;
  authType: string;
  customAuthHeader: string | null;
  capabilities: string[];
  costTier: string;
  qualityTier: string;
  isEnabled: boolean;
  isValidated: boolean;
  validatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Model = {
  id: string;
  providerId: string;
  modelId: string;
  displayName: string;
  contextWindow: number | null;
  supportsVision: boolean;
  supportsTools: boolean;
  defaultParams: unknown;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export interface GenerateResult {
  text: string;
  usage: LanguageModelUsage;
  provider: string;
  model: string;
  wasFailover: boolean;
  failoverFrom?: string;
}

// =============================================================================
// 함수
// =============================================================================

export function isRefusalResponse(text: string): boolean {
  const trimmed = text.trim();
  // 짧은 거부 응답만 감지 (정상 JSON 응답이 이 패턴을 포함할 가능성 배제)
  if (trimmed.length > 500) return false;
  return REFUSAL_PATTERNS.some(pattern => pattern.test(trimmed));
}

// 싱글톤 FeatureResolver 인스턴스
let featureResolverInstance: FeatureResolver | null = null;

export function getFeatureResolver(): FeatureResolver {
  if (!featureResolverInstance) {
    featureResolverInstance = new FeatureResolver(db);
  }
  return featureResolverInstance;
}

/**
 * 제공자 환경 설정
 * API 키를 환경 변수에 설정합니다.
 */
export async function setupProviderEnv(provider: Provider): Promise<boolean> {
  // Ollama는 내장 제공자 — API 키 불필요
  if (provider.providerType === 'ollama') {
    if (provider.baseUrl) {
      process.env.OLLAMA_BASE_URL = provider.baseUrl;
    }
    return true;
  }

  if (!provider.isEnabled) {
    return false;
  }

  if (!provider.apiKeyEncrypted) {
    return false;
  }

  const apiKey = decryptApiKey(provider.apiKeyEncrypted);

  switch (provider.providerType) {
    case 'anthropic':
      process.env.ANTHROPIC_API_KEY = apiKey;
      break;
    case 'openai':
      process.env.OPENAI_API_KEY = apiKey;
      break;
    case 'google':
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey;
      break;
    case 'deepseek':
      process.env.DEEPSEEK_API_KEY = apiKey;
      break;
    case 'mistral':
      process.env.MISTRAL_API_KEY = apiKey;
      break;
    case 'cohere':
      process.env.COHERE_API_KEY = apiKey;
      break;
    case 'xai':
      process.env.XAI_API_KEY = apiKey;
      break;
    case 'zhipu':
      process.env.ZHIPU_API_KEY = apiKey;
      break;
    case 'moonshot':
      process.env.MOONSHOT_API_KEY = apiKey;
      break;
  }

  return true;
}

/**
 * 모델 ID로부터 LanguageModel을 생성합니다.
 */
export function createLanguageModel(provider: Provider, model: Model) {
  const adapter = getAdapter(provider.providerType as import('./types').ProviderType);

  // API 키 설정
  if (provider.apiKeyEncrypted) {
    adapter.setApiKey(decryptApiKey(provider.apiKeyEncrypted));
  }

  // Base URL 설정
  if (provider.baseUrl) {
    adapter.setBaseUrl(provider.baseUrl);
  }

  return adapter.createModel(model.modelId, provider as import('./types').ProviderConfig);
}

/**
 * FeatureResolver를 통해 제공자 순서를 결정합니다.
 */
export async function getProviderOrder(
  featureType: string,
  needsVision?: boolean
): Promise<Array<{ provider: Provider; model: Model }>> {
  const resolver = getFeatureResolver();
  const results = await resolver.resolveWithFallback(featureType, { needsVision });

  if (results.length === 0) {
    throw new Error(`No providers available for feature "${featureType}"`);
  }

  // 타입 변환: FeatureResolver의 결과를 Provider/Model 타입으로 변환
  return results.map((r) => ({
    provider: r.provider as unknown as Provider,
    model: r.model as unknown as Model,
  }));
}
