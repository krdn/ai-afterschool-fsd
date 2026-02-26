# 상담 실시간 기록 기능 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 예약된 상담을 시작하고, 체크리스트 기반으로 진행 중 메모를 남기며, 완료 시 자동 정리하는 전용 페이지를 구현한다.

**Architecture:** Prisma에 CounselingNote 모델과 IN_PROGRESS 상태를 추가하고, `/counseling/session/[reservationId]` 전용 페이지에서 분할 화면(왼쪽 AI 자료 / 오른쪽 체크리스트)으로 실시간 기록한다. Server Actions로 자동 저장(debounce 500ms)하고, 완료 시 체크리스트를 summary로 조합하여 CounselingSession을 업데이트한다.

**Tech Stack:** Next.js 15 App Router, TypeScript, Prisma, Zod, Tailwind CSS 4, shadcn/ui, Server Actions

---

### Task 1: Prisma 스키마 변경 + 마이그레이션

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: ReservationStatus enum에 IN_PROGRESS 추가**

`prisma/schema.prisma`의 `ReservationStatus` enum (약 802줄):

```prisma
enum ReservationStatus {
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  CANCELLED
  NO_SHOW
}
```

**Step 2: CounselingNote 모델 추가**

`CounselingSession` 모델 바로 아래에 추가:

```prisma
model CounselingNote {
  id                  String            @id @default(cuid())
  counselingSessionId String
  counselingSession   CounselingSession @relation(fields: [counselingSessionId], references: [id], onDelete: Cascade)
  content             String
  memo                String?
  checked             Boolean           @default(false)
  order               Int
  source              String            @default("MANUAL")
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt

  @@index([counselingSessionId, order])
}
```

**Step 3: CounselingSession에 관계 추가**

`CounselingSession` 모델(약 381줄)의 `reservation` 필드 아래에 추가:

```prisma
  notes             CounselingNote[]
```

**Step 4: 마이그레이션 실행**

Run: `pnpm prisma migrate dev --name add-counseling-note-and-in-progress`
Expected: Migration applied, Prisma Client regenerated

**Step 5: Prisma Client 생성 확인**

Run: `pnpm prisma generate`
Expected: Generated Prisma Client

**Step 6: 커밋**

```bash
git add prisma/
git commit -m "feat: CounselingNote 모델 및 IN_PROGRESS 상태 추가"
```

---

### Task 2: Zod 검증 스키마 + 테스트

**Files:**
- Create: `src/lib/validations/session-notes.ts`
- Create: `src/lib/validations/__tests__/session-notes.test.ts`

**Step 1: Zod 스키마 작성**

`src/lib/validations/session-notes.ts`:

```typescript
import { z } from 'zod'

export const updateNoteSchema = z.object({
  noteId: z.string().min(1, "노트 ID가 필요합니다"),
  checked: z.boolean().optional(),
  memo: z.string().max(500, "메모는 500자 이내로 작성해주세요").optional(),
})

export const addNoteSchema = z.object({
  sessionId: z.string().min(1, "세션 ID가 필요합니다"),
  content: z.string().min(1, "내용을 입력해주세요").max(200, "항목은 200자 이내로 작성해주세요"),
})

export const deleteNoteSchema = z.object({
  noteId: z.string().min(1, "노트 ID가 필요합니다"),
})

export const reorderNotesSchema = z.object({
  sessionId: z.string().min(1, "세션 ID가 필요합니다"),
  noteIds: z.array(z.string().min(1)).min(1, "최소 1개 항목이 필요합니다"),
})

export const completeSessionSchema = z.object({
  sessionId: z.string().min(1, "세션 ID가 필요합니다"),
  reservationId: z.string().min(1, "예약 ID가 필요합니다"),
  type: z.enum(["ACADEMIC", "CAREER", "PSYCHOLOGICAL", "BEHAVIORAL"], {
    message: "상담 유형을 선택해주세요",
  }),
  duration: z.number().min(5, "최소 5분").max(180, "최대 180분"),
  summary: z.string().min(10, "상담 내용은 최소 10자 이상 입력해주세요").max(2000, "상담 내용은 2000자 이내로 작성해주세요"),
  aiSummary: z.string().optional(),
  followUpRequired: z.boolean(),
  followUpDate: z.string().optional(),
  satisfactionScore: z.number().min(1).max(5).optional(),
}).superRefine((data, ctx) => {
  if (data.followUpRequired && !data.followUpDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "후속 조치가 필요한 경우 날짜를 선택해주세요",
      path: ["followUpDate"],
    })
  }
})

export type UpdateNoteInput = z.infer<typeof updateNoteSchema>
export type AddNoteInput = z.infer<typeof addNoteSchema>
export type DeleteNoteInput = z.infer<typeof deleteNoteSchema>
export type ReorderNotesInput = z.infer<typeof reorderNotesSchema>
export type CompleteSessionInput = z.infer<typeof completeSessionSchema>
```

