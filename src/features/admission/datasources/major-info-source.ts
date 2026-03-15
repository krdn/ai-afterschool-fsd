/**
 * 대학별 학과정보 어댑터
 *
 * API: http://openapi.academyinfo.go.kr/openapi/service/rest/SchoolMajorInfoService/getSchoolMajorInfo
 * 제공: 학교명, 학과명, 단과대학명, 계열, 입학정원수, 수업연한, 교육과정, 관련직업명
 */

import { fetchFromDataGoKr, extractItems, getServiceKey } from './base-fetcher'
import { logger } from '@/lib/logger'
import type { BaseDataSource, FetchResult, PublicMajorInfo } from './types'

const BASE_URL = 'http://openapi.academyinfo.go.kr/openapi/service/rest/SchoolMajorInfoService/getSchoolMajorInfo'
const ENV_KEY = 'ACADEMY_INFO_SERVICE_KEY'

// API 원본 응답 필드명
type RawMajorInfo = {
  schlKrnNm?: string          // 학교명
  hakguaNm?: string           // 학과명
  dangwaDaehakNm?: string     // 단과대학명
  schlDivNm?: string          // 학교구분명
  schlHakguaTsNm?: string     // 학교학과특성명
  dgreeNm?: string            // 학위과정명
  suupYrhc?: string           // 수업연한
  ipjJngwonSu?: string        // 입학정원수
  grdujaSu?: string           // 졸업자수
  gyogwaGwajeong?: string     // 교육과정
  gwanryeonJikeopNm?: string  // 관련직업명
  stdtLclsfCd?: string        // 7대계열코드
  juya?: string               // 주야과정명
  ctprvn?: string             // 시도명
}

function toPublicMajorInfo(raw: RawMajorInfo): PublicMajorInfo {
  return {
    schoolName: raw.schlKrnNm ?? '',
    majorName: raw.hakguaNm ?? '',
    collegeName: raw.dangwaDaehakNm,
    department: raw.schlHakguaTsNm ?? raw.stdtLclsfCd,
    degreeType: raw.dgreeNm,
    studyYears: raw.suupYrhc ? Number(raw.suupYrhc) : undefined,
    admissionQuota: raw.ipjJngwonSu ? Number(raw.ipjJngwonSu) : undefined,
    curriculum: raw.gyogwaGwajeong,
    relatedJobs: raw.gwanryeonJikeopNm,
  }
}

export class MajorInfoSource implements BaseDataSource<PublicMajorInfo> {
  readonly type = 'data_go_kr_major' as const
  readonly name = '대학별 학과정보'

  async testConnection(): Promise<{ connected: boolean; error?: string }> {
    try {
      const serviceKey = getServiceKey(ENV_KEY)
      await fetchFromDataGoKr<RawMajorInfo>({
        baseUrl: BASE_URL,
        serviceKey,
        params: { svyYr: new Date().getFullYear(), schlKrnNm: '서울대학교', numOfRows: 1 },
      })
      return { connected: true }
    } catch (error) {
      const msg = error instanceof Error ? error.message : '알 수 없는 오류'
      logger.error({ err: error }, 'MajorInfo connection test failed')
      return { connected: false, error: msg }
    }
  }

  async searchByUniversity(
    universityName: string,
    options?: { year?: number; pageNo?: number; numOfRows?: number },
  ): Promise<FetchResult<PublicMajorInfo[]>> {
    try {
      const serviceKey = getServiceKey(ENV_KEY)
      const response = await fetchFromDataGoKr<RawMajorInfo>({
        baseUrl: BASE_URL,
        serviceKey,
        params: {
          svyYr: options?.year ?? new Date().getFullYear(),
          schlKrnNm: universityName,
          pageNo: options?.pageNo ?? 1,
          numOfRows: options?.numOfRows ?? 999,
        },
      })

      const items = extractItems(response)
      const data = items.map(toPublicMajorInfo)

      return {
        success: true,
        data,
        totalCount: response.response.body?.totalCount ?? data.length,
        source: this.type,
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : '알 수 없는 오류'
      logger.error({ err: error }, 'MajorInfo search failed')
      return { success: false, data: null, totalCount: 0, source: this.type, error: msg }
    }
  }

  async fetchAll(options?: {
    pageNo?: number; numOfRows?: number; year?: number
  }): Promise<FetchResult<PublicMajorInfo[]>> {
    // 학과정보 API는 학교명이 필수이므로, fetchAll은 지원하지 않음
    return {
      success: false,
      data: null,
      totalCount: 0,
      source: this.type,
      error: '학과정보 API는 학교명 검색만 지원합니다. searchByUniversity를 사용하세요.',
    }
  }
}
