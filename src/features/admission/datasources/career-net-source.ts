/**
 * 커리어넷 대학학과정보 어댑터
 *
 * API: https://www.career.go.kr/cnet/openapi/getOpenApi
 * 제공: 대학 목록, 학과 목록, 학과 상세 정보
 * 키 발급: https://www.career.go.kr/cnet/front/openapi/openApiMajorCenter.do
 */

import { logger } from '@/lib/logger'
import type { BaseDataSource, FetchResult, PublicMajorInfo } from './types'

const BASE_URL = 'https://www.career.go.kr/cnet/openapi/getOpenApi'
const ENV_KEY = 'CAREER_NET_API_KEY'

type CareerNetMajorItem = {
  facilName?: string     // 학교명
  majorSeq?: string      // 학과 코드
  mClass?: string        // 계열
  majorName?: string     // 학과명
  summary?: string       // 학과 설명
  department?: string    // 학위 과정
  relatedJob?: string    // 관련 직업
  relatedCerti?: string  // 관련 자격증
  relatedSubject?: string // 관련 과목
}

type CareerNetResponse = {
  dataSearch?: {
    content?: CareerNetMajorItem[]
    totalCount?: number
  }
}

function toPublicMajorInfo(raw: CareerNetMajorItem): PublicMajorInfo {
  return {
    schoolName: raw.facilName ?? '',
    majorName: raw.majorName ?? '',
    department: raw.mClass,
    curriculum: raw.summary,
    relatedJobs: raw.relatedJob,
  }
}

export class CareerNetSource implements BaseDataSource<PublicMajorInfo> {
  readonly type = 'career_net' as const
  readonly name = '커리어넷 대학학과정보'

  private getApiKey(): string {
    const key = process.env[ENV_KEY]
    if (!key) {
      throw new Error(`환경변수 ${ENV_KEY}이 설정되지 않았습니다.`)
    }
    return key
  }

  async testConnection(): Promise<{ connected: boolean; error?: string }> {
    try {
      const apiKey = this.getApiKey()
      const url = new URL(BASE_URL)
      url.searchParams.set('apiKey', apiKey)
      url.searchParams.set('svcType', 'api')
      url.searchParams.set('svcCode', 'MAJOR')
      url.searchParams.set('contentType', 'json')
      url.searchParams.set('gubun', 'univ_list')
      url.searchParams.set('perPage', '1')

      const response = await fetch(url.toString(), {
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        return { connected: false, error: `HTTP ${response.status}` }
      }

      const data = await response.json() as CareerNetResponse
      if (data.dataSearch?.totalCount != null) {
        return { connected: true }
      }

      return { connected: false, error: '예상치 못한 응답 형식' }
    } catch (error) {
      const msg = error instanceof Error ? error.message : '알 수 없는 오류'
      logger.error({ err: error }, 'CareerNet connection test failed')
      return { connected: false, error: msg }
    }
  }

  async searchByUniversity(
    universityName: string,
    options?: { year?: number; pageNo?: number; numOfRows?: number },
  ): Promise<FetchResult<PublicMajorInfo[]>> {
    try {
      const apiKey = this.getApiKey()
      const url = new URL(BASE_URL)
      url.searchParams.set('apiKey', apiKey)
      url.searchParams.set('svcType', 'api')
      url.searchParams.set('svcCode', 'MAJOR')
      url.searchParams.set('contentType', 'json')
      url.searchParams.set('gubun', 'univ_list')
      url.searchParams.set('searchTitle', universityName)
      url.searchParams.set('thisPage', String(options?.pageNo ?? 1))
      url.searchParams.set('perPage', String(options?.numOfRows ?? 100))

      const response = await fetch(url.toString(), {
        signal: AbortSignal.timeout(15000),
      })

      if (!response.ok) {
        return { success: false, data: null, totalCount: 0, source: this.type, error: `HTTP ${response.status}` }
      }

      const data = await response.json() as CareerNetResponse
      const items = data.dataSearch?.content ?? []
      const mapped = items.map(toPublicMajorInfo)

      return {
        success: true,
        data: mapped,
        totalCount: data.dataSearch?.totalCount ?? mapped.length,
        source: this.type,
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : '알 수 없는 오류'
      logger.error({ err: error }, 'CareerNet search failed')
      return { success: false, data: null, totalCount: 0, source: this.type, error: msg }
    }
  }

  async fetchAll(options?: {
    pageNo?: number; numOfRows?: number
  }): Promise<FetchResult<PublicMajorInfo[]>> {
    return this.searchByUniversity('', options)
  }
}
