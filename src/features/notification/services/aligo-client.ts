import type { AligoConfig, AligoResponse } from '../types'
import { logger } from '@/lib/logger'

export function createAligoClient(config: AligoConfig) {
  return {
    async post(
      url: string,
      params: Record<string, string>
    ): Promise<AligoResponse> {
      const body = new URLSearchParams({
        apikey: config.apiKey,
        userid: config.userId,
        ...params,
      })

      if (config.testMode) {
        body.set('testMode', 'Y')
      }

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
        })

        const data = (await response.json()) as AligoResponse

        if (data.code < 0) {
          logger.error(
            { code: data.code, message: data.message, url },
            'Aligo API error response'
          )
        }

        return data
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error'
        logger.error({ err: error, url }, 'Aligo API request failed')
        return { code: -999, message: `요청 실패: ${message}` }
      }
    },
  }
}

export function getAligoConfig(): AligoConfig | null {
  const apiKey = process.env.ALIGO_API_KEY
  const userId = process.env.ALIGO_USER_ID
  const senderKey = process.env.ALIGO_SENDER_KEY
  const senderNumber = process.env.ALIGO_SENDER_NUMBER

  if (!apiKey || !userId || !senderKey || !senderNumber) {
    return null
  }

  return {
    apiKey,
    userId,
    senderKey,
    senderNumber,
    testMode: process.env.ALIGO_TEST_MODE === 'Y',
  }
}
