/**
 * Provider Validation API Route
 *
 * POST /api/providers/[id]/validate - 연결 테스트
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/dal';
import { db } from '@/lib/db/client';
import { getProviderRegistry } from '@/features/ai-engine';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * POST /api/providers/[id]/validate
 * 제공자 연결을 테스트합니다.
 */
export async function POST(
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

    // ProviderRegistry를 통해 검증
    const registry = getProviderRegistry(db);
    const result = await registry.validate(id);

    if (result.isValid) {
      return NextResponse.json({
        valid: true,
        message: 'Connection successful',
        details: result.details,
      });
    } else {
      return NextResponse.json({
        valid: false,
        error: result.error || 'Connection failed',
        details: result.details,
      }, { status: 400 });
    }
  } catch (error) {
    logger.error({ err: error }, 'Error validating provider');
    const errorMessage = error instanceof Error ? error.message : 'Failed to validate provider';
    return NextResponse.json(
      { valid: false, error: errorMessage },
      { status: 500 }
    );
  }
}
