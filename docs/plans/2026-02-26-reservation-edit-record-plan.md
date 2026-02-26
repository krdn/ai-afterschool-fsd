# 상담 예약 수정 & 상담 기록 통합 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 기존 ReservationDetailDialog를 읽기/편집/기록 3모드로 확장하여, 예약 수정과 상담 완료 기록을 하나의 다이얼로그에서 처리한다.

**Architecture:** ReservationDetailDialog에 mode 상태(read/edit/record)를 추가하고, 각 모드별 하위 컴포넌트(ReservationEditForm, SessionRecordForm)를 새로 생성한다. 백엔드는 completeWithRecordAction(상담 완료+기록)과 invalidateAiSummaryAction(AI 보고서 무효화) 2개의 신규 Server Action을 추가한다.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Prisma, Zod, Tailwind CSS 4, shadcn/ui, sonner (toast)

---

## Task 1: completeWithRecord Zod 검증 스키마 추가

**Files:**
- Modify: `src/lib/validations/reservations.ts`
- Test: `src/lib/validations/__tests__/reservations.test.ts`

**Step 1: 테스트 파일 작성**

```typescript
// src/lib/validations/__tests__/reservations.test.ts
import { describe, it, expect } from "vitest"
import { completeWithRecordSchema } from "../reservations"

const validData = {
  reservationId: "res-001",
  type: "ACADEMIC" as const,
  duration: 30,
  summary: "학생의 학업 성취도에 대해 상담을 진행했습니다.",
  followUpRequired: false,
}

describe("completeWithRecordSchema", () => {
  it("유효한 데이터를 통과시킨다", () => {
    const result = completeWithRecordSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it("선택 필드 포함 데이터를 통과시킨다", () => {
    const result = completeWithRecordSchema.safeParse({
      ...validData,
      aiSummary: "AI 생성 요약",
      followUpRequired: true,
      followUpDate: "2026-04-01",
      satisfactionScore: 4,
    })
    expect(result.success).toBe(true)
  })

  it("reservationId가 비어있으면 실패한다", () => {
    const result = completeWithRecordSchema.safeParse({ ...validData, reservationId: "" })
    expect(result.success).toBe(false)
  })

  it("잘못된 상담 유형을 거부한다", () => {
    const result = completeWithRecordSchema.safeParse({ ...validData, type: "INVALID" })
    expect(result.success).toBe(false)
  })

  it("duration이 5분 미만이면 실패한다", () => {
    const result = completeWithRecordSchema.safeParse({ ...validData, duration: 4 })
    expect(result.success).toBe(false)
  })

  it("duration이 180분 초과면 실패한다", () => {
    const result = completeWithRecordSchema.safeParse({ ...validData, duration: 181 })
    expect(result.success).toBe(false)
  })

  it("summary가 10자 미만이면 실패한다", () => {
    const result = completeWithRecordSchema.safeParse({ ...validData, summary: "짧음" })
    expect(result.success).toBe(false)
  })

  it("summary가 1000자 초과면 실패한다", () => {
    const result = completeWithRecordSchema.safeParse({ ...validData, summary: "가".repeat(1001) })
    expect(result.success).toBe(false)
  })

  it("followUpRequired=true인데 followUpDate가 없으면 실패한다", () => {
    const result = completeWithRecordSchema.safeParse({ ...validData, followUpRequired: true })
    expect(result.success).toBe(false)
  })

  it("satisfactionScore가 0이면 실패한다", () => {
    const result = completeWithRecordSchema.safeParse({ ...validData, satisfactionScore: 0 })
    expect(result.success).toBe(false)
  })

  it("satisfactionScore가 6이면 실패한다", () => {
    const result = completeWithRecordSchema.safeParse({ ...validData, satisfactionScore: 6 })
    expect(result.success).toBe(false)
  })

  it.each([1, 2, 3, 4, 5])("satisfactionScore %d를 허용한다", (score) => {
    const result = completeWithRecordSchema.safeParse({ ...validData, satisfactionScore: score })
    expect(result.success).toBe(true)
  })
})
```

**Step 2: 테스트 실행하여 실패 확인**

Run: `pnpm vitest run src/lib/validations/__tests__/reservations.test.ts`
Expected: FAIL — `completeWithRecordSchema`가 존재하지 않으므로 import 에러

**Step 3: 스키마 구현**

`src/lib/validations/reservations.ts` 끝에 추가:

```typescript
/**
 * 예약 완료 + 상담 기록 동시 저장 스키마
 */
export const completeWithRecordSchema = z.object({
  reservationId: z.string().min(1, "예약 ID가 필요합니다"),
  type: z.enum(["ACADEMIC", "CAREER", "PSYCHOLOGICAL", "BEHAVIORAL"], {
    message: "상담 유형을 선택해주세요",
  }),
  duration: z
    .number()
    .min(5, "상담 시간은 최소 5분입니다")
    .max(180, "상담 시간은 최대 180분입니다"),
  summary: z
    .string()
    .min(10, "상담 내용은 10자 이상 입력해주세요")
    .max(1000, "상담 내용은 1000자 이하여야 합니다"),
  aiSummary: z.string().optional(),
  followUpRequired: z.boolean(),
  followUpDate: z
    .string()
    .optional()
    .refine((val) => !val || !Number.isNaN(new Date(val).getTime()), {
      message: "올바른 날짜 형식이 아닙니다",
    }),
  satisfactionScore: z
    .number()
    .min(1, "만족도는 1 이상이어야 합니다")
    .max(5, "만족도는 5 이하여야 합니다")
    .optional(),
}).superRefine((data, ctx) => {
  if (data.followUpRequired && !data.followUpDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "후속 조치 날짜를 입력해주세요",
      path: ["followUpDate"],
    })
  }
})

export type CompleteWithRecordInput = z.infer<typeof completeWithRecordSchema>
```

**Step 4: 테스트 실행하여 통과 확인**

Run: `pnpm vitest run src/lib/validations/__tests__/reservations.test.ts`
Expected: PASS — 모든 12개 테스트 통과