**Step 2: 테스트 작성**

`src/lib/validations/__tests__/session-notes.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  updateNoteSchema,
  addNoteSchema,
  deleteNoteSchema,
  reorderNotesSchema,
  completeSessionSchema,
} from '../session-notes'

describe('updateNoteSchema', () => {
  it('유효한 체크 업데이트', () => {
    const result = updateNoteSchema.safeParse({ noteId: 'abc', checked: true })
    expect(result.success).toBe(true)
  })

  it('유효한 메모 업데이트', () => {
    const result = updateNoteSchema.safeParse({ noteId: 'abc', memo: '메모 내용' })
    expect(result.success).toBe(true)
  })

  it('빈 noteId 거부', () => {
    const result = updateNoteSchema.safeParse({ noteId: '', checked: true })
    expect(result.success).toBe(false)
  })

  it('메모 500자 초과 거부', () => {
    const result = updateNoteSchema.safeParse({ noteId: 'abc', memo: 'a'.repeat(501) })
    expect(result.success).toBe(false)
  })
})

describe('addNoteSchema', () => {
  it('유효한 항목 추가', () => {
    const result = addNoteSchema.safeParse({ sessionId: 'abc', content: '새 항목' })
    expect(result.success).toBe(true)
  })

  it('빈 content 거부', () => {
    const result = addNoteSchema.safeParse({ sessionId: 'abc', content: '' })
    expect(result.success).toBe(false)
  })

  it('content 200자 초과 거부', () => {
    const result = addNoteSchema.safeParse({ sessionId: 'abc', content: 'a'.repeat(201) })
    expect(result.success).toBe(false)
  })
})

describe('deleteNoteSchema', () => {
  it('유효한 삭제', () => {
    const result = deleteNoteSchema.safeParse({ noteId: 'abc' })
    expect(result.success).toBe(true)
  })
})

describe('reorderNotesSchema', () => {
  it('유효한 정렬', () => {
    const result = reorderNotesSchema.safeParse({ sessionId: 'abc', noteIds: ['a', 'b', 'c'] })
    expect(result.success).toBe(true)
  })

  it('빈 배열 거부', () => {
    const result = reorderNotesSchema.safeParse({ sessionId: 'abc', noteIds: [] })
    expect(result.success).toBe(false)
  })
})

describe('completeSessionSchema', () => {
  const validData = {
    sessionId: 'abc',
    reservationId: 'def',
    type: 'ACADEMIC' as const,
    duration: 30,
    summary: '상담 내용을 상세히 기록합니다',
    followUpRequired: false,
  }

  it('유효한 완료 데이터', () => {
    const result = completeSessionSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('후속조치 필요 시 날짜 누락 거부', () => {
    const result = completeSessionSchema.safeParse({ ...validData, followUpRequired: true })
    expect(result.success).toBe(false)
  })

  it('후속조치 필요 시 날짜 있으면 통과', () => {
    const result = completeSessionSchema.safeParse({
      ...validData,
      followUpRequired: true,
      followUpDate: '2026-03-01',
    })
    expect(result.success).toBe(true)
  })

  it('summary 10자 미만 거부', () => {
    const result = completeSessionSchema.safeParse({ ...validData, summary: '짧음' })
    expect(result.success).toBe(false)
  })

  it('만족도 범위 검증 (1-5)', () => {
    expect(completeSessionSchema.safeParse({ ...validData, satisfactionScore: 0 }).success).toBe(false)
    expect(completeSessionSchema.safeParse({ ...validData, satisfactionScore: 3 }).success).toBe(true)
    expect(completeSessionSchema.safeParse({ ...validData, satisfactionScore: 6 }).success).toBe(false)
  })
})
```

**Step 3: 테스트 실행**

