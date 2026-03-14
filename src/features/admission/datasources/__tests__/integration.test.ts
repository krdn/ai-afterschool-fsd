/**
 * 공공데이터 API 통합 테스트
 *
 * 실제 API 응답 형식을 mock하여 어댑터 동작을 검증합니다.
 * 실제 API 호출 테스트는 DATA_GO_KR_LIVE_TEST=1 환경변수로 활성화.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { extractItems } from '../base-fetcher'
import { AdmissionQuotaSource } from '../admission-quota-source'
import { MajorInfoSource } from '../major-info-source'
import { dataSourceRegistry, DATA_SOURCE_CONFIGS } from '../index'

// 실제 API 응답 형식 (data.go.kr 문서 기반)
const MOCK_ADMISSION_QUOTA_RESPONSE = {
  response: {
    header: { resultCode: '00', resultMsg: 'NORMAL SERVICE' },
    body: {
      items: [
        {
          referenceDate: '2024',
          insttClNm: '대학',
          ctprvnCd: '11',
          schoolNm: '서울대학교',
          lclsFieldNm: '공학',
          mclsFieldNm: '컴퓨터·통신',
          dayngtFg: '주간',
          entcntCpct: '50',
        },
        {
          referenceDate: '2024',
          insttClNm: '대학',
          ctprvnCd: '11',
          schoolNm: '서울대학교',
          lclsFieldNm: '인문',
          mclsFieldNm: '언어·문학',
          dayngtFg: '주간',
          entcntCpct: '40',
        },
        {
          referenceDate: '2024',
          insttClNm: '대학',
          ctprvnCd: '11',
          schoolNm: '서울대학교',
          lclsFieldNm: '자연',
          mclsFieldNm: '수학·물리·천문·지리',
          dayngtFg: '주간',
          entcntCpct: '35',
        },
      ],
      totalCount: 3,
      pageNo: 1,
      numOfRows: 10,
    },
  },
}

const MOCK_MAJOR_INFO_RESPONSE = {
  response: {
    header: { resultCode: '00', resultMsg: 'NORMAL SERVICE' },
    body: {
      items: {
        item: [
          {
            schlKrnNm: '서울대학교',
            hakguaNm: '컴퓨터공학부',
            dangwaDaehakNm: '공과대학',
            schlDivNm: '대학',
            schlHakguaTsNm: '공학',
            dgreeNm: '학사',
            suupYrhc: '4',
            ipjJngwonSu: '55',
            grdujaSu: '120',
            gyogwaGwajeong: '컴퓨터과학 및 공학 전반',
            gwanryeonJikeopNm: '소프트웨어개발자, 데이터과학자',
          },
          {
            schlKrnNm: '서울대학교',
            hakguaNm: '경영학과',
            dangwaDaehakNm: '경영대학',
            schlDivNm: '대학',
            schlHakguaTsNm: '사회',
            dgreeNm: '학사',
            suupYrhc: '4',
            ipjJngwonSu: '80',
            gyogwaGwajeong: '경영학 전반',
            gwanryeonJikeopNm: '경영컨설턴트, 재무분석가',
          },
        ],
      },
      totalCount: 2,
      pageNo: 1,
      numOfRows: 999,
    },
  },
}

describe('AdmissionQuotaSource', () => {
  it('응답을 PublicAdmissionQuota[]로 변환', () => {
    const items = extractItems(MOCK_ADMISSION_QUOTA_RESPONSE)
    expect(items).toHaveLength(3)

    // 원본 필드명 확인
    expect(items[0]).toHaveProperty('schoolNm', '서울대학교')
    expect(items[0]).toHaveProperty('lclsFieldNm', '공학')
    expect(items[0]).toHaveProperty('entcntCpct', '50')
  })

  it('API 키 없으면 testConnection 실패', async () => {
    const originalEnv = process.env.DATA_GO_KR_SERVICE_KEY
    delete process.env.DATA_GO_KR_SERVICE_KEY

    const source = new AdmissionQuotaSource()
    const result = await source.testConnection()
    expect(result.connected).toBe(false)
    expect(result.error).toContain('DATA_GO_KR_SERVICE_KEY')

    process.env.DATA_GO_KR_SERVICE_KEY = originalEnv
  })
})

describe('MajorInfoSource', () => {
  it('items.item 배열 응답을 파싱', () => {
    const items = extractItems(MOCK_MAJOR_INFO_RESPONSE)
    expect(items).toHaveLength(2)

    expect(items[0]).toHaveProperty('hakguaNm', '컴퓨터공학부')
    expect(items[0]).toHaveProperty('dangwaDaehakNm', '공과대학')
    expect(items[0]).toHaveProperty('ipjJngwonSu', '55')
  })

  it('fetchAll은 미지원 에러 반환', async () => {
    const source = new MajorInfoSource()
    const result = await source.fetchAll()
    expect(result.success).toBe(false)
    expect(result.error).toContain('학교명 검색만 지원')
  })
})

describe('DataSource Registry 통합', () => {
  it('모든 설정된 소스의 type이 고유함', () => {
    const types = DATA_SOURCE_CONFIGS.map(c => c.type)
    const unique = new Set(types)
    expect(types.length).toBe(unique.size)
  })

  it('활성화된 소스만 getEnabled로 반환', () => {
    dataSourceRegistry.ensureInitialized()
    const enabled = DATA_SOURCE_CONFIGS.filter(c => c.enabled)
    const enabledSources = dataSourceRegistry.getStatus().filter(s => s.enabled)
    expect(enabledSources.length).toBe(enabled.length)
  })

  it('perplexity_ai가 설정에 포함됨', () => {
    const perplexity = DATA_SOURCE_CONFIGS.find(c => c.type === 'perplexity_ai')
    expect(perplexity).toBeDefined()
    expect(perplexity!.baseUrl).toBe('https://api.perplexity.ai')
  })
})

// 실제 API 테스트 (환경변수 DATA_GO_KR_LIVE_TEST=1 일 때만)
const LIVE_TEST = process.env.DATA_GO_KR_LIVE_TEST === '1'

describe.skipIf(!LIVE_TEST)('실제 API 호출 테스트', () => {
  it('입학정원 API - 서울대학교 검색', async () => {
    const source = new AdmissionQuotaSource()
    const result = await source.searchByUniversity('서울대학교')

    console.log('입학정원 결과:', JSON.stringify(result, null, 2))

    expect(result.success).toBe(true)
    expect(result.data).not.toBeNull()
    expect(result.data!.length).toBeGreaterThan(0)
    expect(result.data![0].schoolName).toContain('서울대')
  })

  it('학과정보 API - 서울대학교 검색', async () => {
    const source = new MajorInfoSource()
    const result = await source.searchByUniversity('서울대학교')

    console.log('학과정보 결과:', JSON.stringify(result.data?.slice(0, 3), null, 2))

    expect(result.success).toBe(true)
    expect(result.data).not.toBeNull()
    expect(result.data!.length).toBeGreaterThan(0)
  })
})
