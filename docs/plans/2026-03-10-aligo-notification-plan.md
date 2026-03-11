# 알리고 알림톡 — 학부모 성적 리포트 발송 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 알리고 API를 연동하여 학부모에게 카카오 알림톡/SMS로 성적 리포트를 발송한다.

**Architecture:** FSD notification feature slice에 알리고 클라이언트를 구현하고, 기존 `sendParentReportAction`의 TODO를 연결한다. 내장 `fetch` + `URLSearchParams`로 알리고 API를 호출하며, `ParentGradeReport` 모델에 발송 상태 필드를 추가한다.

**Tech Stack:** Next.js 15, TypeScript, Prisma 7, fetch API, Vitest

**Design Doc:** `docs/plans/2026-03-10-aligo-notification-design.md`

---

## Task 1: DB 스키마 확장

**Files:**
- Modify: `prisma/schema.prisma:1004-1022` (ParentGradeReport 모델)
- Modify: `.env.example` (알리고 환경변수 추가)

**Step 1: ParentGradeReport에 발송 상태 필드 추가**

`prisma/schema.prisma`의 `ParentGradeReport` 모델에 2개 필드 추가:

```prisma
model ParentGradeReport {
  id            String    @id @default(cuid())
  studentId     String
  parentId      String?
  reportPeriod  String
  reportData    Json
  pdfUrl        String?
  sentAt        DateTime?
  sentMethod    String?
  sendStatus    String?   // 'pending' | 'sent' | 'delivered' | 'failed'
  aligoMid      String?   // 알리고 메시지 ID (결과 조회용)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  student       Student   @relation(fields: [studentId], references: [id], onDelete: Cascade)
  parent        Parent?   @relation(fields: [parentId], references: [id], onDelete: SetNull)

  @@index([studentId, reportPeriod])
  @@index([parentId])
  @@map("parent_grade_reports")
}
```

**Step 2: .env.example에 알리고 환경변수 추가**

```bash
# 알리고 알림톡/SMS API
ALIGO_API_KEY=
ALIGO_USER_ID=
ALIGO_SENDER_KEY=
ALIGO_SENDER_NUMBER=
ALIGO_TEST_MODE=Y
```

**Step 3: DB 반영 및 타입 재생성**

Run: `pnpm db:push && pnpm db:generate`
Expected: 스키마 반영 성공, Prisma 클라이언트 재생성

**Step 4: Commit**

```bash
git add prisma/schema.prisma .env.example
git commit -m "feat: ParentGradeReport에 알리고 발송 상태 필드 추가"
```

---

## Task 2: notification feature — 타입 및 상수 정의

**Files:**
- Create: `src/features/notification/types.ts`
- Create: `src/features/notification/constants.ts`

**Step 1: 타입 정의 작성**

`src/features/notification/types.ts`:

```typescript
// =============================================================================
// 알리고 API 타입
// =============================================================================

/** 알리고 API 공통 응답 */
export type AligoResponse = {
  code: number
  message: string
  info?: {
    type: string      // 'AT' (알림톡), 'SM' (SMS)
    mid: string        // 메시지 고유 ID
    current: number    // 잔여 포인트
    unit: number       // 개별 단가
    total: number      // 전체 비용
    scnt: number       // 정상 요청 건수
    fcnt: number       // 오류 건수
  }
}

/** 알림톡 발송 요청 파라미터 */
export type AlimtalkSendParams = {
  senderKey: string
  templateCode: string
  sender: string
  receivers: AlimtalkReceiver[]
  failover?: boolean
  scheduledAt?: string  // 'YYYYMMDDHHmmss'
  testMode?: boolean
}

/** 알림톡 수신자 */
export type AlimtalkReceiver = {
  phone: string
  subject: string
  message: string
  name?: string
  /** 대체 SMS 내용 (failover 시) */
  fallbackMessage?: string
  /** 대체 SMS 제목 (failover 시) */
  fallbackSubject?: string
  /** 버튼 JSON */
  button?: string
}

/** SMS 발송 요청 파라미터 */
export type SmsSendParams = {
  sender: string
  receiver: string
  message: string
  title?: string      // LMS 제목 (90바이트 초과 시 필요)
  testMode?: boolean
}

/** 발송 결과 */
export type SendResult = {
  success: boolean
  mid?: string        // 메시지 ID
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
```