Run: `pnpm test src/lib/validations/__tests__/session-notes.test.ts`
Expected: 모든 테스트 통과

**Step 4: 커밋**

```bash
git add src/lib/validations/session-notes.ts src/lib/validations/__tests__/session-notes.test.ts
git commit -m "feat: 상담 실시간 기록 Zod 검증 스키마 및 테스트 추가"
```

---

### Task 3: Server Actions — 상담 시작 (startSessionAction)

**Files:**
- Create: `src/lib/actions/counseling/session-live.ts`

**Step 1: startSessionAction 구현**

`src/lib/actions/counseling/session-live.ts`:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { db, ReservationStatus } from '@/lib/db'
import { getRBACPrisma } from '@/lib/rbac/prisma-rbac'
import { verifySession } from '@/lib/auth/session'
import type { ActionResult } from '@/types/actions'

export type StartSessionResult = {
  sessionId: string
  reservationId: string
}

export async function startSessionAction(
  reservationId: string
): Promise<ActionResult<StartSessionResult>> {
  const session = await verifySession()
  if (!session) {
    return { success: false, error: '인증이 필요합니다' }
  }

  const rbacDb = getRBACPrisma(session)

  // 예약 조회 (RBAC 필터)
  const reservation = await rbacDb.parentCounselingReservation.findUnique({
    where: { id: reservationId, teacherId: session.userId },
    include: { counselingSession: true, student: true },
  })

  if (!reservation) {
    return { success: false, error: '예약을 찾을 수 없습니다' }
  }

  if (reservation.status !== ReservationStatus.SCHEDULED) {
    return { success: false, error: '예약 상태가 SCHEDULED가 아닙니다' }
  }

  // 트랜잭션: 세션 생성/연결 + 상태 변경
  const result = await db.$transaction(async (tx) => {
    let sessionId: string

    if (reservation.counselingSessionId && reservation.counselingSession) {
      // Wizard 예약: 기존 세션 활용
      sessionId = reservation.counselingSessionId
    } else {
      // 일반 예약: 새 세션 생성
      const newSession = await tx.counselingSession.create({
        data: {
          studentId: reservation.studentId,
          teacherId: session.userId,
          sessionDate: reservation.scheduledAt,
          duration: 0,
          type: 'ACADEMIC',
          summary: '',
        },
      })
      sessionId = newSession.id
    }

    // 예약 상태 변경: SCHEDULED → IN_PROGRESS
    await tx.parentCounselingReservation.update({
      where: { id: reservationId },
      data: {
        status: ReservationStatus.IN_PROGRESS,
        counselingSessionId: sessionId,
      },
    })

    return { sessionId, reservationId }
  })

  revalidatePath('/counseling')

  return { success: true, data: result }
}
```

**Step 2: TypeScript 확인**

Run: `pnpm tsc --noEmit --pretty 2>&1 | head -20`
Expected: 에러 없음 (IN_PROGRESS가 Prisma enum에 있으므로)

**Step 3: 커밋**

```bash
git add src/lib/actions/counseling/session-live.ts
git commit -m "feat: startSessionAction 상담 시작 Server Action 추가"
```

---

### Task 4: Server Actions — 노트 CRUD

**Files:**
- Create: `src/lib/actions/counseling/session-notes.ts`

**Step 1: 노트 CRUD Actions 구현**

`src/lib/actions/counseling/session-notes.ts`:

```typescript
'use server'

import { db } from '@/lib/db'
import { verifySession } from '@/lib/auth/session'
import {
  updateNoteSchema,
  addNoteSchema,
  deleteNoteSchema,
  reorderNotesSchema,
} from '@/lib/validations/session-notes'
import type { ActionResult, ActionVoidResult } from '@/types/actions'

// 세션 소유권 확인 헬퍼
async function verifyNoteOwnership(noteId: string, userId: string) {
  const note = await db.counselingNote.findUnique({
    where: { id: noteId },
    include: { counselingSession: true },
  })
  if (!note || note.counselingSession.teacherId !== userId) {
    return null
  }
  return note
}

async function verifySessionOwnership(sessionId: string, userId: string) {
  const session = await db.counselingSession.findUnique({
    where: { id: sessionId },
  })
  if (!session || session.teacherId !== userId) {
    return null
  }
  return session
}