**Step 5: 커밋**

```bash
git add src/lib/validations/reservations.ts src/lib/validations/__tests__/reservations.test.ts
git commit -m "feat: completeWithRecord 검증 스키마 추가"
```

---

## Task 2: completeWithRecordAction Server Action 생성

**Files:**
- Create: `src/lib/actions/counseling/reservation-complete.ts`
- Modify: `src/lib/actions/counseling/index.ts` (export 추가)

**Step 1: Server Action 구현**

```typescript
// src/lib/actions/counseling/reservation-complete.ts
'use server'

import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/dal'
import { getRBACPrisma } from '@/lib/db/common/rbac'
import { db } from '@/lib/db/client'
import { ReservationStatus } from '@/lib/db'
import { completeWithRecordSchema } from '@/lib/validations/reservations'
import type { CompleteWithRecordInput } from '@/lib/validations/reservations'
import { ok, fail, fieldError, type ActionResult } from '@/lib/errors/action-result'
import { logger } from '@/lib/logger'

type CompleteWithRecordResult = ActionResult<{
  reservationId: string
  counselingSessionId: string
}>

/**
 * 예약 완료 + 상담 기록 동시 저장
 *
 * 기존 completeReservationAction과 달리 교사가 입력한
 * 상담 유형/시간/내용/만족도/후속 조치를 CounselingSession에 반영한다.
 *
 * 트랜잭션:
 * 1. 예약 상태 SCHEDULED 확인
 * 2. CounselingSession 생성 (교사 입력값 반영)
 * 3. 예약 상태 → COMPLETED + counselingSessionId 연결
 */
export async function completeWithRecordAction(
  input: CompleteWithRecordInput
): Promise<CompleteWithRecordResult> {
  const session = await verifySession()
  if (!session) return fail('인증되지 않은 요청입니다.')

  const parsed = completeWithRecordSchema.safeParse(input)
  if (!parsed.success) {
    return fieldError(parsed.error.flatten().fieldErrors as Record<string, string[]>)
  }

  const {
    reservationId, type, duration, summary,
    aiSummary, followUpRequired, followUpDate, satisfactionScore,
  } = parsed.data

  const rbacDb = getRBACPrisma(session)

  try {
    // 예약 접근 권한 확인
    const reservation = await rbacDb.parentCounselingReservation.findUnique({
      where: { id: reservationId, teacherId: session.userId },
      select: {
        id: true,
        studentId: true,
        status: true,
        scheduledAt: true,
        counselingSessionId: true,
      },
    })

    if (!reservation) return fail('예약을 찾을 수 없습니다.')
    if (reservation.status !== ReservationStatus.SCHEDULED) {
      return fail('이미 완료된 예약은 상태를 변경할 수 없습니다.')
    }

    // 트랜잭션: CounselingSession 생성 + 예약 상태 변경
    const result = await db.$transaction(async (tx) => {
      // 기존 AI 보고서용 CounselingSession이 있으면 업데이트, 없으면 생성
      let counselingSessionId: string

      if (reservation.counselingSessionId) {
        // Wizard로 생성된 예약: 기존 세션 업데이트
        await tx.counselingSession.update({
          where: { id: reservation.counselingSessionId },
          data: {
            duration,
            type,
            summary,
            ...(aiSummary !== undefined && { aiSummary }),
            followUpRequired,
            ...(followUpDate && { followUpDate: new Date(followUpDate) }),
            ...(satisfactionScore !== undefined && { satisfactionScore }),
          },
        })
        counselingSessionId = reservation.counselingSessionId
      } else {
        // 일반 예약: 새 세션 생성
        const newSession = await tx.counselingSession.create({
          data: {
            studentId: reservation.studentId,
            teacherId: session.userId,
            sessionDate: reservation.scheduledAt,
            duration,
            type,
            summary,
            aiSummary: aiSummary || null,
            followUpRequired,
            ...(followUpDate && { followUpDate: new Date(followUpDate) }),
            ...(satisfactionScore !== undefined && { satisfactionScore }),
          },
        })
        counselingSessionId = newSession.id
      }

      // 예약 상태 COMPLETED로 변경
      await tx.parentCounselingReservation.update({
        where: { id: reservationId },
        data: {
          status: ReservationStatus.COMPLETED,
          counselingSessionId,
        },
      })

      return { reservationId, counselingSessionId }
    })

    revalidatePath('/counseling')
    revalidatePath(`/students/${reservation.studentId}`)

    return ok(result)
  } catch (error) {
    logger.error({ err: error }, 'Failed to complete reservation with record')
    return fail('상담 완료 처리 중 오류가 발생했습니다.')
  }
}
```

**Step 2: index.ts에 export 추가**

`src/lib/actions/counseling/index.ts` 끝에 추가:

```typescript
export * from "./reservation-complete";
```

**Step 3: TypeScript 컴파일 확인**

Run: `pnpm tsc --noEmit --pretty 2>&1 | head -20`
Expected: 에러 없음

**Step 4: 커밋**

```bash
git add src/lib/actions/counseling/reservation-complete.ts src/lib/actions/counseling/index.ts
git commit -m "feat: completeWithRecordAction Server Action 추가"
```

---

## Task 3: invalidateAiSummaryAction Server Action 생성

**Files:**
- Create: `src/lib/actions/counseling/reservation-ai.ts`
- Modify: `src/lib/actions/counseling/index.ts` (export 추가)

**Step 1: Server Action 구현**

