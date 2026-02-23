import { NextResponse } from 'next/server';
import {
  aggregatePreviousMonth,
  aggregateMonthlyUsage,
  cleanupOldUsageData,
} from '@/features/ai-engine';

// 인증용 API 키 (환경 변수에서 로드)
// Vercel Cron 또는 외부 cron 서비스에서 사용
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * LLM 사용량 월별 집계 Cron 엔드포인트
 *
 * 용도:
 * - 매월 1일에 이전 달 사용량 집계
 * - 오래된 세부 데이터 정리 (기본 90일 보존)
 *
 * 인증:
 * - Authorization 헤더에 Bearer 토큰 필요
 * - CRON_SECRET 환경 변수와 일치해야 함
 *
 * 쿼리 파라미터:
 * - year: 특정 연도 집계 (선택)
 * - month: 특정 월 집계 (선택)
 * - cleanup: 'true'이면 오래된 데이터 정리
 * - retentionDays: 데이터 보존 기간 (기본 90일)
 *
 * 사용 예:
 * - 이전 달 집계: GET /api/cron/aggregate-llm-usage
 * - 특정 월 집계: GET /api/cron/aggregate-llm-usage?year=2026&month=1
 * - 데이터 정리 포함: GET /api/cron/aggregate-llm-usage?cleanup=true&retentionDays=90
 */
export async function GET(request: Request) {
  // 인증 검증
  const authHeader = request.headers.get('authorization');

  if (!CRON_SECRET) {
    // CRON_SECRET이 설정되지 않은 경우 개발 환경에서만 허용
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'CRON_SECRET not configured' },
        { status: 500 }
      );
    }
  } else {
    // 프로덕션에서는 인증 필수
    if (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
  }

  try {
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const monthParam = searchParams.get('month');
    const cleanupParam = searchParams.get('cleanup');
    const retentionDaysParam = searchParams.get('retentionDays');

    const results: {
      aggregation?: {
        year: number;
        month: number;
        aggregated: number;
        records: Array<{
          provider: string;
          featureType: string;
          totalRequests: number;
          totalCostUsd: number;
        }>;
      };
      cleanup?: {
        deletedUsage: number;
        retainedMonthly: number;
      };
    } = {};

    // 집계 실행
    if (yearParam && monthParam) {
      // 특정 연도/월 집계
      const year = parseInt(yearParam, 10);
      const month = parseInt(monthParam, 10);

      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return NextResponse.json(
          { error: 'Invalid year or month parameter' },
          { status: 400 }
        );
      }

      const aggregation = await aggregateMonthlyUsage(year, month);
      results.aggregation = {
        year,
        month,
        aggregated: aggregation.aggregated,
        records: aggregation.records.map((r: { provider: string; featureType: string; totalRequests: number; totalCostUsd: number; }) => ({
          provider: r.provider,
          featureType: r.featureType,
          totalRequests: r.totalRequests,
          totalCostUsd: r.totalCostUsd,
        })),
      };
    } else {
      // 이전 달 자동 집계
      const aggregation = await aggregatePreviousMonth();
      results.aggregation = {
        year: aggregation.year,
        month: aggregation.month,
        aggregated: aggregation.aggregated,
        records: aggregation.records.map((r: { provider: string; featureType: string; totalRequests: number; totalCostUsd: number; }) => ({
          provider: r.provider,
          featureType: r.featureType,
          totalRequests: r.totalRequests,
          totalCostUsd: r.totalCostUsd,
        })),
      };
    }

    // 오래된 데이터 정리 (선택적)
    if (cleanupParam === 'true') {
      const retentionDays = retentionDaysParam
        ? parseInt(retentionDaysParam, 10)
        : 90;

      if (isNaN(retentionDays) || retentionDays < 1) {
        return NextResponse.json(
          { error: 'Invalid retentionDays parameter' },
          { status: 400 }
        );
      }

      const cleanup = await cleanupOldUsageData(retentionDays);
      results.cleanup = cleanup;
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    console.error('Cron aggregation error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Vercel Cron을 위한 configuration
// vercel.json에서 cron 설정:
// {
//   "crons": [{
//     "path": "/api/cron/aggregate-llm-usage?cleanup=true",
//     "schedule": "0 1 1 * *"  // 매월 1일 01:00 (UTC)
//   }]
// }
