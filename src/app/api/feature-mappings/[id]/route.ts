/**
 * Feature Mapping API - /api/feature-mappings/[id]
 * 
 * 개별 기능 매핑 규칙 조회, 수정, 삭제 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/dal';
import { logger } from '@/lib/logger';
import { db } from '@/lib/db/client';
import type { FeatureMappingInput } from '@/features/ai-engine';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/feature-mappings/[id]
 * 
 * 특정 기능 매핑 규칙을 조회합니다.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    // 인증 확인
    const session = await verifySession();
    if (!session || session.role !== 'DIRECTOR') {
      return NextResponse.json(
        { success: false, error: '권한이 없습니다.' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // 매핑 조회
    const mapping = await db.featureMapping.findUnique({
      where: { id },
      include: {
        specificModel: {
          include: {
            provider: true,
          },
        },
      },
    });

    if (!mapping) {
      return NextResponse.json(
        { success: false, error: '매핑을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: mapping,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch feature mapping');
    return NextResponse.json(
      { success: false, error: '매핑 조회에 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/feature-mappings/[id]
 * 
 * 기능 매핑 규칙을 수정합니다.
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    // 인증 확인
    const session = await verifySession();
    if (!session || session.role !== 'DIRECTOR') {
      return NextResponse.json(
        { success: false, error: '권한이 없습니다.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json() as Partial<FeatureMappingInput>;

    // 매핑 존재 확인
    const existing = await db.featureMapping.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '매핑을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // matchMode 변경 시 검증
    if (body.matchMode === 'specific_model' && body.specificModelId === undefined) {
      // 기존 값이 있는지 확인
      if (!existing.specificModelId) {
        return NextResponse.json(
          { success: false, error: 'specific_model 모드에는 specificModelId가 필요합니다.' },
          { status: 400 }
        );
      }
    }

    // 업데이트 데이터 구성
    const updateData: Partial<{
      matchMode: string;
      requiredTags: string[];
      excludedTags: string[];
      specificModelId: string | null;
      priority: number;
      fallbackMode: string;
    }> = {};

    if (body.matchMode !== undefined) updateData.matchMode = body.matchMode;
    if (body.requiredTags !== undefined) updateData.requiredTags = body.requiredTags;
    if (body.excludedTags !== undefined) updateData.excludedTags = body.excludedTags;
    if (body.specificModelId !== undefined) updateData.specificModelId = body.specificModelId;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.fallbackMode !== undefined) updateData.fallbackMode = body.fallbackMode;

    // 매핑 업데이트
    const updated = await db.featureMapping.update({
      where: { id },
      data: updateData,
      include: {
        specificModel: {
          include: {
            provider: true,
          },
        },
      },
    });

    logger.info({ 
      mappingId: id,
      featureType: existing.featureType 
    }, 'Feature mapping updated');

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to update feature mapping');
    return NextResponse.json(
      { success: false, error: '매핑 수정에 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/feature-mappings/[id]
 * 
 * 기능 매핑 규칙을 삭제합니다.
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    // 인증 확인
    const session = await verifySession();
    if (!session || session.role !== 'DIRECTOR') {
      return NextResponse.json(
        { success: false, error: '권한이 없습니다.' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // 매핑 존재 확인
    const existing = await db.featureMapping.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '매핑을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 매핑 삭제
    await db.featureMapping.delete({
      where: { id },
    });

    logger.info({ 
      mappingId: id,
      featureType: existing.featureType 
    }, 'Feature mapping deleted');

    return NextResponse.json({
      success: true,
      message: '매핑이 삭제되었습니다.',
    });
  } catch (error) {
    logger.error({ error }, 'Failed to delete feature mapping');
    return NextResponse.json(
      { success: false, error: '매핑 삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
}
