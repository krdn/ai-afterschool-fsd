// =============================================================================
// 알리고 API 타입
// =============================================================================

/** 알리고 API 공통 응답 */
export type AligoResponse = {
  code: number
  message: string
  info?: {
    type: string
    mid: string
    current: number
    unit: number
    total: number
    scnt: number
    fcnt: number
  }
}

/** 알림톡 발송 요청 파라미터 */
export type AlimtalkSendParams = {
  senderKey: string
  templateCode: string
  sender: string
  receivers: AlimtalkReceiver[]
  failover?: boolean
  scheduledAt?: string
  testMode?: boolean
}

/** 알림톡 수신자 */
export type AlimtalkReceiver = {
  phone: string
  subject: string
  message: string
  name?: string
  fallbackMessage?: string
  fallbackSubject?: string
  button?: string
}

/** SMS 발송 요청 파라미터 */
export type SmsSendParams = {
  sender: string
  receiver: string
  message: string
  title?: string
  testMode?: boolean
}

/** 발송 결과 */
export type SendResult = {
  success: boolean
  mid?: string
  errorMessage?: string
  successCount?: number
  failCount?: number
}

/** 알리고 설정 (환경변수에서 로드) */
export type AligoConfig = {
  apiKey: string
  userId: string
  senderKey: string
  senderNumber: string
  testMode: boolean
}