```typescript
// src/lib/actions/counseling/reservation-ai.ts
'use server'

import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/dal'
import { getRBACPrisma } from '@/lib/db/common/rbac'
import { db } from '@/lib/db/client'
import { okVoid, fail, type ActionVoidResult } from '@/lib/errors/action-result'
import { logger } from '@/lib/logger'

/**
 * 예약에 연결된 CounselingSession의 aiSummary를 무효화(null)
 *
 * 예약 수정 시 학생이나 주제가 변경되면 기존 AI 보고서가
 * 더 이상 유효하지 않으므로 삭제한다.
 */
export async function invalidateAiSummaryAction(
  reservationId: string
): Promise<ActionVoidResult> {
  const session = await verifySession()
  if (!session) return fail('인증되지 않은 요청입니다.')

  const rbacDb = getRBACPrisma(session)

  try {
    // 예약 조회 (소유권 확인 + counselingSessionId)
    const reservation = await rbacDb.parentCounselingReservation.findUnique({
      where: { id: reservationId, teacherId: session.userId },
      select: { id: true, studentId: true, counselingSessionId: true },
    })

    if (!reservation) return fail('예약을 찾을 수 없습니다.')

    // counselingSession이 없으면 무효화할 대상 없음
    if (!reservation.counselingSessionId) return okVoid()

    // aiSummary를 null로 업데이트
    await db.counselingSession.update({
      where: { id: reservation.counselingSessionId },
      data: { aiSummary: null },
    })

    revalidatePath('/counseling')
    revalidatePath(`/students/${reservation.studentId}`)

    return okVoid()
  } catch (error) {
    logger.error({ err: error }, 'Failed to invalidate AI summary')
    return fail('AI 보고서 무효화 중 오류가 발생했습니다.')
  }
}
```

**Step 2: index.ts에 export 추가**

`src/lib/actions/counseling/index.ts` 끝에 추가:

```typescript
export * from "./reservation-ai";
```

**Step 3: TypeScript 컴파일 확인**

Run: `pnpm tsc --noEmit --pretty 2>&1 | head -20`
Expected: 에러 없음

**Step 4: 커밋**

```bash
git add src/lib/actions/counseling/reservation-ai.ts src/lib/actions/counseling/index.ts
git commit -m "feat: invalidateAiSummaryAction Server Action 추가"
```

---

## Task 4: ReservationDetailDialog 3모드 확장 + 읽기 뷰 추출

**Files:**
- Modify: `src/components/counseling/reservation-detail-dialog.tsx`

**Step 1: 모드 상태 추가 및 읽기 뷰 추출**

`reservation-detail-dialog.tsx` 전체를 아래 코드로 교체한다.

핵심 변경:
- `DialogMode` 타입 추가 (`'read' | 'edit' | 'record'`)
- `mode` 상태 추가
- 기존 읽기 뷰를 `DetailReadView`로 추출
- SCHEDULED 상태일 때 헤더에 수정/완료 버튼 표시
- mode에 따라 `ReservationEditForm` 또는 `SessionRecordForm` 렌더링 (Task 5, 6에서 구현)
- 다이얼로그 닫힐 때 mode를 'read'로 리셋
- `onReservationUpdated` 콜백 props 추가 (목록 갱신용)

```typescript
// src/components/counseling/reservation-detail-dialog.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Loader2, Pencil, CheckCircle } from 'lucide-react'
import { getReservationByIdAction } from '@/lib/actions/counseling/reservations-query'
import { toast } from 'sonner'
import { getParentRelationLabel, parseAiSummary } from './utils'
import { ReservationEditForm } from './reservation-edit-form'
import { SessionRecordForm } from './session-record-form'

type DialogMode = 'read' | 'edit' | 'record'

interface ReservationDetailDialogProps {
  reservationId: string | null
  initialMode?: DialogMode
  onClose: () => void
}

export type ReservationDetail = NonNullable<
  Extract<Awaited<ReturnType<typeof getReservationByIdAction>>, { success: true }>['data']
>

export function ReservationDetailDialog({
  reservationId,
  initialMode = 'read',
  onClose,
}: ReservationDetailDialogProps) {
  const router = useRouter()
  const [detail, setDetail] = useState<ReservationDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [mode, setMode] = useState<DialogMode>(initialMode)

  const stableOnClose = useCallback(onClose, [onClose])

  // initialMode이 바뀌면 동기화
  useEffect(() => {
    if (reservationId) setMode(initialMode)
  }, [initialMode, reservationId])

  // 데이터 로드
  const loadDetail = useCallback(async (id: string) => {
    setIsLoading(true)
    try {
      const result = await getReservationByIdAction(id)
      if (result.success) {
        setDetail(result.data)
      } else {
        toast.error(result.error || '예약 정보를 불러오지 못했습니다.')
        stableOnClose()
      }
    } catch {
      toast.error('오류가 발생했습니다.')
      stableOnClose()
    } finally {
      setIsLoading(false)
    }
  }, [stableOnClose])

  useEffect(() => {
    if (!reservationId) {
      setDetail(null)
      setMode('read')
      return
    }
    loadDetail(reservationId)
  }, [reservationId, loadDetail])

  // 저장 성공 후 처리
  const handleSaveSuccess = useCallback(() => {
    setMode('read')
    if (reservationId) loadDetail(reservationId)
    router.refresh()
  }, [reservationId, loadDetail, router])

  // 완료 저장 성공 (다이얼로그 닫기)
  const handleRecordSuccess = useCallback(() => {
    router.refresh()
    stableOnClose()
  }, [router, stableOnClose])

  // 다이얼로그 닫기
  const handleClose = () => {
    setMode('read')
    onClose()
  }

  const isScheduled = detail?.status === 'SCHEDULED'
  const dialogTitle = mode === 'edit' ? '예약 수정' : mode === 'record' ? '상담 기록 작성' : '예약 상세'

  return (
    <Dialog open={!!reservationId} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{dialogTitle}</DialogTitle>
            {mode === 'read' && isScheduled && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMode('edit')}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  수정
                </Button>
                <Button
                  size="sm"
                  onClick={() => setMode('record')}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  완료
                </Button>
              </div>
            )}
          </div>
          {detail && mode === 'read' && (
            <DialogDescription>
              {format(new Date(detail.scheduledAt), 'yyyy년 M월 d일 E요일 HH:mm', { locale: ko })}
            </DialogDescription>
          )}
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-[200px]">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">로딩 중...</span>
          </div>
        ) : detail ? (
          <>
            {mode === 'read' && <DetailReadView detail={detail} />}
            {mode === 'edit' && (
              <ReservationEditForm
                reservation={detail}
                onSave={handleSaveSuccess}
                onCancel={() => setMode('read')}
              />
            )}
            {mode === 'record' && (
              <SessionRecordForm
                reservation={detail}
                onSave={handleRecordSuccess}
                onCancel={() => setMode('read')}
              />
            )}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

/**
 * 읽기 모드 뷰 — 기존 상세 다이얼로그 본문을 추출
 */
function DetailReadView({ detail }: { detail: ReservationDetail }) {
  const [aiTab, setAiTab] = useState('analysis')
  const aiSummary = detail.counselingSession?.aiSummary
  const sections = aiSummary ? parseAiSummary(aiSummary) : null

  return (
    <div className="space-y-4">
      {/* 기본 정보 */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="font-medium text-muted-foreground">학생</span>
          <p>{detail.student.name} {detail.student.school && `(${detail.student.school} ${detail.student.grade}학년)`}</p>
        </div>
        <div>
          <span className="font-medium text-muted-foreground">학부모</span>
          <p>{detail.parent.name} ({getParentRelationLabel(detail.parent.relation)})</p>
        </div>
        <div className="col-span-2">
          <span className="font-medium text-muted-foreground">상담 주제</span>
          <p>{detail.topic}</p>
        </div>
      </div>

      {/* AI 문서 */}
      {sections ? (
        <Tabs value={aiTab} onValueChange={setAiTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="analysis">분석 보고서</TabsTrigger>
            <TabsTrigger value="scenario">시나리오</TabsTrigger>
            <TabsTrigger value="parent">학부모 공유용</TabsTrigger>
          </TabsList>
          <TabsContent value="analysis" className="mt-3">
            <div className="prose prose-sm max-w-none max-h-[400px] overflow-y-auto border rounded-lg p-4">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {sections.analysis}
              </ReactMarkdown>
            </div>
          </TabsContent>
          <TabsContent value="scenario" className="mt-3">
            <div className="prose prose-sm max-w-none max-h-[400px] overflow-y-auto border rounded-lg p-4">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {sections.scenario}
              </ReactMarkdown>
            </div>
          </TabsContent>
          <TabsContent value="parent" className="mt-3">
            <div className="prose prose-sm max-w-none max-h-[400px] overflow-y-auto border rounded-lg p-4">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {sections.parent}
              </ReactMarkdown>
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="text-sm text-muted-foreground border rounded-lg p-4 text-center">
          AI 보고서가 없습니다. (AI 보완 없이 등록된 예약)
        </div>
      )}
    </div>
  )
}
```

