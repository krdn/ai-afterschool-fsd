import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createAligoClient } from '../services/aligo-client'
import type { AligoConfig } from '../types'

const mockConfig: AligoConfig = {
  apiKey: 'test-api-key',
  userId: 'test-user',
  senderKey: 'test-sender-key',
  senderNumber: '01012345678',
  testMode: true,
}

describe('알리고 API 클라이언트', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    globalThis.fetch = vi.fn()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  describe('post', () => {
    it('인증 파라미터를 자동으로 포함해야 한다', async () => {
      const mockResponse = { code: 0, message: '성공' }
      vi.mocked(globalThis.fetch).mockResolvedValue(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      )

      const client = createAligoClient(mockConfig)
      await client.post('https://kakaoapi.aligo.in/akv10/alimtalk/send/', {
        tpl_code: 'TPL001',
      })

      const [url, options] = vi.mocked(globalThis.fetch).mock.calls[0]
      expect(url).toBe('https://kakaoapi.aligo.in/akv10/alimtalk/send/')
      expect(options?.method).toBe('POST')

      const body = options?.body as URLSearchParams
      expect(body.get('apikey')).toBe('test-api-key')
      expect(body.get('userid')).toBe('test-user')
      expect(body.get('tpl_code')).toBe('TPL001')
    })

    it('testMode가 true이면 testMode=Y를 포함해야 한다', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue(
        new Response(JSON.stringify({ code: 0, message: '성공' }), {
          status: 200,
        })
      )

      const client = createAligoClient(mockConfig)
      await client.post('https://kakaoapi.aligo.in/akv10/alimtalk/send/', {})

      const body = vi.mocked(globalThis.fetch).mock.calls[0][1]
        ?.body as URLSearchParams
      expect(body.get('testMode')).toBe('Y')
    })

    it('API 응답 code가 0 미만이면 에러 응답을 반환해야 한다', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue(
        new Response(
          JSON.stringify({ code: -101, message: 'API Key 오류' }),
          { status: 200 }
        )
      )

      const client = createAligoClient(mockConfig)
      const result = await client.post('https://kakaoapi.aligo.in/test/', {})

      expect(result.code).toBe(-101)
      expect(result.message).toBe('API Key 오류')
    })

    it('네트워크 오류 시 code -999로 반환해야 한다', async () => {
      vi.mocked(globalThis.fetch).mockRejectedValue(
        new Error('Network error')
      )

      const client = createAligoClient(mockConfig)
      const result = await client.post('https://kakaoapi.aligo.in/test/', {})

      expect(result.code).toBe(-999)
      expect(result.message).toContain('Network error')
    })
  })

  describe('getAligoConfig', () => {
    it('환경변수가 모두 설정되지 않으면 null을 반환해야 한다', async () => {
      const { getAligoConfig } = await import('../services/aligo-client')
      const original = { ...process.env }
      delete process.env.ALIGO_API_KEY
      delete process.env.ALIGO_USER_ID
      delete process.env.ALIGO_SENDER_KEY
      delete process.env.ALIGO_SENDER_NUMBER

      const config = getAligoConfig()
      expect(config).toBeNull()

      Object.assign(process.env, original)
    })
  })
})
