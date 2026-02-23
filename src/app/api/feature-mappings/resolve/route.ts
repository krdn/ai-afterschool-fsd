/**
 * Feature Mapping Resolve API - POST /api/feature-mappings/resolve
 * 
 * 기능에 대한 모델 해상도 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { FeatureResolver } from '@/features/ai-engine';
import { verifySession } from '@/lib/dal';
import { logger } from '@/lib/logger';
import { db } from '@/lib/db/client';
import type { ResolutionRequirements } from '@/features/ai-engine';

/**
 * POST /api/feature-mappings/resolve
 * 
 * 기능에 대해 적절한 모델을 해상도합니다.
 * 
 * Request body:
 * {
 *   featureType: string;
 *   requirements?: {
 *     needsVision?: boolean;
 *     needsTools?: boolean;
 *     preferredCost?: 'free' | 'low' | 'medium' | 'high';
 *     preferredQuality?: 'fast' | 'balanced' | 'premium';
 *     minContextWindow?: number;
 *   }
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 인증 확인
    const session = await verifySession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 요청 본문 파싱
    const body = await request.json() as {
      featureType: string;
      requirements?: ResolutionRequirements;
    };

    // 필수 필드 검증
    if (!body.featureType) {
      return NextResponse.json(
        { success: false, error: 'featureType이 필요합니다.' },
        { status: 400 }
      );
    }

    // FeatureResolver로 해상도 수행
    const resolver = new FeatureResolver(db);
    const result = await resolver.resolve(body.featureType, body.requirements);

    if (!result) {
      return NextResponse.json(
        { 
          success: false, 
          error: '해당 기능에 적합한 모델을 찾을 수 없습니다.',
          featureType: body.featureType,
        },
        { status: 404 }
      );
    }

    logger.info({ 
      featureType: body.featureType,
      provider: result.provider.name,
      model: result.model.displayName,
      priority: result.priority,
    }, 'Feature resolved successfully');

    return NextResponse.json({
      success: true,
      data: {
        provider: {
          id: result.provider.id,
          name: result.provider.name,
          providerType: result.provider.providerType,
        },
        model: {
          id: result.model.id,
          modelId: result.model.modelId,
          displayName: result.model.displayName,
          contextWindow: result.model.contextWindow,
          supportsVision: result.model.supportsVision,
          supportsTools: result.model.supportsTools,
        },
        priority: result.priority,
        fallbackMode: result.fallbackMode,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to resolve feature mapping');
    return NextResponse.json(
      { success: false, error: '모델 해상도에 실패했습니다.' },
      { status: 500 }
    );
  }
}
