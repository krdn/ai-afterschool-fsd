/**
 * Provider Server Actions
 *
 * 'use server' 지시문을 포함한 Server Actions 모음
 * 관리자 페이지에서 사용할 제공자 관리 기능
 */

'use server';

import { revalidatePath } from 'next/cache';
import { verifySession } from '@/lib/dal';
import { db } from '@/lib/db/client';
import {
  getProviderTemplates,
  getProviderTemplate,
  ProviderTemplate,
} from '@/features/ai-engine';
import {
  getProviderRegistry,
} from '@/features/ai-engine';
import type {
  ProviderInput,
  ProviderWithModels,
  ModelConfig,
  ValidationResult,
} from '@/features/ai-engine';

// ============================================================================
// Template Actions
// ============================================================================

/**
 * 모든 템플릿을 조회합니다.
 */
export async function getTemplatesAction(): Promise<ProviderTemplate[]> {
  const session = await verifySession();
  if (session.role !== 'DIRECTOR') {
    throw new Error('Unauthorized: DIRECTOR role required');
  }

  return getProviderTemplates();
}

/**
 * 특정 템플릿을 조회합니다.
 */
export async function getTemplateAction(
  templateId: string
): Promise<ProviderTemplate | null> {
  const session = await verifySession();
  if (session.role !== 'DIRECTOR') {
    throw new Error('Unauthorized: DIRECTOR role required');
  }

  const template = getProviderTemplate(templateId);
  return template || null;
}

// ============================================================================
// Provider CRUD Actions
// ============================================================================

/**
 * 템플릿 기반으로 제공자를 생성합니다.
 */
export async function createProviderFromTemplateAction(
  templateId: string,
  config: Partial<ProviderInput>
): Promise<ProviderWithModels> {
  const session = await verifySession();
  if (session.role !== 'DIRECTOR') {
    throw new Error('Unauthorized: DIRECTOR role required');
  }

  const template = getProviderTemplate(templateId);
  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }

  // 템플릿 기본값 + 사용자 입력 병합
  const mergedConfig: ProviderInput = {
    name: config.name || template.name,
    providerType: template.providerType,
    baseUrl: config.baseUrl || template.defaultBaseUrl,
    apiKey: config.apiKey,
    authType: config.authType || template.defaultAuthType,
    customAuthHeader:
      config.customAuthHeader || template.customAuthHeaderName,
    capabilities: config.capabilities || template.defaultCapabilities,
    costTier: config.costTier || template.defaultCostTier,
    qualityTier: config.qualityTier || template.defaultQualityTier,
    isEnabled: config.isEnabled ?? false,
  };

  // ProviderRegistry를 통해 등록
  const registry = getProviderRegistry(db);
  const provider = await registry.register(mergedConfig);

  revalidatePath('/admin/llm-providers');
  return provider;
}

/**
 * 제공자 목록을 조회합니다.
 */
export async function getProvidersAction(options?: {
  enabledOnly?: boolean;
}): Promise<ProviderWithModels[]> {
  const session = await verifySession();
  if (session.role !== 'DIRECTOR') {
    throw new Error('Unauthorized: DIRECTOR role required');
  }

  const registry = getProviderRegistry(db);
  return registry.list(options);
}

/**
 * 제공자를 수정합니다.
 */
export async function updateProviderAction(
  id: string,
  input: Partial<ProviderInput>
): Promise<ProviderWithModels> {
  const session = await verifySession();
  if (session.role !== 'DIRECTOR') {
    throw new Error('Unauthorized: DIRECTOR role required');
  }

  const registry = getProviderRegistry(db);
  const provider = await registry.update(id, input);

  revalidatePath('/admin/llm-providers');
  return provider;
}

/**
 * 제공자를 삭제합니다.
 */
export async function deleteProviderAction(id: string): Promise<void> {
  const session = await verifySession();
  if (session.role !== 'DIRECTOR') {
    throw new Error('Unauthorized: DIRECTOR role required');
  }

  const registry = getProviderRegistry(db);
  await registry.remove(id);

  revalidatePath('/admin/llm-providers');
}

// ============================================================================
// Validation & Sync Actions
// ============================================================================

/**
 * 제공자 연결을 테스트합니다.
 */
export async function validateProviderAction(
  id: string
): Promise<ValidationResult> {
  const session = await verifySession();
  if (session.role !== 'DIRECTOR') {
    throw new Error('Unauthorized: DIRECTOR role required');
  }

  const registry = getProviderRegistry(db);
  const result = await registry.validate(id);

  revalidatePath('/admin/llm-providers');
  return result;
}

/**
 * 제공자의 모델 목록을 동기화합니다.
 */
export async function syncProviderModelsAction(
  id: string
): Promise<ModelConfig[]> {
  const session = await verifySession();
  if (session.role !== 'DIRECTOR') {
    throw new Error('Unauthorized: DIRECTOR role required');
  }

  const registry = getProviderRegistry(db);
  const models = await registry.syncModels(id);

  revalidatePath('/admin/llm-providers');
  return models;
}

// ============================================================================
// Model Default Actions
// ============================================================================

/**
 * 기본 모델을 설정합니다.
 */
export async function setDefaultModelAction(
  providerId: string,
  modelId: string
): Promise<void> {
  const session = await verifySession();
  if (session.role !== 'DIRECTOR') {
    throw new Error('Unauthorized: DIRECTOR role required');
  }

  // 기존 기본 모델 해제
  await db.model.updateMany({
    where: { providerId },
    data: { isDefault: false },
  });

  // 새 기본 모델 설정
  await db.model.update({
    where: { id: modelId },
    data: { isDefault: true },
  });

  revalidatePath('/admin/llm-providers');
}

// ============================================================================
// Utility Exports
// ============================================================================

// ProviderRegistry는 server-only 모듈에서 import하세요
// import { getProviderRegistry } from '@/features/ai-engine';
