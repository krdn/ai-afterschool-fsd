/** 알리고 API 호스트 */
export const ALIGO_HOSTS = {
  alimtalk: 'https://kakaoapi.aligo.in',
  sms: 'https://apis.aligo.in',
} as const

/** 알리고 API 엔드포인트 */
export const ALIGO_ENDPOINTS = {
  alimtalkSend: '/akv10/alimtalk/send/',
  historyList: '/akv10/history/list/',
  historyDetail: '/akv10/history/detail/',
  heartInfo: '/akv10/heartinfo/',
  smsSend: '/send/',
} as const

/** 알림톡 템플릿 코드 (카카오 검수 후 실제 코드로 교체) */
export const ALIMTALK_TEMPLATES = {
  gradeReport: 'GRADE_REPORT_001',
} as const

/** 알리고 API 에러 코드 */
export const ALIGO_ERROR_CODES: Record<number, string> = {
  [-101]: 'API Key 오류',
  [-102]: '사용자 ID 오류',
  [-103]: '발신프로필 키 오류',
  [-104]: '템플릿 코드 오류',
  [-105]: '발신번호 오류',
  [-201]: '잔액 부족',
  [-301]: '수신번호 오류',
  [-99]: '서버 오류',
}
