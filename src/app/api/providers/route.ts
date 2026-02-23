/**
 * Provider API Routes
 *
 * GET /api/providers - 제공자 목록 조회
 * POST /api/providers - 새 제공자 등록
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/dal';
import { getProviderTemplate } from '@/features/ai-engine';
import type { ProviderInput, ProviderType, AuthType } from '@/features/ai-engine';
import { db } from '@/lib/db/client';
import { CreateProviderSchema } from '@/lib/validations/providers';
import { logger } from '@/lib/logger';

/**
 * GET /api/providers
 * 제공자 목록을 조회합니다.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // 인증 및 권한 확인
    const session = await verifySession();
    if (session.role !== 'DIRECTOR') {
      return NextResponse.json(
        { error: 'Unauthorized: DIRECTOR role required' },
        { status: 403 }
      );
    }

    // 쿼리 파라미터 파싱
    const { searchParams } = new URL(request.url);
    const enabledOnly = searchParams.get('enabledOnly') === 'true';

    // 제공자 목록 조회
    const providers = await db.provider.findMany({
      where: enabledOnly ? { isEnabled: true } : undefined,
      include: { models: true },
      orderBy: { createdAt: 'desc' },
    });

    // API 키 존재 여부를 hasApiKey 필드로 변환
    const providersWithKeyStatus = providers.map((provider) => ({
      ...provider,
      hasApiKey: !!provider.apiKeyEncrypted,
      apiKeyEncrypted: undefined, // 보안상 민감한 필드 제거
    }));

    return NextResponse.json({ providers: providersWithKeyStatus });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching providers');
    return NextResponse.json(
      { error: 'Failed to fetch providers' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/providers
 * 새 제공자를 등록합니다.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 인증 및 권한 확인
    const session = await verifySession();
    if (session.role !== 'DIRECTOR') {
      return NextResponse.json(
        { error: 'Unauthorized: DIRECTOR role required' },
        { status: 403 }
      );
    }

    // 요청 본문 파싱 및 검증
    const body = await request.json();
    const parsed = CreateProviderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }
    const {
      templateId,
      name,
      providerType,
      apiKey,
      baseUrl,
      authType,
      customAuthHeader,
      capabilities,
      costTier,
      qualityTier,
      isEnabled,
    } = parsed.data;

    // 템플릿 기반 설정 병합
    let finalConfig: Partial<ProviderInput> = {
      name,
      providerType: providerType as ProviderType,
      apiKey,
      baseUrl,
      authType: (authType as AuthType) || 'api_key',
      customAuthHeader,
      capabilities,
      costTier: costTier || 'medium',
      qualityTier: qualityTier || 'balanced',
      isEnabled: isEnabled ?? false,
    };

    if (templateId) {
      const template = getProviderTemplate(templateId);
      if (template) {
        // 템플릿 기본값으로 채우기
        finalConfig = {
          name: name || template.name,
          providerType: template.providerType,
          baseUrl: baseUrl || template.defaultBaseUrl,
          authType: template.defaultAuthType,
          customAuthHeader: customAuthHeader || template.customAuthHeaderName,
          capabilities: capabilities || template.defaultCapabilities,
          costTier: costTier || template.defaultCostTier,
          qualityTier: qualityTier || template.defaultQualityTier,
          apiKey: apiKey, // 사용자 입력 필요
          isEnabled: isEnabled ?? false,
        };
      }
    }

    // 필수 필드 검증
    if (!finalConfig.name || !finalConfig.providerType) {
      return NextResponse.json(
        { error: 'Missing required fields: name, providerType' },
        { status: 400 }
      );
    }

    // 제공자 생성
    const provider = await db.provider.create({
      data: {
        name: finalConfig.name,
        providerType: finalConfig.providerType,
        baseUrl: finalConfig.baseUrl,
        apiKeyEncrypted: finalConfig.apiKey || null,
        authType: finalConfig.authType || 'api_key',
        customAuthHeader: finalConfig.customAuthHeader,
        capabilities: finalConfig.capabilities || [],
        costTier: finalConfig.costTier || 'medium',
        qualityTier: finalConfig.qualityTier || 'balanced',
        isEnabled: finalConfig.isEnabled ?? false,
      },
      include: { models: true },
    });

    // 템플릿에 기본 모델이 있으면 생성
    if (templateId) {
      const template = getProviderTemplate(templateId);
      if (template?.defaultModels?.length) {
        for (const model of template.defaultModels) {
          await db.model.create({
            data: {
              providerId: provider.id,
              modelId: model.modelId,
              displayName: model.displayName,
              contextWindow: model.contextWindow,
              supportsVision: model.supportsVision ?? false,
              supportsTools: false,
              isDefault: false,
            },
          });
        }
      }
    }

    // 업데이트된 제공자 반환 (모델 포함)
    const providerWithModels = await db.provider.findUnique({
      where: { id: provider.id },
      include: { models: true },
    });

    // API 키 존재 여부를 hasApiKey 필드로 변환
    const providerWithKeyStatus = providerWithModels ? {
      ...providerWithModels,
      hasApiKey: !!providerWithModels.apiKeyEncrypted,
      apiKeyEncrypted: undefined, // 보안상 민감한 필드 제거
    } : null;

    return NextResponse.json(
      { provider: providerWithKeyStatus, message: 'Provider created successfully' },
      { status: 201 }
    );
  } catch (error) {
    logger.error({ err: error }, 'Error creating provider');
    const errorMessage = error instanceof Error ? error.message : 'Failed to create provider';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