**Step 2: TypeScript 컴파일 확인 (ReservationEditForm, SessionRecordForm 미구현이므로 에러 예상)**

Run: `pnpm tsc --noEmit --pretty 2>&1 | head -20`
Expected: `Cannot find module './reservation-edit-form'` 에러 — Task 5에서 해결

**Step 3: 커밋 (WIP — 하위 컴포넌트 추가 후 완성)**

```bash
git add src/components/counseling/reservation-detail-dialog.tsx
git commit -m "refactor: ReservationDetailDialog 3모드 구조로 확장 (WIP)"
```

---

## Task 5: ReservationEditForm 컴포넌트 생성

**Files:**
- Create: `src/components/counseling/reservation-edit-form.tsx`

**Step 1: 편집 폼 구현**

핵심 기능:
- 기존 예약 데이터로 폼 초기화
- `ReservationCalendar` + `TimeSlotGrid` 재사용 (날짜/시간 선택)
- 학생/학부모 Select (학생 변경 시 학부모 목록 갱신)
- 주제 Input
- 학생/주제 변경 시 AI 무효화 경고 AlertDialog
- 저장 시 `updateReservationAction` + (필요 시) `invalidateAiSummaryAction`

```typescript
// src/components/counseling/reservation-edit-form.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ReservationCalendar } from './reservation-calendar'
import { TimeSlotGrid } from './time-slot-grid'
import { updateReservationAction } from '@/lib/actions/counseling/reservations'
import { invalidateAiSummaryAction } from '@/lib/actions/counseling/reservation-ai'
import { getReservationsAction } from '@/lib/actions/counseling/reservations-query'
import { getStudentsAction, type StudentWithParents } from '@/lib/actions/student/crud'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { getParentRelationLabel } from './utils'
import type { ReservationDetail } from './reservation-detail-dialog'

interface ReservationEditFormProps {
  reservation: ReservationDetail
  onSave: () => void
  onCancel: () => void
}

export function ReservationEditForm({ reservation, onSave, onCancel }: ReservationEditFormProps) {
  // 원본 값 저장 (변경 감지용)
  const original = {
    studentId: reservation.student.id,
    topic: reservation.topic,
  }

  // 폼 상태
  const scheduledDate = new Date(reservation.scheduledAt)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(scheduledDate)
  const [selectedTime, setSelectedTime] = useState<string | undefined>(
    `${String(scheduledDate.getHours()).padStart(2, '0')}:${String(scheduledDate.getMinutes()).padStart(2, '0')}`
  )
  const [selectedStudentId, setSelectedStudentId] = useState(reservation.student.id)
  const [selectedParentId, setSelectedParentId] = useState(reservation.parent.id)
  const [topic, setTopic] = useState(reservation.topic)
  const [isSaving, setIsSaving] = useState(false)
  const [showAiWarning, setShowAiWarning] = useState(false)

  // 데이터 상태
  const [students, setStudents] = useState<StudentWithParents[]>([])
  const [reservedSlots, setReservedSlots] = useState<string[]>([])
  const [isLoadingStudents, setIsLoadingStudents] = useState(true)

  // 학생 목록 로드
  useEffect(() => {
    const fetch = async () => {
      setIsLoadingStudents(true)
      const result = await getStudentsAction()
      if (result.success) setStudents(result.data.data)
      setIsLoadingStudents(false)
    }
    fetch()
  }, [])

  // 날짜별 예약 슬롯 로드 (자기 자신 제외)
  useEffect(() => {
    const fetch = async () => {
      if (!selectedDate) { setReservedSlots([]); return }

      const dayStart = new Date(selectedDate)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(selectedDate)
      dayEnd.setHours(23, 59, 59, 999)

      const result = await getReservationsAction({
        dateFrom: dayStart.toISOString(),
        dateTo: dayEnd.toISOString(),
      })

      if (result.success && result.data) {
        const slots = result.data
          .filter((r) => r.status !== 'CANCELLED' && r.status !== 'NO_SHOW' && r.id !== reservation.id)
          .map((r) => {
            const d = new Date(r.scheduledAt)
            return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
          })
        setReservedSlots(slots)
      }
    }
    fetch()
  }, [selectedDate, reservation.id])

  // 학생 변경 시 학부모 초기화
  const selectedStudent = students.find((s) => s.id === selectedStudentId)
  const parents = selectedStudent?.parents || []

  const handleStudentChange = useCallback((studentId: string) => {
    setSelectedStudentId(studentId)
    setSelectedParentId('')
  }, [])

  // AI 무효화 필요 여부
  const hasAiReport = !!reservation.counselingSession?.aiSummary
  const hasStudentChanged = selectedStudentId !== original.studentId
  const hasTopicChanged = topic.trim() !== original.topic.trim()
  const needsAiInvalidation = hasAiReport && (hasStudentChanged || hasTopicChanged)

  // 저장 처리
  const handleSave = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error('날짜와 시간을 선택해주세요.')
      return
    }
    if (!selectedStudentId) { toast.error('학생을 선택해주세요.'); return }
    if (!selectedParentId) { toast.error('학부모를 선택해주세요.'); return }
    if (!topic.trim() || topic.trim().length < 2) {
      toast.error('상담 주제를 2자 이상 입력해주세요.')
      return
    }

    // AI 무효화 경고
    if (needsAiInvalidation) {
      setShowAiWarning(true)
      return
    }

    await doSave()
  }

  const doSave = async () => {
    setIsSaving(true)
    try {
      const [hours, minutes] = selectedTime!.split(':').map(Number)
      const scheduledAt = new Date(selectedDate!)
      scheduledAt.setHours(hours, minutes, 0, 0)

      const result = await updateReservationAction({
        reservationId: reservation.id,
        scheduledAt: scheduledAt.toISOString(),
        studentId: selectedStudentId,
        parentId: selectedParentId,
        topic: topic.trim(),
      })

      if (result.success) {
        // AI 무효화 처리
        if (needsAiInvalidation) {
          await invalidateAiSummaryAction(reservation.id)
        }
        toast.success('예약이 수정되었습니다.')
        onSave()
      } else {
        toast.error(result.error || '예약 수정에 실패했습니다.')
      }
    } catch {
      toast.error('오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
      setShowAiWarning(false)
    }
  }

  // 과거 날짜 비활성화
  const disabledDate = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  if (isLoadingStudents) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">데이터 로딩 중...</span>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-5">
        {/* 날짜 선택 */}
        <div className="space-y-2">
          <Label>날짜 *</Label>
          <ReservationCalendar
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={disabledDate}
          />
        </div>

        {/* 시간 선택 */}
        {selectedDate && (
          <div className="space-y-2">
            <Label>시간 *</Label>
            <TimeSlotGrid
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              onSelectTime={setSelectedTime}
              reservedSlots={reservedSlots}
            />
          </div>
        )}

        {/* 학생 선택 */}
        <div className="space-y-2">
          <Label>학생 *</Label>
          <Select value={selectedStudentId} onValueChange={handleStudentChange}>
            <SelectTrigger>
              <SelectValue placeholder="학생을 선택하세요" />
            </SelectTrigger>
            <SelectContent>
              {students.map((student) => (
                <SelectItem key={student.id} value={student.id}>
                  {student.name}
                  {student.school && ` (${student.school}${student.grade ? ` ${student.grade}학년` : ''})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 학부모 선택 */}
        {selectedStudent && parents.length > 0 && (
          <div className="space-y-2">
            <Label>학부모 *</Label>
            <Select value={selectedParentId} onValueChange={setSelectedParentId}>
              <SelectTrigger>
                <SelectValue placeholder="학부모를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {parents.map((parent) => (
                  <SelectItem key={parent.id} value={parent.id}>
                    {parent.name} ({getParentRelationLabel(parent.relation)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* 상담 주제 */}
        <div className="space-y-2">
          <Label>상담 주제 *</Label>
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="상담 주제를 입력해주세요 (2-200자)"
            maxLength={200}
          />
          <p className="text-xs text-muted-foreground">{topic.length} / 200자</p>
        </div>

        {/* AI 무효화 알림 (인라인) */}
        {needsAiInvalidation && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            학생 또는 주제가 변경되어 저장 시 기존 AI 보고서가 삭제됩니다.
          </div>
        )}

        {/* 버튼 */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onCancel} disabled={isSaving} className="flex-1">
            취소
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="flex-1">
            {isSaving ? '저장 중...' : '저장하기'}
          </Button>
        </div>
      </div>

      {/* AI 무효화 경고 다이얼로그 */}
      <AlertDialog open={showAiWarning} onOpenChange={setShowAiWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>AI 보고서 삭제 확인</AlertDialogTitle>
            <AlertDialogDescription>
              학생 또는 주제가 변경되어 기존 AI 보고서(분석/시나리오/학부모 요약)가 삭제됩니다.
              계속하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={doSave}
              disabled={isSaving}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isSaving ? '저장 중...' : '확인 및 저장'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
```

**Step 2: TypeScript 컴파일 확인**

Run: `pnpm tsc --noEmit --pretty 2>&1 | head -20`
Expected: `SessionRecordForm` 모듈 미발견 에러 — Task 6에서 해결

**Step 3: 커밋**

```bash
git add src/components/counseling/reservation-edit-form.tsx
git commit -m "feat: ReservationEditForm 편집 모드 폼 컴포넌트 추가"
```

---

## Task 6: SessionRecordForm 컴포넌트 생성

**Files:**
- Create: `src/components/counseling/session-record-form.tsx`

**Step 1: 기록 폼 구현**

핵심 기능:
- 상담 유형(Select), 시간(Number), 내용(Textarea) 입력
- 후속 조치 필요(Checkbox) + 후속 날짜(Date)
- 만족도(Select 1-5)
- 기존 AI 보고서가 있으면 aiSummary에 사전 로드
- 저장 시 `completeWithRecordAction` 호출

```typescript
// src/components/counseling/session-record-form.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { completeWithRecordAction } from '@/lib/actions/counseling/reservation-complete'
import { toast } from 'sonner'
import { getTypeLabel } from './utils'
import type { ReservationDetail } from './reservation-detail-dialog'

interface SessionRecordFormProps {
  reservation: ReservationDetail
  onSave: () => void
  onCancel: () => void
}

const COUNSELING_TYPES = ['ACADEMIC', 'CAREER', 'PSYCHOLOGICAL', 'BEHAVIORAL'] as const

export function SessionRecordForm({ reservation, onSave, onCancel }: SessionRecordFormProps) {
  const [type, setType] = useState<string>('ACADEMIC')
  const [duration, setDuration] = useState(30)
  const [summary, setSummary] = useState('')
  const [followUpRequired, setFollowUpRequired] = useState(false)
  const [followUpDate, setFollowUpDate] = useState('')
  const [satisfactionScore, setSatisfactionScore] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)

  // 기존 AI 보고서 유지
  const existingAiSummary = reservation.counselingSession?.aiSummary || undefined

  const handleSubmit = async () => {
    if (!summary.trim() || summary.trim().length < 10) {
      toast.error('상담 내용을 10자 이상 입력해주세요.')
      return
    }
    if (followUpRequired && !followUpDate) {
      toast.error('후속 조치 날짜를 선택해주세요.')
      return
    }

    setIsSaving(true)
    try {
      const result = await completeWithRecordAction({
        reservationId: reservation.id,
        type: type as typeof COUNSELING_TYPES[number],
        duration,
        summary: summary.trim(),
        aiSummary: existingAiSummary,
        followUpRequired,
        ...(followUpDate && { followUpDate }),
        ...(satisfactionScore && { satisfactionScore: Number(satisfactionScore) }),
      })

      if (result.success) {
        toast.success('상담이 완료되었습니다.')
        onSave()
      } else {
        toast.error(result.error || '상담 완료 처리에 실패했습니다.')
      }
    } catch {
      toast.error('오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  // 내일 날짜 (후속 조치 최소값)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minFollowUpDate = tomorrow.toISOString().split('T')[0]

  return (
    <div className="space-y-5">
      {/* 예약 정보 요약 */}
      <div className="rounded-lg border bg-muted/50 p-3 text-sm space-y-1">
        <p><span className="font-medium">학생:</span> {reservation.student.name}</p>
        <p><span className="font-medium">주제:</span> {reservation.topic}</p>
      </div>

      {/* 상담 유형 */}
      <div className="space-y-2">
        <Label>상담 유형 *</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COUNSELING_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{getTypeLabel(t)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 상담 시간 */}
      <div className="space-y-2">
        <Label>상담 시간 (분) *</Label>
        <Input
          type="number"
          min={5}
          max={180}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
        />
      </div>

      {/* 상담 내용 */}
      <div className="space-y-2">
        <Label>상담 내용 *</Label>
        <Textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="상담 내용을 기록해주세요 (10-1000자)"
          rows={6}
          maxLength={1000}
        />
        <p className="text-xs text-muted-foreground">{summary.length} / 1000자</p>
      </div>

      {/* 후속 조치 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="followUp"
            checked={followUpRequired}
            onCheckedChange={(checked) => {
              setFollowUpRequired(checked === true)
              if (!checked) setFollowUpDate('')
            }}
          />
          <Label htmlFor="followUp" className="cursor-pointer">후속 조치 필요</Label>
        </div>
        {followUpRequired && (
          <div className="space-y-2 pl-6">
            <Label>후속 조치 예정일 *</Label>
            <Input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              min={minFollowUpDate}
            />
          </div>
        )}
      </div>

      {/* 만족도 */}
      <div className="space-y-2">
        <Label>만족도</Label>
        <Select value={satisfactionScore} onValueChange={setSatisfactionScore}>
          <SelectTrigger>
            <SelectValue placeholder="선택 (선택사항)" />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5].map((score) => (
              <SelectItem key={score} value={String(score)}>
                {'★'.repeat(score)}{'☆'.repeat(5 - score)} ({score}점)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 버튼 */}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={isSaving} className="flex-1">
          취소
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSaving}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
        >
          {isSaving ? '처리 중...' : '상담 완료 및 저장'}
        </Button>
      </div>
    </div>
  )
}
```

**Step 2: TypeScript 컴파일 확인**

Run: `pnpm tsc --noEmit --pretty 2>&1 | head -20`
Expected: 에러 없음 (모든 모듈 존재)

**Step 3: 커밋**

```bash
git add src/components/counseling/session-record-form.tsx
git commit -m "feat: SessionRecordForm 상담 기록 모드 폼 컴포넌트 추가"
```

---

## Task 7: ReservationCard 수정 — 수정/완료 버튼 동작 변경

**Files:**
- Modify: `src/components/counseling/reservation-card.tsx`

**Step 1: 카드 버튼 변경**

핵심 변경:
- "수정" 버튼 추가 (`onEditClick` 콜백)
- "완료" 버튼 동작 변경 (`onRecordClick` 콜백 — AlertDialog 대신 상세 다이얼로그 기록 모드)
- 기존 `completeReservationAction` import 및 "complete" case 제거
- "취소/노쇼"는 기존 AlertDialog 유지

`reservation-card.tsx`의 interface, import, component 본문을 아래와 같이 변경:

**Props에 콜백 추가:**
```typescript
interface ReservationCardProps {
  reservation: ReservationWithRelations
  onDetailClick?: (id: string) => void
  onEditClick?: (id: string) => void
  onRecordClick?: (id: string) => void
}
```

**완료 버튼의 openDialog("complete") 제거, 대신 onRecordClick 호출:**

카드 버튼 영역을:
```
[수정] [완료] [취소] [노쇼]
```
로 변경.

- "수정" → `onEditClick?.(reservation.id)`
- "완료" → `onRecordClick?.(reservation.id)`
- "취소" → `openDialog("cancel")` (기존 유지)
- "노쇼" → `openDialog("noShow")` (기존 유지)

`handleStatusChange`에서 `case "complete"` 제거.

전체 교체 코드:

```typescript
// src/components/counseling/reservation-card.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import type { ReservationStatus } from '@/lib/db'
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  cancelReservationAction,
  markNoShowAction,
} from "@/lib/actions/counseling/reservations-status"
import { toast } from "sonner"
import { getParentRelationLabel } from "./utils"

export type { ReservationWithRelations } from "@/types/counseling"
import type { ReservationWithRelations } from "@/types/counseling"

interface ReservationCardProps {
  reservation: ReservationWithRelations
  onDetailClick?: (id: string) => void
  onEditClick?: (id: string) => void
  onRecordClick?: (id: string) => void
}

export function ReservationCard({
  reservation,
  onDetailClick,
  onEditClick,
  onRecordClick,
}: ReservationCardProps) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogType, setDialogType] = useState<"cancel" | "noShow" | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const statusLabel = getStatusLabel(reservation.status)
  const statusVariant = getStatusVariant(reservation.status)

  // 상태 변경 핸들러 (취소/노쇼만)
  const handleStatusChange = async (type: "cancel" | "noShow") => {
    setIsProcessing(true)
    try {
      const result = type === "cancel"
        ? await cancelReservationAction(reservation.id)
        : await markNoShowAction(reservation.id)

      if (result.success) {
        toast.success(type === "cancel" ? "예약이 취소되었습니다." : "노쇼로 처리되었습니다.")
        router.refresh()
      } else {
        toast.error(result.error || "상태 변경에 실패했습니다.")
      }
    } catch (error) {
      console.error("Status change error:", error)
      toast.error("상태 변경 중 오류가 발생했습니다.")
    } finally {
      setIsProcessing(false)
      setDialogOpen(false)
      setDialogType(null)
    }
  }

  const openDialog = (type: "cancel" | "noShow") => {
    setDialogType(type)
    setDialogOpen(true)
  }

  const handleConfirm = () => {
    if (dialogType) handleStatusChange(dialogType)
  }

  const dialogContent = getDialogContent(dialogType, reservation.student.name)

  return (
    <>
      <Card
        className="hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => onDetailClick?.(reservation.id)}
      >
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-600">
              {format(new Date(reservation.scheduledAt), "M월 d일 E요일 HH:mm", { locale: ko })}
            </span>
            <Badge variant={statusVariant}>{statusLabel}</Badge>
          </div>

          {/* Body */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">{reservation.student.name}</span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-600">{getParentRelationLabel(reservation.parent.relation)}</span>
            </div>
            <div className="text-sm text-gray-700">{reservation.topic}</div>
          </div>

          {/* Footer: 버튼 (SCHEDULED only) */}
          {reservation.status === "SCHEDULED" && (
            <div className="flex gap-2 mt-3 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onEditClick?.(reservation.id)}
                disabled={isProcessing}
                className="flex-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
              >
                수정
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onRecordClick?.(reservation.id)}
                disabled={isProcessing}
                className="flex-1 bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
              >
                완료
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => openDialog("cancel")}
                disabled={isProcessing}
                className="flex-1 bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200"
              >
                취소
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => openDialog("noShow")}
                disabled={isProcessing}
                className="flex-1 bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200"
              >
                노쇼
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AlertDialog (취소/노쇼만) */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogContent.title}</AlertDialogTitle>
            <AlertDialogDescription>{dialogContent.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={isProcessing}
              className={dialogContent.buttonClass}
            >
              {isProcessing ? "처리 중..." : dialogContent.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// Helper functions

function getStatusLabel(status: ReservationStatus): string {
  const labels: Record<ReservationStatus, string> = {
    SCHEDULED: "예약",
    COMPLETED: "완료",
    CANCELLED: "취소",
    NO_SHOW: "노쇼",
  }
  return labels[status]
}

function getStatusVariant(status: ReservationStatus): "scheduled" | "completed" | "cancelled" | "noShow" {
  const variants: Record<ReservationStatus, "scheduled" | "completed" | "cancelled" | "noShow"> = {
    SCHEDULED: "scheduled",
    COMPLETED: "completed",
    CANCELLED: "cancelled",
    NO_SHOW: "noShow",
  }
  return variants[status]
}

function getDialogContent(type: "cancel" | "noShow" | null, studentName: string) {
  switch (type) {
    case "cancel":
      return {
        title: "예약 취소 확인",
        description: `${studentName} 학부모 상담 예약을 취소하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
        confirmLabel: "취소",
        buttonClass: "bg-gray-600 hover:bg-gray-700 text-white",
      }
    case "noShow":
      return {
        title: "노쇼 처리 확인",
        description: `${studentName} 학부모가 예약된 상담에 나타나지 않았음을 처리하시겠습니까?`,
        confirmLabel: "노쇼",
        buttonClass: "bg-orange-600 hover:bg-orange-700 text-white",
      }
    default:
      return { title: "", description: "", confirmLabel: "", buttonClass: "" }
  }
}

export default ReservationCard
```

**Step 2: TypeScript 컴파일 확인**

Run: `pnpm tsc --noEmit --pretty 2>&1 | head -20`
Expected: 에러 없음

**Step 3: 커밋**

```bash
git add src/components/counseling/reservation-card.tsx
git commit -m "feat: ReservationCard에 수정/완료 버튼 추가 및 동작 변경"
```

---

## Task 8: ReservationList 수정 — 모드별 다이얼로그 진입 연결

**Files:**
- Modify: `src/components/counseling/reservation-list.tsx`

**Step 1: 모드 상태 추가 및 카드 콜백 연결**

핵심 변경:
- `dialogMode` 상태 추가
- `onEditClick` → reservationId 설정 + mode='edit'
- `onRecordClick` → reservationId 설정 + mode='record'
- `onDetailClick` → reservationId 설정 + mode='read' (기존)
- `ReservationDetailDialog`에 `initialMode` prop 전달

```typescript
// src/components/counseling/reservation-list.tsx
"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ReservationCard, type ReservationWithRelations } from "./reservation-card"
import { ReservationDetailDialog } from "./reservation-detail-dialog"
import type { ReservationStatus } from '@/lib/db'

type DialogMode = 'read' | 'edit' | 'record'

interface ReservationListProps {
  reservations: ReservationWithRelations[]
  onRefresh?: () => void
  dateFilter?: Date
}

export function ReservationList({ reservations, onRefresh, dateFilter }: ReservationListProps) {
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | "ALL">("ALL")
  const [searchQuery, setSearchQuery] = useState("")
  const [internalDateFilter, setInternalDateFilter] = useState<Date | undefined>(undefined)
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null)
  const [dialogMode, setDialogMode] = useState<DialogMode>('read')

  useEffect(() => {
    setInternalDateFilter(dateFilter)
  }, [dateFilter])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const filteredReservations = useMemo(() => {
    return reservations
      .filter((reservation) => {
        if (statusFilter !== "ALL" && reservation.status !== statusFilter) return false
        if (debouncedSearch.trim()) {
          if (!reservation.student.name.toLowerCase().includes(debouncedSearch.toLowerCase())) return false
        }
        if (internalDateFilter) {
          const rd = new Date(reservation.scheduledAt)
          const fs = new Date(internalDateFilter); fs.setHours(0, 0, 0, 0)
          const fe = new Date(internalDateFilter); fe.setHours(23, 59, 59, 999)
          if (rd < fs || rd > fe) return false
        }
        return true
      })
      .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
  }, [reservations, statusFilter, debouncedSearch, internalDateFilter])

  const handleResetFilters = useCallback(() => {
    setStatusFilter("ALL")
    setSearchQuery("")
    setInternalDateFilter(undefined)
  }, [])

  const isFiltering = statusFilter !== "ALL" || debouncedSearch.trim() || internalDateFilter

  // 다이얼로그 열기 (모드 지정)
  const openDialog = useCallback((id: string, mode: DialogMode) => {
    setSelectedReservationId(id)
    setDialogMode(mode)
  }, [])

  const closeDialog = useCallback(() => {
    setSelectedReservationId(null)
    setDialogMode('read')
  }, [])

  if (filteredReservations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        {isFiltering ? (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 mb-4">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            <p className="text-gray-600 text-center">검색 결과가 없습니다.</p>
            <Button variant="outline" size="sm" onClick={handleResetFilters} className="mt-4">필터 초기화</Button>
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 mb-4">
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
              <line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" />
              <line x1="3" x2="21" y1="10" y2="10" />
            </svg>
            <p className="text-gray-600 text-center mb-4">예약된 상담이 없습니다.<br />새 예약을 등록해주세요.</p>
            {onRefresh && <Button variant="outline" size="sm" onClick={onRefresh}>새 예약 등록</Button>}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 필터 UI */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ReservationStatus | "ALL")}>
          <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder="상태 필터" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">전체</SelectItem>
            <SelectItem value="SCHEDULED">예약</SelectItem>
            <SelectItem value="COMPLETED">완료</SelectItem>
            <SelectItem value="CANCELLED">취소</SelectItem>
            <SelectItem value="NO_SHOW">노쇼</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1 w-full">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <Input type="text" placeholder="학생 이름 검색..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>

        {isFiltering && <Button variant="ghost" size="sm" onClick={handleResetFilters}>필터 초기화</Button>}
      </div>

      <p className="text-sm text-gray-600">총 {filteredReservations.length}건의 예약</p>

      {/* 예약 목록 */}
      <div className="space-y-3">
        {filteredReservations.map((reservation) => (
          <ReservationCard
            key={reservation.id}
            reservation={reservation}
            onDetailClick={(id) => openDialog(id, 'read')}
            onEditClick={(id) => openDialog(id, 'edit')}
            onRecordClick={(id) => openDialog(id, 'record')}
          />
        ))}
      </div>

      {/* 상세 다이얼로그 (3모드) */}
      <ReservationDetailDialog
        reservationId={selectedReservationId}
        initialMode={dialogMode}
        onClose={closeDialog}
      />
    </div>
  )
}

export default ReservationList
```

**Step 2: TypeScript 컴파일 확인**

Run: `pnpm tsc --noEmit --pretty 2>&1 | head -20`
Expected: 에러 없음

**Step 3: 커밋**

```bash
git add src/components/counseling/reservation-list.tsx
git commit -m "feat: ReservationList 모드별 다이얼로그 진입 연결"
```

---

## Task 9: 빌드 확인 & 통합 테스트

**Files:**
- 전체 프로젝트

**Step 1: TypeScript 전체 컴파일 확인**

Run: `pnpm tsc --noEmit --pretty`
Expected: 에러 없음

**Step 2: Zod 스키마 테스트 실행**

Run: `pnpm vitest run src/lib/validations/__tests__/reservations.test.ts`
Expected: 모든 테스트 통과

**Step 3: 전체 빌드 확인**

Run: `pnpm build 2>&1 | tail -20`
Expected: 빌드 성공

**Step 4: 최종 커밋**

```bash
git add -A
git commit -m "feat: 상담 예약 수정 & 기록 통합 기능 완성

- ReservationDetailDialog 3모드 확장 (읽기/편집/기록)
- ReservationEditForm: 예약 정보 수정 (전체 필드)
- SessionRecordForm: 상담 완료 시 즉시 기록
- completeWithRecordAction: 상담 완료+기록 Server Action
- invalidateAiSummaryAction: AI 보고서 무효화
- ReservationCard: 수정/완료 버튼 추가
- AI 보고서 학생/주제 변경 시 자동 무효화"
```