**Step 2: 상수 정의 작성**

`src/features/notification/constants.ts`:

```typescript
// =============================================================================
// 알리고 API 상수
// =============================================================================

/** 알리고 API 호스트 */
export const ALIGO_HOSTS = {
  alimtalk: 'https://kakaoapi.aligo.in',
  sms: 'https://apis.aligo.in',
} as const

/** 알리고 API 엔드포인트 */
export const ALIGO_ENDPOINTS = {
  /** 알림톡 발송 */
  alimtalkSend: '/akv10/alimtalk/send/',
  /** 전송 내역 목록 */
  historyList: '/akv10/history/list/',
  /** 전송 상세 결과 */
  historyDetail: '/akv10/history/detail/',
  /** 잔여 포인트 조회 */
  heartInfo: '/akv10/heartinfo/',
  /** SMS 발송 */
  smsSend: '/send/',
} as const

/** 알림톡 템플릿 코드 (카카오 검수 후 실제 코드로 교체) */
export const ALIMTALK_TEMPLATES = {
  /** 성적 리포트 발송 */
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
```

**Step 3: Commit**

```bash
git add src/features/notification/types.ts src/features/notification/constants.ts
git commit -m "feat: notification feature 타입 및 상수 정의"
```

---

## Task 3: 알리고 API 클라이언트 (TDD)

**Files:**
- Create: `src/features/notification/__tests__/aligo-client.test.ts`
- Create: `src/features/notification/services/aligo-client.ts`

**Step 1: 테스트 작성**

`src/features/notification/__tests__/aligo-client.test.ts`:

```typescript
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
        new Response(JSON.stringify({ code: 0, message: '성공' }), { status: 200 })
      )

      const client = createAligoClient(mockConfig)
      await client.post('https://kakaoapi.aligo.in/akv10/alimtalk/send/', {})

      const body = vi.mocked(globalThis.fetch).mock.calls[0][1]?.body as URLSearchParams
      expect(body.get('testMode')).toBe('Y')
    })

    it('API 응답 code가 0 미만이면 에러를 반환해야 한다', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue(
        new Response(JSON.stringify({ code: -101, message: 'API Key 오류' }), { status: 200 })
      )

      const client = createAligoClient(mockConfig)
      const result = await client.post('https://kakaoapi.aligo.in/test/', {})

      expect(result.code).toBe(-101)
      expect(result.message).toBe('API Key 오류')
    })

    it('네트워크 오류 시 code -999로 반환해야 한다', async () => {
      vi.mocked(globalThis.fetch).mockRejectedValue(new Error('Network error'))

      const client = createAligoClient(mockConfig)
      const result = await client.post('https://kakaoapi.aligo.in/test/', {})

      expect(result.code).toBe(-999)
      expect(result.message).toContain('Network error')
    })
  })

  describe('getConfig', () => {
    it('환경변수가 모두 설정되지 않으면 null을 반환해야 한다', async () => {
      const { getAligoConfig } = await import('../services/aligo-client')
      // 환경변수 미설정 상태에서 호출
      const original = { ...process.env }
      delete process.env.ALIGO_API_KEY
      delete process.env.ALIGO_USER_ID

      const config = getAligoConfig()
      expect(config).toBeNull()

      // 복원
      Object.assign(process.env, original)
    })
  })
})
```

**Step 2: 테스트 실행하여 실패 확인**

Run: `pnpm test -- src/features/notification/__tests__/aligo-client.test.ts`
Expected: FAIL — 모듈 없음

**Step 3: 구현 작성**

`src/features/notification/services/aligo-client.ts`:

```typescript
import type { AligoConfig, AligoResponse } from '../types'
import { logger } from '@/lib/logger'

/**
 * 알리고 API 클라이언트를 생성한다.
 *
 * 모든 요청에 인증 파라미터(apikey, userid)를 자동 주입하고,
 * application/x-www-form-urlencoded 형식으로 변환한다.
 */
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

/**
 * 환경변수에서 알리고 설정을 로드한다.
 * 필수 값이 하나라도 없으면 null을 반환한다.
 */
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
```

