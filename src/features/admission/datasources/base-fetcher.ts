/**
 * 공공데이터포털 API 공통 HTTP 클라이언트
 *
 * 모든 data.go.kr API가 공유하는 로직:
 * - 서비스키 관리
 * - XML/JSON 응답 파싱
 * - 에러 핸들링
 * - 레이트 리밋 체크
 */

import { logger } from '@/lib/logger'
import type { DataGoKrResponse } from './types'

const DATA_GO_KR_ERROR_CODES: Record<string, string> = {
  '00': '정상',
  '01': '어플리케이션 에러',
  '02': '데이터베이스 에러',
  '03': '데이터 없음',
  '04': 'HTTP 에러',
  '10': '잘못된 요청 파라미터',
  '11': '필수 파라미터 누락',
  '12': '해당 서비스 없음',
  '20': '서비스 접근 거부',
  '21': '일시적으로 사용할 수 없음',
  '22': '호출 건수 초과',
  '30': '등록되지 않은 서비스키',
  '31': '기한 만료된 서비스키',
  '32': '등록되지 않은 도메인',
  '33': '등록되지 않은 IP',
}

export type FetchOptions = {
  baseUrl: string
  serviceKey: string
  params: Record<string, string | number>
  format?: 'json' | 'xml'
}

export async function fetchFromDataGoKr<T>(options: FetchOptions): Promise<DataGoKrResponse<T>> {
  const { baseUrl, serviceKey, params, format = 'json' } = options

  const url = new URL(baseUrl)
  url.searchParams.set('serviceKey', serviceKey)
  url.searchParams.set('type', format)

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value))
  }

  logger.debug({ url: url.toString() }, 'Fetching from data.go.kr')

  // data.go.kr은 http → https 리다이렉트 이슈가 있으므로 http 사용
  const fetchUrl = url.toString().replace('https://api.data.go.kr', 'http://api.data.go.kr')

  const response = await fetch(fetchUrl, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const contentType = response.headers.get('content-type') ?? ''

  // JSON 응답
  if (contentType.includes('json') || format === 'json') {
    const data = await response.json() as DataGoKrResponse<T>
    const code = data?.response?.header?.resultCode

    if (code && code !== '00') {
      const msg = DATA_GO_KR_ERROR_CODES[code] ?? `알 수 없는 에러 (코드: ${code})`
      throw new Error(`data.go.kr API 에러: ${msg} (${data.response.header.resultMsg})`)
    }

    return data
  }

  // XML 응답인 경우 텍스트로 반환 (필요시 파싱)
  const text = await response.text()
  throw new Error(`예상치 못한 응답 형식: ${contentType}\n${text.slice(0, 500)}`)
}

/**
 * 응답에서 items 배열을 안전하게 추출
 */
export function extractItems<T>(response: DataGoKrResponse<T>): T[] {
  const body = response.response?.body
  if (!body?.items) return []

  // items가 배열인 경우
  if (Array.isArray(body.items)) return body.items

  // items.item이 배열인 경우
  if (body.items && 'item' in body.items) {
    const item = body.items.item
    return Array.isArray(item) ? item : [item]
  }

  return []
}

/**
 * 환경변수에서 서비스키 가져오기
 */
export function getServiceKey(envVarName: string): string {
  const key = process.env[envVarName]
  if (!key) {
    throw new Error(`환경변수 ${envVarName}이 설정되지 않았습니다. .env 파일을 확인하세요.`)
  }
  return key
}