export async function updateNoteAction(
  input: { noteId: string; checked?: boolean; memo?: string }
): Promise<ActionVoidResult> {
  const session = await verifySession()
  if (!session) return { success: false, error: '인증이 필요합니다' }

  const parsed = updateNoteSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const note = await verifyNoteOwnership(parsed.data.noteId, session.userId)
  if (!note) return { success: false, error: '노트를 찾을 수 없습니다' }

  const updateData: Record<string, unknown> = {}
  if (parsed.data.checked !== undefined) updateData.checked = parsed.data.checked
  if (parsed.data.memo !== undefined) updateData.memo = parsed.data.memo

  await db.counselingNote.update({
    where: { id: parsed.data.noteId },
    data: updateData,
  })

  return { success: true }
}

export async function addNoteAction(
  input: { sessionId: string; content: string }
): Promise<ActionResult<{ noteId: string }>> {
  const session = await verifySession()
  if (!session) return { success: false, error: '인증이 필요합니다' }

  const parsed = addNoteSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const counselingSession = await verifySessionOwnership(parsed.data.sessionId, session.userId)
  if (!counselingSession) return { success: false, error: '세션을 찾을 수 없습니다' }

  // 현재 최대 order 조회
  const maxOrder = await db.counselingNote.aggregate({
    where: { counselingSessionId: parsed.data.sessionId },
    _max: { order: true },
  })

  const note = await db.counselingNote.create({
    data: {
      counselingSessionId: parsed.data.sessionId,
      content: parsed.data.content,
      order: (maxOrder._max.order ?? -1) + 1,
      source: 'MANUAL',
    },
  })

  return { success: true, data: { noteId: note.id } }
}

export async function deleteNoteAction(
  noteId: string
): Promise<ActionVoidResult> {
  const session = await verifySession()
  if (!session) return { success: false, error: '인증이 필요합니다' }

  const parsed = deleteNoteSchema.safeParse({ noteId })
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const note = await verifyNoteOwnership(parsed.data.noteId, session.userId)
  if (!note) return { success: false, error: '노트를 찾을 수 없습니다' }

  await db.counselingNote.delete({ where: { id: parsed.data.noteId } })

  return { success: true }
}

export async function reorderNotesAction(
  input: { sessionId: string; noteIds: string[] }
): Promise<ActionVoidResult> {
  const session = await verifySession()
  if (!session) return { success: false, error: '인증이 필요합니다' }

  const parsed = reorderNotesSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const counselingSession = await verifySessionOwnership(parsed.data.sessionId, session.userId)
  if (!counselingSession) return { success: false, error: '세션을 찾을 수 없습니다' }

  await db.$transaction(
    parsed.data.noteIds.map((noteId, index) =>
      db.counselingNote.update({
        where: { id: noteId },
        data: { order: index },
      })
    )
  )

  return { success: true }
}
```

**Step 2: TypeScript 확인**

Run: `pnpm tsc --noEmit --pretty 2>&1 | head -20`
Expected: 에러 없음

**Step 3: 커밋**

```bash
git add src/lib/actions/counseling/session-notes.ts
git commit -m "feat: 상담 노트 CRUD Server Actions 추가"
```

---

### Task 5: Server Actions — AI 체크리스트 생성 + 상담 완료

**Files:**
- Create: `src/lib/actions/counseling/session-checklist-ai.ts`
- Modify: `src/lib/actions/counseling/session-live.ts`

**Step 1: AI 체크리스트 생성 Action**

`src/lib/actions/counseling/session-checklist-ai.ts`:

```typescript
'use server'

import { db } from '@/lib/db'
import { verifySession } from '@/lib/auth/session'
import { generateWithProvider } from '@/lib/ai/universal-router'
import type { ActionVoidResult } from '@/types/actions'

function buildChecklistPrompt(topic: string, aiSummary: string | null): string {
  let prompt = `당신은 학교 상담 전문가입니다.
다음 상담 정보를 기반으로 교사가 상담 중 확인해야 할 체크리스트 항목을 5-8개 생성해주세요.

## 상담 주제
${topic}
`

  if (aiSummary) {
    prompt += `
## 상담 분석 자료
${aiSummary}
`
  }

  prompt += `
## 출력 형식
각 항목을 줄바꿈으로 구분하여 작성해주세요.
항목만 작성하고, 번호나 기호는 붙이지 마세요.
짧고 명확하게 작성해주세요 (각 항목 50자 이내).

예시:
학업 성적 변화 원인 파악
또래 관계 현황 확인
가정 내 학습 환경 점검
`

  return prompt
}

