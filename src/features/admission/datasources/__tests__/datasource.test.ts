import { describe, it, expect } from 'vitest'
import { extractItems } from '../base-fetcher'
import type { DataGoKrResponse } from '../types'

describe('base-fetcher', () => {
  describe('extractItems', () => {
    it('items가 배열이면 그대로 반환', () => {
      const response: DataGoKrResponse<{ name: string }> = {
        response: {
          header: { resultCode: '00', resultMsg: 'NORMAL SERVICE' },
          body: {
            items: [{ name: '서울대학교' }, { name: '연세대학교' }],
            totalCount: 2,
          },
        },
      }
      expect(extractItems(response)).toEqual([
        { name: '서울대학교' },
        { name: '연세대학교' },
      ])
    })

    it('items.item이 배열이면 추출', () => {
      const response: DataGoKrResponse<{ name: string }> = {
        response: {
          header: { resultCode: '00', resultMsg: 'NORMAL SERVICE' },
          body: {
            items: { item: [{ name: '고려대학교' }] },
            totalCount: 1,
          },
        },
      }
      expect(extractItems(response)).toEqual([{ name: '고려대학교' }])
    })

    it('items.item이 단일 객체면 배열로 감싸 반환', () => {
      const response: DataGoKrResponse<{ name: string }> = {
        response: {
          header: { resultCode: '00', resultMsg: 'NORMAL SERVICE' },
          body: {
            items: { item: { name: '한양대학교' } },
            totalCount: 1,
          },
        },
      }
      expect(extractItems(response)).toEqual([{ name: '한양대학교' }])
    })

    it('items가 없으면 빈 배열', () => {
      const response: DataGoKrResponse<{ name: string }> = {
        response: {
          header: { resultCode: '00', resultMsg: 'NORMAL SERVICE' },
          body: { totalCount: 0 },
        },
      }
      expect(extractItems(response)).toEqual([])
    })

    it('body가 없으면 빈 배열', () => {
      const response: DataGoKrResponse<{ name: string }> = {
        response: {
          header: { resultCode: '03', resultMsg: 'NO DATA' },
        },
      }
      expect(extractItems(response)).toEqual([])
    })
  })
})

describe('DataSourceRegistry', () => {
  it('기본 소스가 등록되어 있음', async () => {
    const { dataSourceRegistry } = await import('../index')
    dataSourceRegistry.ensureInitialized()

    const status = dataSourceRegistry.getStatus()
    expect(status.length).toBeGreaterThanOrEqual(2)

    const admissionQuota = status.find(s => s.type === 'data_go_kr_admission')
    expect(admissionQuota).toBeDefined()
    expect(admissionQuota?.name).toBe('전국대학별입학정원정보')

    const majorInfo = status.find(s => s.type === 'data_go_kr_major')
    expect(majorInfo).toBeDefined()
    expect(majorInfo?.name).toBe('대학별 학과정보')
  })

  it('설정된 소스 목록을 반환', async () => {
    const { DATA_SOURCE_CONFIGS } = await import('../index')
    expect(DATA_SOURCE_CONFIGS.length).toBeGreaterThanOrEqual(5)

    const perplexity = DATA_SOURCE_CONFIGS.find(c => c.type === 'perplexity_ai')
    expect(perplexity).toBeDefined()
    expect(perplexity?.enabled).toBe(true)
  })
})
