/**
 * Provider Models API Routes
 *
 * GET /api/providers/[id]/models - 모델 목록 조회
 * POST /api/providers/[id]/sync - 모델 동기화
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/dal';
import { db } from '@/lib/db/client';
import { getProviderRegistry } from '@/features/ai-engine';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/providers/[id]/models
 * 제공자의 모델 목록을 조회합니다.
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

    return NextResponse.json({
      models: provider.models,
      count: provider.models.length,
    });
  } catch (error) {
    console.error('Error fetching models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/providers/[id]/sync
 * 제공자의 모델 목록을 동기화합니다.
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
    });

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    // ProviderRegistry를 통해 모델 동기화
    const registry = getProviderRegistry(db);
    const models = await registry.syncModels(id);

    return NextResponse.json({
      message: 'Models synchronized successfully',
      models,
      count: models.length,
    });
  } catch (error) {
    console.error('Error syncing models:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to sync models';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