export async function generateChecklistAction(
  sessionId: string,
  topic: string,
  aiSummary: string | null,
): Promise<ActionVoidResult> {
  const session = await verifySession()
  if (!session) return { success: false, error: '인증이 필요합니다' }

  // 세션 소유권 확인
  const counselingSession = await db.counselingSession.findUnique({
    where: { id: sessionId },
  })
  if (!counselingSession || counselingSession.teacherId !== session.userId) {
    return { success: false, error: '세션을 찾을 수 없습니다' }
  }

  try {
    const prompt = buildChecklistPrompt(topic, aiSummary)

    const result = await generateWithProvider({
      prompt,
      featureType: 'counseling_scenario',
      teacherId: session.userId,
      maxOutputTokens: 300,
      temperature: 0.3,
    })

    // 결과 파싱: 줄바꿈으로 분리, 빈 줄 제거
    const items = result.text
      .split('\n')
      .map((line: string) => line.replace(/^[-•*\d.)\s]+/, '').trim())
      .filter((line: string) => line.length > 0 && line.length <= 200)

    if (items.length === 0) {
      return { success: false, error: 'AI가 체크리스트를 생성하지 못했습니다' }
    }

    // CounselingNote 레코드 일괄 생성
    await db.$transaction(
      items.map((content: string, index: number) =>
        db.counselingNote.create({
          data: {
            counselingSessionId: sessionId,
            content,
            order: index,
            source: 'AI',
          },
        })
      )
    )

    return { success: true }
  } catch {
    return { success: false, error: 'AI 체크리스트 생성에 실패했습니다' }
  }
}
```

**Step 2: completeSessionAction 추가 (session-live.ts에)**

`src/lib/actions/counseling/session-live.ts` 파일 하단에 추가:

```typescript
import { completeSessionSchema, type CompleteSessionInput } from '@/lib/validations/session-notes'

export type CompleteSessionResult = {
  sessionId: string
  reservationId: string
}