**Step 4: 테스트 실행하여 통과 확인**

Run: `pnpm test -- src/features/notification/__tests__/aligo-client.test.ts`
Expected: PASS (5 tests)

**Step 5: Commit**

```bash
git add src/features/notification/__tests__/aligo-client.test.ts src/features/notification/services/aligo-client.ts
git commit -m "feat: 알리고 API 클라이언트 구현 (TDD)"
```

---

## Task 4: 알림톡 발송 서비스 (TDD)

**Files:**
- Create: `src/features/notification/__tests__/alimtalk.test.ts`
- Create: `src/features/notification/services/alimtalk.ts`

**Step 1: 테스트 작성**

`src/features/notification/__tests__/alimtalk.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildAlimtalkFormData, sendAlimtalk } from '../services/alimtalk'
import type { AlimtalkReceiver, AligoConfig } from '../types'

describe('알림톡 발송 서비스', () => {
  describe('buildAlimtalkFormData', () => {
    it('수신자를 _1, _2 인덱스 패턴으로 변환해야 한다', () => {
      const receivers: AlimtalkReceiver[] = [
        { phone: '01011111111', subject: '제목1', message: '내용1', name: '김부모' },
        { phone: '01022222222', subject: '제목2', message: '내용2', name: '이부모' },
      ]

      const result = buildAlimtalkFormData({
        senderKey: 'sk',
        templateCode: 'TPL',
        sender: '0311234567',
        receivers,
      })

      expect(result['receiver_1']).toBe('01011111111')
      expect(result['subject_1']).toBe('제목1')
      expect(result['message_1']).toBe('내용1')
      expect(result['recvname_1']).toBe('김부모')
      expect(result['receiver_2']).toBe('01022222222')
      expect(result['subject_2']).toBe('제목2')
      expect(result['message_2']).toBe('내용2')
      expect(result['recvname_2']).toBe('이부모')
    })

    it('failover가 true이면 failover=Y와 대체 메시지를 포함해야 한다', () => {
      const receivers: AlimtalkReceiver[] = [
        {
          phone: '01011111111',
          subject: '제목',
          message: '알림톡 내용',
          fallbackMessage: 'SMS 대체 내용',
          fallbackSubject: 'SMS 제목',
        },
      ]

      const result = buildAlimtalkFormData({
        senderKey: 'sk',
        templateCode: 'TPL',
        sender: '0311234567',
        receivers,
        failover: true,
      })

      expect(result['failover']).toBe('Y')
      expect(result['fmessage_1']).toBe('SMS 대체 내용')
      expect(result['fsubject_1']).toBe('SMS 제목')
    })

    it('senderkey, tpl_code, sender를 포함해야 한다', () => {
      const result = buildAlimtalkFormData({
        senderKey: 'my-sender-key',
        templateCode: 'MY_TPL',
        sender: '0311234567',
        receivers: [{ phone: '01011111111', subject: '제목', message: '내용' }],
      })

      expect(result['senderkey']).toBe('my-sender-key')
      expect(result['tpl_code']).toBe('MY_TPL')
      expect(result['sender']).toBe('0311234567')
    })

    it('500명 초과 수신자는 무시해야 한다', () => {
      const receivers: AlimtalkReceiver[] = Array.from({ length: 501 }, (_, i) => ({
        phone: `010${String(i).padStart(8, '0')}`,
        subject: `제목${i}`,
        message: `내용${i}`,
      }))

      const result = buildAlimtalkFormData({
        senderKey: 'sk',
        templateCode: 'TPL',
        sender: '031',
        receivers,
      })

      expect(result['receiver_500']).toBeDefined()
      expect(result['receiver_501']).toBeUndefined()
    })
  })
})
```

**Step 2: 테스트 실행하여 실패 확인**

Run: `pnpm test -- src/features/notification/__tests__/alimtalk.test.ts`
Expected: FAIL — 모듈 없음

**Step 3: 구현 작성**

`src/features/notification/services/alimtalk.ts`:

```typescript
import type {
  AlimtalkReceiver,
  AlimtalkSendParams,
  AligoConfig,
  SendResult,
} from '../types'
import { ALIGO_HOSTS, ALIGO_ENDPOINTS } from '../constants'
import { createAligoClient, getAligoConfig } from './aligo-client'
import { logger } from '@/lib/logger'

/** 1회 최대 수신자 수 */
const MAX_RECEIVERS = 500

/**
 * 알림톡 발송 파라미터를 알리고 API form data로 변환한다.
 *
 * 알리고 API는 receiver_1 ~ receiver_500 패턴을 사용하므로
 * 배열을 인덱스 기반 key-value로 풀어야 한다.
 */
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

/**
 * 알림톡을 발송한다.
 *
 * 환경변수에서 알리고 설정을 로드하고,
 * form data를 구성하여 알리고 API를 호출한다.
 */
export async function sendAlimtalk(
  params: Omit<AlimtalkSendParams, 'senderKey' | 'sender'>,
  config?: AligoConfig
): Promise<SendResult> {
  const aligoConfig = config ?? getAligoConfig()
  if (!aligoConfig) {
    return {
      success: false,
      errorMessage: '알림 서비스가 설정되지 않았습니다. 환경변수를 확인하세요.',
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
```

**Step 4: 테스트 실행하여 통과 확인**

Run: `pnpm test -- src/features/notification/__tests__/alimtalk.test.ts`
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add src/features/notification/__tests__/alimtalk.test.ts src/features/notification/services/alimtalk.ts
git commit -m "feat: 알림톡 발송 서비스 구현 (TDD)"
```

---

## Task 5: SMS 발송 서비스

**Files:**
- Create: `src/features/notification/services/sms.ts`

**Step 1: SMS 서비스 구현**

`src/features/notification/services/sms.ts`:

```typescript
import type { SmsSendParams, AligoConfig, SendResult } from '../types'
import { ALIGO_HOSTS, ALIGO_ENDPOINTS } from '../constants'
import { createAligoClient, getAligoConfig } from './aligo-client'
import { logger } from '@/lib/logger'

/**
 * SMS를 발송한다.
 *
 * 알리고 SMS API를 호출하여 단문(SMS) 또는 장문(LMS)을 발송한다.
 * 90바이트 초과 시 자동으로 LMS로 전환된다.
 */
