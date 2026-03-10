import type { SmsSendParams, AligoConfig, SendResult } from '../types'
import { ALIGO_HOSTS, ALIGO_ENDPOINTS } from '../constants'
import { createAligoClient, getAligoConfig } from './aligo-client'
import { logger } from '@/lib/logger'

export async function sendSms(
  params: Omit<SmsSendParams, 'sender'>,
  config?: AligoConfig
): Promise<SendResult> {
  const aligoConfig = config ?? getAligoConfig()
  if (!aligoConfig) {
    return {
      success: false,
      errorMessage:
        '알림 서비스가 설정되지 않았습니다. 환경변수를 확인하세요.',
    }
  }

  const formData: Record<string, string> = {
    sender: aligoConfig.senderNumber,
    receiver: params.receiver,
    msg: params.message,
  }

  if (params.title) {
    formData['title'] = params.title
  }

  const client = createAligoClient(aligoConfig)
  const url = `${ALIGO_HOSTS.sms}${ALIGO_ENDPOINTS.smsSend}`
  const response = await client.post(url, formData)

  if (response.code === 0 && response.info) {
    logger.info({ mid: response.info.mid }, 'SMS sent successfully')
    return {
      success: true,
      mid: response.info.mid,
      successCount: response.info.scnt,
      failCount: response.info.fcnt,
    }
  }

  return {
    success: false,
    errorMessage: response.message,
  }
}