export async function completeSessionAction(
  input: CompleteSessionInput
): Promise<ActionResult<CompleteSessionResult>> {
  const session = await verifySession()
  if (!session) return { success: false, error: '인증이 필요합니다' }

  const parsed = completeSessionSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const { sessionId, reservationId, type, duration, summary, aiSummary, followUpRequired, followUpDate, satisfactionScore } = parsed.data

  const rbacDb = getRBACPrisma(session)

  // 예약 확인
  const reservation = await rbacDb.parentCounselingReservation.findUnique({
    where: { id: reservationId, teacherId: session.userId },
  })

  if (!reservation) {
    return { success: false, error: '예약을 찾을 수 없습니다' }
  }

  if (reservation.status !== ReservationStatus.IN_PROGRESS) {
    return { success: false, error: '진행 중인 상담만 완료할 수 있습니다' }
  }

  // 트랜잭션: 세션 업데이트 + 예약 완료
  await db.$transaction(async (tx) => {
    await tx.counselingSession.update({
      where: { id: sessionId },
      data: {
        type: type as any,
        duration,
        summary,
        aiSummary: aiSummary || undefined,
        followUpRequired,
        followUpDate: followUpDate ? new Date(followUpDate) : undefined,
        satisfactionScore: satisfactionScore ?? undefined,
      },
    })

    await tx.parentCounselingReservation.update({
      where: { id: reservationId },
      data: { status: ReservationStatus.COMPLETED },
    })
  })

  revalidatePath('/counseling')

  return { success: true, data: { sessionId, reservationId } }
}
```

**Step 3: 세션 데이터 로드 Action 추가 (session-live.ts에)**

```typescript
export async function getSessionWithNotesAction(
  reservationId: string
) {
  const session = await verifySession()
  if (!session) return { success: false as const, error: '인증이 필요합니다' }

  const reservation = await db.parentCounselingReservation.findUnique({
    where: { id: reservationId, teacherId: session.userId },
    include: {
      student: true,
      parent: true,
      counselingSession: {
        include: {
          notes: { orderBy: { order: 'asc' } },
        },
      },
    },
  })

  if (!reservation) {
    return { success: false as const, error: '예약을 찾을 수 없습니다' }
  }

  return { success: true as const, data: reservation }
}
```

**Step 4: 액션 export 추가**

`src/lib/actions/counseling/index.ts`에 추가:

```typescript
export * from "./session-live"
export * from "./session-notes"
export * from "./session-checklist-ai"
```

**Step 5: TypeScript 확인**

Run: `pnpm tsc --noEmit --pretty 2>&1 | head -30`
Expected: 에러 없음

**Step 6: 커밋**

```bash
git add src/lib/actions/counseling/
git commit -m "feat: AI 체크리스트 생성 및 상담 완료 Server Actions 추가"
```

---

### Task 6: 기존 컴포넌트 수정 — IN_PROGRESS 상태 + [상담 시작] 버튼

**Files:**
- Modify: `src/components/counseling/utils.ts`
- Modify: `src/components/counseling/reservation-card.tsx`
- Modify: `src/components/counseling/reservation-detail-dialog.tsx`

**Step 1: utils.ts에 IN_PROGRESS 상태 추가**

`utils.ts`의 `getStatusLabel` 함수에 IN_PROGRESS case 추가, `getStatusVariant` 함수에도 추가.

**Step 2: reservation-card.tsx에 IN_PROGRESS 상태 표시**

- IN_PROGRESS 상태일 때 "진행 중" 뱃지 (indigo/purple 계열)
- [상담 이어가기] 버튼 표시 → 전용 페이지로 이동

**Step 3: reservation-detail-dialog.tsx에 [상담 시작] 버튼 추가**

- SCHEDULED 상태일 때 헤더 영역에 [상담 시작] 버튼 (Play 아이콘, 파란색)
- 클릭 시: `startSessionAction(reservationId)` 호출 → 성공 시 `/counseling/session/${reservationId}`로 이동
- IN_PROGRESS 상태일 때: [상담 이어가기] 버튼 → 전용 페이지로 이동

**Step 4: TypeScript 확인**

Run: `pnpm tsc --noEmit --pretty 2>&1 | head -20`

**Step 5: 커밋**

```bash
git add src/components/counseling/utils.ts src/components/counseling/reservation-card.tsx src/components/counseling/reservation-detail-dialog.tsx
git commit -m "feat: IN_PROGRESS 상태 지원 및 상담 시작 버튼 추가"
```

---

### Task 7: 전용 페이지 — SSR 라우트 + 메인 레이아웃

**Files:**
- Create: `src/app/[locale]/(dashboard)/counseling/session/[reservationId]/page.tsx`
- Create: `src/components/counseling/session-live/session-live-page.tsx`

**Step 1: SSR 페이지 생성**

`src/app/[locale]/(dashboard)/counseling/session/[reservationId]/page.tsx`:

서버 컴포넌트에서 `getSessionWithNotesAction(reservationId)` 호출 → 데이터를 `SessionLivePage` 클라이언트 컴포넌트에 전달. 예약이 없거나 IN_PROGRESS가 아니면 `/counseling`으로 redirect.

**Step 2: SessionLivePage 클라이언트 컴포넌트**

`src/components/counseling/session-live/session-live-page.tsx`:

분할 화면 레이아웃:
- 헤더: 돌아가기 버튼, 학생명·주제, SessionTimer, [상담 완료] 버튼
- 왼쪽 40%: SessionReferencePanel (placeholder)
- 오른쪽 60%: SessionChecklist (placeholder)
- 하단: SessionCompleteForm (조건부 표시)

Tailwind 레이아웃: `grid grid-cols-[2fr_3fr] gap-4 h-[calc(100vh-12rem)]`

**Step 3: 빌드 확인**

Run: `pnpm build 2>&1 | tail -10`
Expected: 빌드 성공

**Step 4: 커밋**

```bash
git add src/app/[locale]/(dashboard)/counseling/session/ src/components/counseling/session-live/
git commit -m "feat: 상담 실시간 기록 전용 페이지 및 레이아웃 추가"
```

---

### Task 8: SessionReferencePanel — AI 자료 탭

**Files:**
- Create: `src/components/counseling/session-live/session-reference-panel.tsx`

**Step 1: 참조 패널 구현**

aiSummary를 `parseAiSummary()`로 3개 섹션으로 분리하여 탭으로 표시:
- [분석 보고서] 탭
- [시나리오] 탭
- [학부모용] 탭

각 탭에서 `ReactMarkdown` + `remarkGfm`으로 마크다운 렌더링. aiSummary가 없으면 "AI 자료가 없습니다" 안내 메시지.

기존 `reservation-detail-dialog.tsx`의 `AiSummaryTabs` 패턴 참조.

**Step 2: SessionLivePage에 연결**

placeholder를 실제 `SessionReferencePanel`로 교체.

**Step 3: 커밋**

```bash
git add src/components/counseling/session-live/
git commit -m "feat: SessionReferencePanel AI 자료 탭 컴포넌트 추가"
```

---

### Task 9: SessionChecklist — 체크리스트 목록 + 자동 저장

**Files:**
- Create: `src/components/counseling/session-live/session-checklist.tsx`
- Create: `src/components/counseling/session-live/session-checklist-item.tsx`

**Step 1: SessionChecklistItem 구현**

개별 항목 컴포넌트:
- Checkbox (checked 상태)
- content 텍스트 (checked 시 취소선)
- 메모 Input (클릭하면 펼침)
- source가 "AI"이면 작은 AI 뱃지 표시
- 삭제 버튼 (X)

체크/메모 변경 시 debounce 500ms로 `updateNoteAction` 호출. `useCallback` + `useRef`로 타이머 관리.

**Step 2: SessionChecklist 구현**

목록 컴포넌트:
- `SessionChecklistItem` 반복 렌더링
- [+ 항목 추가] 버튼 → 인라인 Input 표시 → Enter/blur 시 `addNoteAction` 호출
- 항목 삭제 시 `deleteNoteAction` 호출 → 로컬 상태에서 제거
- 저장 상태 표시: "저장 중...", "저장됨 ✓"

**Step 3: SessionLivePage에 연결**

placeholder를 실제 `SessionChecklist`로 교체.

**Step 4: 커밋**

```bash
git add src/components/counseling/session-live/
git commit -m "feat: SessionChecklist 체크리스트 + 자동 저장 컴포넌트 추가"
```

---

### Task 10: SessionTimer + SessionCompleteForm

**Files:**
- Create: `src/components/counseling/session-live/session-timer.tsx`
- Create: `src/components/counseling/session-live/session-complete-form.tsx`

**Step 1: SessionTimer 구현**

`useEffect` + `setInterval(1000)`으로 경과 시간 표시.
시작 시간은 예약의 `updatedAt` (IN_PROGRESS로 변경된 시점) 사용.
"⏱ 00:15:30" 형식으로 HH:MM:SS 표시.

**Step 2: SessionCompleteForm 구현**

[상담 완료] 버튼 클릭 시 하단에 폼 표시:
- 상담 유형 Select
- 상담 시간 Input (타이머 값으로 자동 채움, 수동 수정 가능)
- summary Textarea — 체크된 항목 + 메모를 자동 조합하여 초기값 설정:
  ```
  ✓ 수학 성적 하락 원인 파악 → 2학기 중간부터 급락
  ✓ 친구 관계 확인 → 영희랑 다툼 있었음
  ✗ 가정환경 변화 여부
  ```
- 만족도 별점 (기존 session-record-form.tsx의 인터랙티브 별점 패턴 재사용)
- 후속조치 Checkbox + 날짜 Input
- [저장] [취소] 버튼

저장 시 `completeSessionAction` 호출 → 성공 시 `/counseling` 으로 이동.

**Step 3: SessionLivePage에 연결**

헤더에 SessionTimer, 하단에 SessionCompleteForm 연결.

**Step 4: 커밋**

```bash
git add src/components/counseling/session-live/
git commit -m "feat: SessionTimer 및 SessionCompleteForm 컴포넌트 추가"
```

---

### Task 11: 통합 테스트 + 빌드 확인

**Files:** 없음 (검증만)

**Step 1: 전체 테스트 실행**

Run: `pnpm test`
Expected: 모든 테스트 통과

**Step 2: TypeScript 타입 확인**

Run: `pnpm tsc --noEmit --pretty`
Expected: 에러 없음

**Step 3: Next.js 빌드 확인**

Run: `pnpm build`
Expected: 빌드 성공

**Step 4: 최종 커밋 (필요 시)**

```bash
git add -A
git commit -m "feat: 상담 실시간 기록 기능 통합 완료"
```
