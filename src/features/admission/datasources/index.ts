/**
 * 데이터 소스 레지스트리
 *
 * 모든 공공 API + AI 데이터 소스를 통합 관리합니다.
 * 새 API를 추가하려면:
 * 1. BaseDataSource를 구현하는 클래스 작성
 * 2. 이 파일의 registerDefaultSources()에 등록
 * 3. 필요한 환경변수를 .env에 추가
 */

import { logger } from '@/lib/logger'
import { AdmissionQuotaSource } from './admission-quota-source'
import { MajorInfoSource } from './major-info-source'
import { SeedDataSource } from './seed-data-source'
import { CareerNetSource } from './career-net-source'
import type { BaseDataSource, DataSourceType, DataSourceConfig } from './types'

// === 데이터 소스 설정 ===

export const DATA_SOURCE_CONFIGS: DataSourceConfig[] = [
  {
    type: 'data_go_kr_admission',
    name: '전국대학별입학정원정보',
    description: '기준년도별 대학 입학정원, 계열별 정원',
    baseUrl: 'https://api.data.go.kr/openapi/tn_pubr_public_univ_mtcltn_api',
    apiKey: 'DATA_GO_KR_SERVICE_KEY',
    enabled: true,
    rateLimit: 1000,
  },
  {
    type: 'data_go_kr_major',
    name: '대학별 학과정보',
    description: '학과명, 입학정원, 수업연한, 교육과정, 관련직업',
    baseUrl: 'http://openapi.academyinfo.go.kr/openapi/service/rest/SchoolMajorInfoService',
    apiKey: 'ACADEMY_INFO_SERVICE_KEY',
    enabled: true,
    rateLimit: 1000,
  },
  {
    type: 'data_go_kr_student',
    name: '대학정보공시 학생현황',
    description: '경쟁률, 충원율, 중도탈락률',
    baseUrl: 'http://openapi.academyinfo.go.kr/openapi/service/rest/StudentService',
    apiKey: 'ACADEMY_INFO_SERVICE_KEY',
    enabled: false, // 추후 구현
    rateLimit: 1000,
  },
  {
    type: 'data_go_kr_basic',
    name: '대학알리미 기본정보',
    description: '대학 기본정보, 유형, 지역',
    baseUrl: 'http://openapi.academyinfo.go.kr/openapi/service/rest/BasicInformationService',
    apiKey: 'ACADEMY_INFO_SERVICE_KEY',
    enabled: false, // 추후 구현
    rateLimit: 1000,
  },
  {
    type: 'career_net',
    name: '커리어넷 대학학과정보',
    description: '학과 목록, 학과 상세, 관련 직업 (교육부)',
    baseUrl: 'https://www.career.go.kr/cnet/openapi/getOpenApi',
    apiKey: 'CAREER_NET_API_KEY',
    enabled: true,
    rateLimit: 1000,
  },
  {
    type: 'perplexity_ai',
    name: 'Perplexity AI 웹 검색',
    description: '커트라인, 합격선, 준비사항 등 AI 웹 검색',
    baseUrl: 'https://api.perplexity.ai',
    apiKey: 'PERPLEXITY_API_KEY',
    enabled: true,
    rateLimit: 100,
  },
]

// === 레지스트리 싱글톤 ===

class DataSourceRegistryImpl {
  private sources = new Map<DataSourceType, BaseDataSource<unknown>>()
  private initialized = false

  register<T>(source: BaseDataSource<T>): void {
    this.sources.set(source.type, source as BaseDataSource<unknown>)
  }

  get<T>(type: DataSourceType): BaseDataSource<T> | undefined {
    return this.sources.get(type) as BaseDataSource<T> | undefined
  }

  getAll(): BaseDataSource<unknown>[] {
    return Array.from(this.sources.values())
  }

  getEnabled(): BaseDataSource<unknown>[] {
    return this.getAll().filter(source => {
      const config = DATA_SOURCE_CONFIGS.find(c => c.type === source.type)
      return config?.enabled ?? false
    })
  }

  /** API 키 설정 상태 확인 */
  getStatus(): { type: DataSourceType; name: string; enabled: boolean; hasApiKey: boolean }[] {
    return DATA_SOURCE_CONFIGS.map(config => ({
      type: config.type,
      name: config.name,
      enabled: config.enabled,
      hasApiKey: config.apiKey ? !!process.env[config.apiKey] : true,
    }))
  }

  /** 모든 활성 소스의 연결 테스트 */
  async testAll(): Promise<{ type: DataSourceType; name: string; connected: boolean; error?: string }[]> {
    const results = []
    for (const source of this.getEnabled()) {
      const config = DATA_SOURCE_CONFIGS.find(c => c.type === source.type)
      const result = await source.testConnection()
      results.push({
        type: source.type,
        name: config?.name ?? source.name,
        ...result,
      })
    }
    return results
  }

  private registerDefaultSources(): void {
    if (this.initialized) return
    this.register(new AdmissionQuotaSource())
    this.register(new MajorInfoSource())
    this.register(new SeedDataSource())
    this.register(new CareerNetSource())
    this.initialized = true
    logger.debug({ count: this.sources.size }, 'DataSource registry initialized')
  }

  ensureInitialized(): void {
    this.registerDefaultSources()
  }
}

export const dataSourceRegistry = new DataSourceRegistryImpl()

// 초기화
dataSourceRegistry.ensureInitialized()

// === 편의 함수 ===

export function getAdmissionQuotaSource(): AdmissionQuotaSource {
  dataSourceRegistry.ensureInitialized()
  return dataSourceRegistry.get('data_go_kr_admission') as unknown as AdmissionQuotaSource
}

export function getMajorInfoSource(): MajorInfoSource {
  dataSourceRegistry.ensureInitialized()
  return dataSourceRegistry.get('data_go_kr_major') as unknown as MajorInfoSource
}

export function getSeedDataSource(): SeedDataSource {
  dataSourceRegistry.ensureInitialized()
  return dataSourceRegistry.get('data_go_kr_basic') as unknown as SeedDataSource
}

export function getCareerNetSource(): CareerNetSource {
  dataSourceRegistry.ensureInitialized()
  return dataSourceRegistry.get('career_net') as unknown as CareerNetSource
}

// re-export
export { fetchWithFallback } from './fallback-fetcher'
export { searchSeedUniversities, getSeedStats, KOREAN_UNIVERSITIES } from './seed-data'
export type { BaseDataSource, DataSourceType, FetchResult } from './types'
export type { FallbackResult } from './fallback-fetcher'
