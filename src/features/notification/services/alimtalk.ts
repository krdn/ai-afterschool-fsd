import type { AlimtalkSendParams, AligoConfig, SendResult } from '../types'
import { ALIGO_HOSTS, ALIGO_ENDPOINTS } from '../constants'
import { createAligoClient, getAligoConfig } from './aligo-client'
import { logger } from '@/lib/logger'

const MAX_RECEIVERS = 500

export function buildAlimtalkFormData(
  params: AlimtalkSendParams
): Record<string, string> {
  const data: Record<string, string> = {
    senderkey: params.senderKey,
    tpl_code: params.templateCode,
    sender: params.sender,
  }

  if (params.failover) {
    data['failover'] = 'Y'
  }

  if (params.scheduledAt) {
    data['senddate'] = params.scheduledAt
  }

  const receivers = params.receivers.slice(0, MAX_RECEIVERS)

  for (let i = 0; i < receivers.length; i++) {
    const r = receivers[i]
    const idx = i + 1
    data[`receiver_${idx}`] = r.phone
    data[`subject_${idx}`] = r.subject
    data[`message_${idx}`] = r.message

    if (r.name) {
      data[`recvname_${idx}`] = r.name
    }
    if (r.button) {
      data[`button_${idx}`] = r.button
    }
    if (params.failover && r.fallbackMessage) {
      data[`fmessage_${idx}`] = r.fallbackMessage
    }
    if (params.failover && r.fallbackSubject) {
      data[`fsubject_${idx}`] = r.fallbackSubject
    }
  }

  return data
}

export async function sendAlimtalk(
  params: Omit<AlimtalkSendParams, 'senderKey' | 'sender'>,
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

  const formData = buildAlimtalkFormData({
    ...params,
    senderKey: aligoConfig.senderKey,
    sender: aligoConfig.senderNumber,
  })

  const client = createAligoClient(aligoConfig)
  const url = `${ALIGO_HOSTS.alimtalk}${ALIGO_ENDPOINTS.alimtalkSend}`
  const response = await client.post(url, formData)

  if (response.code === 0 && response.info) {
    logger.info(
      {
        mid: response.info.mid,
        successCount: response.info.scnt,
        failCount: response.info.fcnt,
      },
      'Alimtalk sent successfully'
    )

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
