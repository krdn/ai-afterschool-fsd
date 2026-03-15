/**
 * 시드 데이터 소스 어댑터
 *
 * API 키 불필요 — 내장 데이터로 즉시 사용 가능.
 * 공공 API가 불가할 때 폴백으로 동작.
 */

import type { BaseDataSource, FetchResult, PublicUniversityInfo } from './types'
import { KOREAN_UNIVERSITIES, searchSeedUniversities } from './seed-data'

export class SeedDataSource implements BaseDataSource<PublicUniversityInfo> {
  readonly type = 'data_go_kr_basic' as const // 기본정보와 같은 type 사용 (폴백)
  readonly name = '내장 대학 데이터 (시드)'

  async testConnection(): Promise<{ connected: boolean; error?: string }> {
    return { connected: true } // 항상 사용 가능
  }

  async searchByUniversity(
    universityName: string,
    _options?: { year?: number; pageNo?: number; numOfRows?: number },
  ): Promise<FetchResult<PublicUniversityInfo[]>> {
    const data = searchSeedUniversities(universityName)
    return {
      success: true,
      data,
      totalCount: data.length,
      source: this.type,
    }
  }

  async fetchAll(options?: {
    pageNo?: number; numOfRows?: number
  }): Promise<FetchResult<PublicUniversityInfo[]>> {
    const pageNo = options?.pageNo ?? 1
    const numOfRows = options?.numOfRows ?? 20
    const start = (pageNo - 1) * numOfRows
    const data = KOREAN_UNIVERSITIES.slice(start, start + numOfRows)

    return {
      success: true,
      data,
      totalCount: KOREAN_UNIVERSITIES.length,
      source: this.type,
    }
  }
}