export async function sendSms(
  params: Omit<SmsSendParams, 'sender'>,
  config?: AligoConfig
): Promise<SendResult> {
  const aligoConfig = config ?? getAligoConfig()
  if (!aligoConfig) {
    return {
      success: false,
      errorMessage: '알림 서비스가 설정되지 않았습니다. 환경변수를 확인하세요.',
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
```

**Step 2: Commit**

```bash
git add src/features/notification/services/sms.ts
git commit -m "feat: SMS 발송 서비스 구현"
```

---

## Task 6: Feature index (re-export)

**Files:**
- Create: `src/features/notification/index.ts`

**Step 1: index 작성**

`src/features/notification/index.ts`:

```typescript
// 타입
export type {
  AligoResponse,
  AlimtalkSendParams,
  AlimtalkReceiver,
  SmsSendParams,
  SendResult,
  AligoConfig,
} from './types'

// 상수
export { ALIGO_HOSTS, ALIGO_ENDPOINTS, ALIMTALK_TEMPLATES } from './constants'

// 서비스
export { sendAlimtalk, buildAlimtalkFormData } from './services/alimtalk'
export { sendSms } from './services/sms'
export { getAligoConfig } from './services/aligo-client'
```

**Step 2: Commit**

```bash
git add src/features/notification/index.ts
git commit -m "feat: notification feature index 추가"
```

---

## Task 7: sendParentReportAction 연동

**Files:**
- Modify: `src/lib/actions/student/parent-report.ts:57-79`
- Modify: `src/features/grade-management/report/parent-report-generator.ts:153-164`

**Step 1: markReportAsSent 확장**

`src/features/grade-management/report/parent-report-generator.ts`의 `markReportAsSent`를 수정하여 `sendStatus`와 `aligoMid`를 지원:

```typescript
/**
 * 리포트 발송 기록을 업데이트한다.
 */
export async function markReportAsSent(
  reportId: string,
  method: 'email' | 'kakao' | 'sms',
  options?: { sendStatus?: string; aligoMid?: string }
): Promise<void> {
  await db.parentGradeReport.update({
    where: { id: reportId },
    data: {
      sentAt: new Date(),
      sentMethod: method,
      sendStatus: options?.sendStatus ?? 'sent',
      aligoMid: options?.aligoMid ?? null,
    },
  })
}
```

**Step 2: sendParentReportAction에 알리고 연동**

`src/lib/actions/student/parent-report.ts`의 `sendParentReportAction`을 수정:

```typescript
'use server';

import { getCurrentTeacher } from '@/lib/dal';
import { ok, fail, okVoid, type ActionResult, type ActionVoidResult } from '@/lib/errors/action-result';
import { logger } from '@/lib/logger';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import {
  generateParentReport,
  saveParentReport,
  markReportAsSent,
  getParentReports,
  type ParentReportData,
} from '@/features/grade-management/report/parent-report-generator';
import { sendAlimtalk, sendSms, ALIMTALK_TEMPLATES } from '@/features/notification';

// =============================================================================
// 타입 정의
// =============================================================================

export type ParentReportListItem = Awaited<ReturnType<typeof getParentReports>>[number];

// =============================================================================
// Server Actions
// =============================================================================

/**
 * 학부모 리포트 생성 Server Action
 */
export async function generateParentReportAction(
  studentId: string
): Promise<ActionResult<{ reportId: string; reportData: ParentReportData }>> {
  try {
    const teacher = await getCurrentTeacher();

    const reportData = await generateParentReport(studentId, teacher.id);
    const reportId = await saveParentReport(studentId, reportData);

    revalidatePath(`/grades/reports`);
    return ok({ reportId, reportData });
  } catch (error) {
    logger.error({ err: error, studentId }, '학부모 리포트 생성 실패');
    const message = error instanceof Error
      ? error.message
      : '학부모 리포트 생성 중 오류가 발생했습니다.';
    return fail(message);
  }
}

/**
 * 학부모 리포트 발송 Server Action
 *
 * 알리고 API를 통해 카카오 알림톡 또는 SMS로 발송한다.
 */
export async function sendParentReportAction(
  reportId: string,
  method: 'email' | 'kakao' | 'sms'
): Promise<ActionVoidResult> {
  try {
    await getCurrentTeacher();

    // 리포트 + 학부모 정보 조회
    const report = await db.parentGradeReport.findUnique({
      where: { id: reportId },
      include: {
        student: { select: { name: true } },
        parent: { select: { name: true, phone: true } },
      },
    });

    if (!report) {
      return fail('리포트를 찾을 수 없습니다.');
    }

    if (!report.parent?.phone) {
      return fail('학부모 연락처가 등록되지 않았습니다.');
    }

    const reportData = report.reportData as unknown as ParentReportData;
    const parentPhone = report.parent.phone;
    const parentName = report.parent.name;
    const studentName = report.student.name;

    if (method === 'kakao') {
      // 알림톡 발송 (실패 시 SMS 대체)
      const message = buildGradeReportMessage(studentName, reportData);
      const smsMessage = buildGradeReportSmsMessage(studentName, reportData);

      const result = await sendAlimtalk({
        templateCode: ALIMTALK_TEMPLATES.gradeReport,
        receivers: [{
          phone: parentPhone,
          subject: `${studentName} 학생 성적 리포트`,
          message,
          name: parentName,
          fallbackMessage: smsMessage,
          fallbackSubject: `[성적리포트] ${studentName}`,
        }],
        failover: true,
      });

      if (!result.success) {
        return fail(result.errorMessage ?? '알림톡 발송에 실패했습니다.');
      }

      await markReportAsSent(reportId, method, {
        sendStatus: 'sent',
        aligoMid: result.mid,
      });
    } else if (method === 'sms') {
      // SMS 직접 발송
      const smsMessage = buildGradeReportSmsMessage(studentName, reportData);

      const result = await sendSms({
        receiver: parentPhone,
        message: smsMessage,
        title: `[성적리포트] ${studentName}`,
      });

      if (!result.success) {
        return fail(result.errorMessage ?? 'SMS 발송에 실패했습니다.');
      }

      await markReportAsSent(reportId, method, {
        sendStatus: 'sent',
        aligoMid: result.mid,
      });
    } else {
      // email: 추후 구현
      await markReportAsSent(reportId, method);
      logger.info({ reportId, method }, 'Email 발송은 아직 미구현');
    }

    revalidatePath(`/grades/reports`);
    return okVoid();
  } catch (error) {
    logger.error({ err: error, reportId, method }, '학부모 리포트 발송 실패');
    return fail('리포트 발송에 실패했습니다.');
  }
}

/**
 * 학부모 리포트 히스토리 조회 Server Action
 */
export async function getParentReportsAction(
  studentId: string
): Promise<ActionResult<ParentReportListItem[]>> {
  try {
    await getCurrentTeacher();
    const reports = await getParentReports(studentId);
    return ok(reports);
  } catch (error) {
    logger.error({ err: error, studentId }, '학부모 리포트 조회 실패');
    return fail('리포트 히스토리를 불러오는 중 오류가 발생했습니다.');
  }
}

// =============================================================================
// 내부 헬퍼
// =============================================================================

/**
 * 알림톡용 성적 리포트 메시지를 생성한다.
 * 카카오 검수 완료된 템플릿의 변수에 맞게 구성한다.
 */
function buildGradeReportMessage(
  studentName: string,
  reportData: ParentReportData
): string {
  const subjects = reportData.subjectComments
    .map((s) => `${s.subject}: ${s.score}점 - ${s.comment}`)
    .join('\n');

  return `[성적 리포트 안내]

${studentName} 학생의 성적 리포트가 준비되었습니다.

■ 기간: ${reportData.reportPeriod}
■ 요약: ${reportData.summary}

■ 과목별 성적
${subjects}

■ 선생님 한마디
${reportData.teacherNote}`;
}

/**
 * SMS 대체 발송용 축약 메시지를 생성한다.
 * SMS는 90바이트(한글 약 45자) 제한이므로 핵심만 포함한다.
 */
function buildGradeReportSmsMessage(
  studentName: string,
  reportData: ParentReportData
): string {
  return `[방과후학교] ${studentName} 학생 성적 리포트가 준비되었습니다. 기간: ${reportData.reportPeriod}`;
}
```

**Step 3: 타입 체크**

Run: `pnpm typecheck`
Expected: 에러 없음

**Step 4: Commit**

```bash
git add src/lib/actions/student/parent-report.ts src/features/grade-management/report/parent-report-generator.ts
git commit -m "feat: sendParentReportAction에 알리고 알림톡/SMS 연동"
```

---

## Task 8: 전체 테스트 실행 및 검증

**Step 1: 전체 단위 테스트 실행**

Run: `pnpm test`
Expected: 기존 테스트 + 새 테스트 모두 PASS

**Step 2: 타입 체크**

Run: `pnpm typecheck`
Expected: 에러 없음

**Step 3: 린트 체크**

Run: `pnpm lint`
Expected: 에러 없음

**Step 4: 최종 Commit**

```bash
git add -A
git commit -m "chore: 알리고 알림톡 연동 완료 — 전체 검증 통과"
```

---

## 파일 변경 요약

| 액션 | 파일 |
|------|------|
| Modify | `prisma/schema.prisma` (ParentGradeReport +2 필드) |
| Modify | `.env.example` (알리고 환경변수 5개) |
| Create | `src/features/notification/types.ts` |
| Create | `src/features/notification/constants.ts` |
| Create | `src/features/notification/services/aligo-client.ts` |
| Create | `src/features/notification/services/alimtalk.ts` |
| Create | `src/features/notification/services/sms.ts` |
| Create | `src/features/notification/index.ts` |
| Create | `src/features/notification/__tests__/aligo-client.test.ts` |
| Create | `src/features/notification/__tests__/alimtalk.test.ts` |
| Modify | `src/features/grade-management/report/parent-report-generator.ts` (markReportAsSent 확장) |
| Modify | `src/lib/actions/student/parent-report.ts` (알리고 연동) |
