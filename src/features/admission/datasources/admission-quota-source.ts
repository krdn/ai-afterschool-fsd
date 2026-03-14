/**
 * 전국대학별입학정원정보 표준데이터 어댑터
 *
 * API: https://api.data.go.kr/openapi/tn_pubr_public_univ_mtcltn_api
 * 제공: 기준년도, 학교구분, 시도코드, 학교명, 대계열, 소계열, 주야구분, 입학정원
 */

import { fetchFromDataGoKr, extractItems, getServiceKey } from './base-fetcher'
import { logger } from '@/lib/logger'
import type { BaseDataSource, FetchResult, PublicAdmissionQuota, DataGoKrResponse } from './types'

const BASE_URL = 'https://api.data.go.kr/openapi/tn_pubr_public_univ_mtcltn_api'
const ENV_KEY = 'DATA_GO_KR_SERVICE_KEY'

// API 원본 응답 필드명
type RawAdmissionQuota = {
  referenceDate?: string    // 기준년도
  insttClNm?: string        // 학교구분
  ctprvnCd?: string         // 시도코드
  schoolNm?: string         // 학교명
  lclsFieldNm?: string      // 대계열
  mclsFieldNm?: string      // 소계열
  dayngtFg?: string         // 주야구분
  entcntCpct?: string       // 입학정원
}

function toPublicAdmissionQuota(raw: RawAdmissionQuota): PublicAdmissionQuota {
  return {
    referenceDate: raw.referenceDate ?? '',
    schoolType: raw.insttClNm ?? '',
    regionCode: raw.ctprvnCd ?? '',
    schoolName: raw.schoolNm ?? '',
    majorField: raw.lclsFieldNm ?? '',
    subField: raw.mclsFieldNm,
    dayNight: raw.dayngtFg ?? '',
    admissionQuota: Number(raw.entcntCpct) || 0,
  }
}

export class AdmissionQuotaSource implements BaseDataSource<PublicAdmissionQuota> {
  readonly type = 'data_go_kr_admission' as const
  readonly name = '전국대학별입학정원정보'

  async testConnection(): Promise<{ connected: boolean; error?: string }> {
    try {
      const serviceKey = getServiceKey(ENV_KEY)
      const response = await fetchFromDataGoKr<RawAdmissionQuota>({
        baseUrl: BASE_URL,
        serviceKey,
        params: { pageNo: 1, numOfRows: 1 },
      })
      return { connected: response.response.header.resultCode === '00' }
    } catch (error) {
      const msg = error instanceof Error ? error.message : '알 수 없는 오류'
      logger.error({ err: error }, 'AdmissionQuota connection test failed')
      return { connected: false, error: msg }
    }
  }

  async searchByUniversity(
    universityName: string,
    options?: { year?: number; pageNo?: number; numOfRows?: number },
  ): Promise<FetchResult<PublicAdmissionQuota[]>> {
    try {
      const serviceKey = getServiceKey(ENV_KEY)
      const params: Record<string, string | number> = {
        pageNo: options?.pageNo ?? 1,
        numOfRows: options?.numOfRows ?? 100,
        schoolNm: universityName,
      }
      if (options?.year) {
        params.referenceDate = options.year
      }

      const response = await fetchFromDataGoKr<RawAdmissionQuota>({
        baseUrl: BASE_URL,
        serviceKey,
        params,
      })

      const items = extractItems(response)
      const data = items.map(toPublicAdmissionQuota)

      return {
        success: true,
        data,
        totalCount: response.response.body?.totalCount ?? data.length,
        source: this.type,
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : '알 수 없는 오류'
      logger.error({ err: error }, 'AdmissionQuota search failed')
      return { success: false, data: null, totalCount: 0, source: this.type, error: msg }
    }
  }

  async fetchAll(options?: {
    pageNo?: number; numOfRows?: number; year?: number
  }): Promise<FetchResult<PublicAdmissionQuota[]>> {
    try {
      const serviceKey = getServiceKey(ENV_KEY)
      const params: Record<string, string | number> = {
        pageNo: options?.pageNo ?? 1,
        numOfRows: options?.numOfRows ?? 100,
      }
      if (options?.year) {
        params.referenceDate = options.year
      }

      const response = await fetchFromDataGoKr<RawAdmissionQuota>({
        baseUrl: BASE_URL,
        serviceKey,
        params,
      })

      const items = extractItems(response)
      const data = items.map(toPublicAdmissionQuota)

      return {
        success: true,
        data,
        totalCount: response.response.body?.totalCount ?? data.length,
        source: this.type,
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : '알 수 없는 오류'
      logger.error({ err: error }, 'AdmissionQuota fetchAll failed')
      return { success: false, data: null, totalCount: 0, source: this.type, error: msg }
    }
  }
}
