/**
 * 폴백 체인 페처
 *
 * 여러 데이터 소스를 우선순위 순으로 시도합니다.
 * 첫 번째 성공한 소스의 결과를 반환합니다.
 *
 * 우선순위:
 * 1. 공공데이터포털 API (공식 데이터)
 * 2. 커리어넷 API (교육부 데이터)
 * 3. 내장 시드 데이터 (항상 사용 가능)
 * 4. Perplexity AI (웹 검색, 최후의 수단)
 */

import { logger } from '@/lib/logger'
import type { BaseDataSource, FetchResult, DataSourceType } from './types'

export type FallbackResult<T> = FetchResult<T> & {
  attemptedSources: { type: DataSourceType; error?: string }[]
  usedSource: DataSourceType
}

export async function fetchWithFallback<T>(
  sources: BaseDataSource<T>[],
  operation: (source: BaseDataSource<T>) => Promise<FetchResult<T[]>>,
): Promise<FallbackResult<T[]>> {
  const attempts: { type: DataSourceType; error?: string }[] = []

  for (const source of sources) {
    try {
      const result = await operation(source)

      if (result.success && result.data && result.data.length > 0) {
        logger.info(
          { source: source.type, count: result.data.length },
          'Fallback fetcher: success',
        )
        return {
          ...result,
          attemptedSources: attempts,
          usedSource: source.type,
        }
      }

      attempts.push({
        type: source.type,
        error: result.error ?? '데이터 없음',
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : '알 수 없는 오류'
      attempts.push({ type: source.type, error: msg })
      logger.warn(
        { source: source.type, error: msg },
        'Fallback fetcher: source failed, trying next',
      )
    }
  }

  // 모든 소스 실패
  logger.error(
    { attempts },
    'Fallback fetcher: all sources failed',
  )

  return {
    success: false,
    data: null,
    totalCount: 0,
    source: sources[0]?.type ?? 'data_go_kr_basic',
    error: `모든 데이터 소스에서 실패했습니다. (시도: ${attempts.map(a => a.type).join(', ')})`,
    attemptedSources: attempts,
    usedSource: sources[0]?.type ?? 'data_go_kr_basic',
  }
}
