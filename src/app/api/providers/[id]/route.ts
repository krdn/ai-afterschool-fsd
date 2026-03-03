/**
 * Provider Detail API Routes
 *
 * GET /api/providers/[id] - 특정 제공자 조회
 * PATCH /api/providers/[id] - 제공자 수정
 * DELETE /api/providers/[id] - 제공자 삭제
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/dal';
import { db } from '@/lib/db/client';
import type { AuthType, CostTier, QualityTier } from '@/features/ai-engine';
import { encryptApiKey, isEncryptionConfigured } from '@/features/ai-engine/encryption';
import { UpdateProviderSchema } from '@/lib/validations/providers';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/providers/[id]
 * 특정 제공자를 조회합니다.
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;

    // 인증 및 권한 확인
    const session = await verifySession();
    if (session.role !== 'DIRECTOR') {
      return NextResponse.json(
        { error: 'Unauthorized: DIRECTOR role required' },
        { status: 403 }
      );
    }

    // 제공자 조회
    const provider = await db.provider.findUnique({
      where: { id },
      include: { models: true },
    });

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    // API 키 존재 여부를 hasApiKey 필드로 변환
    const providerWithKeyStatus = {
      ...provider,
      hasApiKey: !!provider.apiKeyEncrypted,
      apiKeyEncrypted: undefined, // 보안상 민감한 필드 제거
    };

    return NextResponse.json({ provider: providerWithKeyStatus });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching provider');
    return NextResponse.json(
      { error: 'Failed to fetch provider' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/providers/[id]
 * 제공자 정보를 수정합니다.
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;

    // 인증 및 권한 확인
    const session = await verifySession();
    if (session.role !== 'DIRECTOR') {
      return NextResponse.json(
        { error: 'Unauthorized: DIRECTOR role required' },
        { status: 403 }
      );
    }

    // 제공자 존재 확인
    const existingProvider = await db.provider.findUnique({
      where: { id },
    });

    if (!existingProvider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    // 요청 본문 파싱 및 검증
    const body = await request.json();
    const parsed = UpdateProviderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const {
      name,
      baseUrl,
      apiKey,
      authType,
      customAuthHeader,
      capabilities,
      costTier,
      qualityTier,
      isEnabled,
    } = parsed.data;

    // 업데이트 데이터 준비
    const updateData: Record<string, unknown> = {
      ...(name !== undefined && { name }),
      ...(baseUrl !== undefined && { baseUrl }),
      ...(authType !== undefined && { authType: authType as AuthType }),
      ...(customAuthHeader !== undefined && { customAuthHeader }),
      ...(capabilities !== undefined && { capabilities }),
      ...(costTier !== undefined && { costTier: costTier as CostTier }),
      ...(qualityTier !== undefined && { qualityTier: qualityTier as QualityTier }),
      ...(isEnabled !== undefined && { isEnabled }),
    };

    // API 키가 변경되면 암호화 및 검증 상태 리셋
    if (apiKey !== undefined) {
      if (apiKey) {
        if (!isEncryptionConfigured()) {
          return NextResponse.json(
            { error: 'API_KEY_ENCRYPTION_SECRET 환경 변수가 설정되지 않았습니다' },
            { status: 500 }
          );
        }
        updateData.apiKeyEncrypted = encryptApiKey(apiKey);
      } else {
        updateData.apiKeyEncrypted = null;
      }
      updateData.isValidated = false;
      updateData.validatedAt = null;
    }

    // 제공자 업데이트
    const provider = await db.provider.update({
      where: { id },
      data: updateData,
      include: { models: true },
    });

    // API 키 존재 여부를 hasApiKey 필드로 변환
    const providerWithKeyStatus = {
      ...provider,
      hasApiKey: !!provider.apiKeyEncrypted,
      apiKeyEncrypted: undefined, // 보안상 민감한 필드 제거
    };

    return NextResponse.json({
      provider: providerWithKeyStatus,
      message: 'Provider updated successfully',
    });
  } catch (error) {
    logger.error({ err: error }, 'Error updating provider');
    const errorMessage = error instanceof Error ? error.message : 'Failed to update provider';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/providers/[id]
 * 제공자를 삭제합니다.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;

    // 인증 및 권한 확인
    const session = await verifySession();
    if (session.role !== 'DIRECTOR') {
      return NextResponse.json(
        { error: 'Unauthorized: DIRECTOR role required' },
        { status: 403 }
      );
    }

    // 제공자 존재 확인
    const existingProvider = await db.provider.findUnique({
      where: { id },
    });

    if (!existingProvider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    // 제공자 삭제 (연결된 모델은 cascade로 자동 삭제)
    await db.provider.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'Provider deleted successfully',
    });
  } catch (error) {
    logger.error({ err: error }, 'Error deleting provider');
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete provider';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
